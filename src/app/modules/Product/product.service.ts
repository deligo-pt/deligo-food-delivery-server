/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import AppError from '../../errors/AppError';
import { TProduct } from './product.interface';
import { Product } from './product.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { ProductSearchableFields } from './product.constant';
import { BusinessCategory, ProductCategory } from '../Category/category.model';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import {
  cleanForSKU,
  generateSlug,
  localizeProductData,
} from './product.utils';
import { Tax } from '../Tax/tax.model';
import { BusinessCategoryName } from '../Category/category.interface';
import { CreateProductUtils } from './createProduct.utils';
import customNanoId from '../../utils/customNanoId';
import { TLocalizedText } from '../../constant/GlobalInterface/language.interface';
import { UpdateProductUtils } from './updateProduct.utils';
import { Order } from '../Order/order.model';

// Create Product Service
const createProduct = async (payload: TProduct, currentUser: TCurrentUser) => {
  CreateProductUtils.validateVendor(currentUser);
  CreateProductUtils.validateBasePayload(payload);

  const [vendorCategoryExist, category] = await Promise.all([
    BusinessCategory.findOne({
      name: currentUser?.businessDetails?.businessType,
    }),
    ProductCategory.findById(payload.category),
  ]);

  CreateProductUtils.validateRestaurantStock(vendorCategoryExist, payload);
  CreateProductUtils.validateCategory(
    vendorCategoryExist,
    category,
    currentUser.role,
  );

  if (payload.addonGroups) {
    await CreateProductUtils.validateAddons(payload, currentUser._id);
  }
  await CreateProductUtils.applyTax(payload);

  const { productNamePart } = CreateProductUtils.prepareBasicFields(
    payload,
    currentUser,
    category,
  );

  CreateProductUtils.handleVariations(
    payload,
    productNamePart,
    vendorCategoryExist,
  );
  CreateProductUtils.handleSimpleStock(payload, vendorCategoryExist);

  const newProduct = await Product.create(payload);

  return newProduct;
};

// Update Product Service
const updateProduct = async (
  productId: string,
  payload: Partial<TProduct>,
  currentUser: TCurrentUser,
) => {
  const { images } = payload;
  const existingProduct = await UpdateProductUtils.getAndValidateProduct(
    productId,
    currentUser,
  );

  const modifiedData = await UpdateProductUtils.prepareUpdateData(
    payload,
    existingProduct,
  );

  const updateQuery: any = { $set: modifiedData };
  if (images && images?.length > 0) {
    updateQuery.$push = { images: { $each: images } };
  }

  const updatedProduct = await Product.findOneAndUpdate(
    { productId },
    updateQuery,
    { new: true, runValidators: true },
  );

  await UpdateProductUtils.syncStockStatus(updatedProduct, existingProduct);

  return updatedProduct;
};

// manage product variations service
const manageProductVariations = async (
  productId: string,
  payload: { name: TLocalizedText; options: any[] },
  currentUser: TCurrentUser,
) => {
  const existingProduct = await Product.findOne({
    productId,
    ...((currentUser.role === 'VENDOR' ||
      currentUser.role === 'SUB_VENDOR') && { vendorId: currentUser._id }),
  }).populate('vendorId', 'businessDetails.businessType');

  if (!existingProduct)
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');

  if (currentUser?.status !== 'APPROVED')
    throw new AppError(httpStatus.FORBIDDEN, 'Your account is not approved.');

  const vendor = existingProduct.vendorId as any;
  const isRestaurant =
    vendor?.businessDetails?.businessType === BusinessCategoryName.RESTAURANT;

  const { name, options } = payload;

  const normalizedEnName = name.en?.trim();
  const normalizedPtName = name.pt?.trim();

  if (!normalizedEnName || !normalizedPtName) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Both English and Portuguese variation names are required',
    );
  }
  const productNamePart = cleanForSKU(
    existingProduct.name?.en || existingProduct.name?.pt || '',
  );

  if (!existingProduct.variations) {
    existingProduct.variations = [];
  }

  const variationIndex = existingProduct.variations.findIndex(
    (v) => v.name?.en?.toLowerCase() === normalizedEnName.toLowerCase(),
  );

  const finalOptionsToPush: any[] = [];

  for (const opt of options) {
    const normalizedEnLabel = opt.label?.en?.trim();
    const normalizedPtLabel = opt.label?.pt?.trim();

    if (!normalizedEnLabel || !normalizedPtLabel) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Variation options must have both English and Portuguese labels',
      );
    }

    if (variationIndex > -1) {
      const isOptionExists = existingProduct.variations[
        variationIndex
      ].options.some(
        (o: any) =>
          o.label?.en?.toLowerCase() === normalizedEnLabel.toLowerCase(),
      );
      if (isOptionExists) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Option '${normalizedEnLabel}' already exists.`,
        );
      }
    }

    const generatedSku =
      opt.sku ||
      `VAR-${productNamePart}-${cleanForSKU(normalizedEnLabel)}-${customNanoId(3)}`;

    const isSkuTaken = await Product.findOne({
      productId: { $ne: productId },
      'variations.options.sku': generatedSku,
    });
    if (isSkuTaken) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `SKU ${generatedSku} is already in use.`,
      );
    }

    if (isRestaurant && opt.stockQuantity) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Variation stock quantity is not allowed for Restaurants',
      );
    }

    const newOption: any = {
      label: {
        en: normalizedEnLabel,
        pt: normalizedPtLabel,
      },
      price: opt.price,
      sku: generatedSku,
    };

    if (!isRestaurant) {
      const inputStockQty = opt.stockQuantity ?? 0;
      newOption.stockQuantity = inputStockQty;
      newOption.totalAddedQuantity = inputStockQty;
      newOption.isOutOfStock = inputStockQty <= 0;
    }

    finalOptionsToPush.push(newOption);
  }

  if (variationIndex > -1) {
    existingProduct.variations[variationIndex].options.push(
      ...finalOptionsToPush,
    );
  } else {
    existingProduct.variations.push({
      name: {
        en: normalizedEnName,
        pt: normalizedPtName,
      },
      options: finalOptionsToPush,
    });
  }

  let totalQty = 0;
  let totalAddedAcrossVariations = 0;
  let minPrice = Infinity;

  existingProduct.variations.forEach((v) => {
    v.options.forEach((o: any) => {
      if (o.price < minPrice) minPrice = o.price;

      if (!isRestaurant) {
        totalQty += o.stockQuantity || 0;
        totalAddedAcrossVariations += o.totalAddedQuantity || 0;
      }
    });
  });

  if (!isRestaurant) {
    if (!existingProduct.stock) {
      existingProduct.stock = { quantity: 0, hasVariations: true } as any;
    }
    existingProduct.stock!.quantity = totalQty;
    existingProduct.stock!.totalAddedQuantity = totalAddedAcrossVariations;
    existingProduct.stock!.hasVariations = true;
    existingProduct.stock!.availabilityStatus =
      totalQty > 0 ? (totalQty < 5 ? 'Limited' : 'In Stock') : 'Out of Stock';
  } else {
    existingProduct.stock = undefined;
  }

  if (minPrice !== Infinity) {
    existingProduct.pricing.price = minPrice;
  }

  await existingProduct.save();
  return existingProduct;
};

const renameProductVariation = async (
  productId: string,
  payload: {
    oldName: string;
    newName?: Partial<TLocalizedText>;
    oldLabel?: string;
    newLabel?: Partial<TLocalizedText>;
  },
  currentUser: TCurrentUser,
) => {
  const existingProduct = await Product.findOne({
    productId,
    ...((currentUser.role === 'VENDOR' ||
      currentUser.role === 'SUB_VENDOR') && {
      vendorId: currentUser._id,
    }),
  });

  if (!existingProduct)
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');

  if (!existingProduct.variations) {
    existingProduct.variations = [];
  }

  const { oldName, newName, oldLabel, newLabel } = payload;

  const variationIndex = existingProduct.variations.findIndex(
    (v) => v.name?.en?.toLowerCase() === oldName.trim().toLowerCase(),
  );

  if (variationIndex === -1)
    throw new AppError(
      httpStatus.NOT_FOUND,
      `Variation group '${oldName}' not found`,
    );

  if (newName && !oldLabel) {
    const normalizedNewEn = newName.en?.trim();
    const normalizedNewPt = newName.pt?.trim();

    if (!normalizedNewEn && !normalizedNewPt) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'At least one language translation (English or Portuguese) must be provided',
      );
    }

    if (normalizedNewEn) {
      if (normalizedNewEn.toLowerCase() !== oldName.trim().toLowerCase()) {
        const hasEnDuplicate = existingProduct.variations.some(
          (v, idx) =>
            idx !== variationIndex &&
            v.name?.en?.toLowerCase() === normalizedNewEn.toLowerCase(),
        );
        if (hasEnDuplicate) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `Another variation group named '${normalizedNewEn}' (English) already exists.`,
          );
        }
      }
      existingProduct.variations[variationIndex].name.en = normalizedNewEn;
    }

    if (normalizedNewPt) {
      const currentPtName = existingProduct.variations[variationIndex].name.pt;
      if (
        !currentPtName ||
        normalizedNewPt.toLowerCase() !== currentPtName.toLowerCase()
      ) {
        const hasPtDuplicate = existingProduct.variations.some(
          (v, idx) =>
            idx !== variationIndex &&
            v.name?.pt?.toLowerCase() === normalizedNewPt.toLowerCase(),
        );
        if (hasPtDuplicate) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `Another variation group named '${normalizedNewPt}' (Portuguese) already exists.`,
          );
        }
      }
      existingProduct.variations[variationIndex].name.pt = normalizedNewPt;
    }
  }

  if (oldLabel && newLabel) {
    const normalizedNewEnLabel = newLabel.en?.trim();
    const normalizedNewPtLabel = newLabel.pt?.trim();

    if (!normalizedNewEnLabel && !normalizedNewPtLabel) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'At least one option label translation (English or Portuguese) must be provided',
      );
    }
    const optionIndex = existingProduct.variations[
      variationIndex
    ].options.findIndex(
      (o: any) => o.label?.en?.toLowerCase() === oldLabel.trim().toLowerCase(),
    );

    if (optionIndex === -1)
      throw new AppError(
        httpStatus.NOT_FOUND,
        `Option '${oldLabel}' not found in variation group '${oldName}'`,
      );

    if (normalizedNewEnLabel) {
      if (
        normalizedNewEnLabel.toLowerCase() !== oldLabel.trim().toLowerCase()
      ) {
        const hasEnLabelDuplicate = existingProduct.variations[
          variationIndex
        ].options.some(
          (o: any, idx: number) =>
            idx !== optionIndex &&
            o.label?.en?.toLowerCase() === normalizedNewEnLabel.toLowerCase(),
        );
        if (hasEnLabelDuplicate) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `An option with label '${normalizedNewEnLabel}' (English) already exists in this group.`,
          );
        }
      }
      existingProduct.variations[variationIndex].options[optionIndex].label.en =
        normalizedNewEnLabel;
    }

    if (normalizedNewPtLabel) {
      const currentPtLabel =
        existingProduct.variations[variationIndex].options[optionIndex].label
          .pt;
      if (
        !currentPtLabel ||
        normalizedNewPtLabel.toLowerCase() !== currentPtLabel.toLowerCase()
      ) {
        const hasPtLabelDuplicate = existingProduct.variations[
          variationIndex
        ].options.some(
          (o: any, idx: number) =>
            idx !== optionIndex &&
            o.label?.pt?.toLowerCase() === normalizedNewPtLabel.toLowerCase(),
        );
        if (hasPtLabelDuplicate) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `An option with label '${normalizedNewPtLabel}' (Portuguese) already exists in this group.`,
          );
        }
      }
      existingProduct.variations[variationIndex].options[optionIndex].label.pt =
        normalizedNewPtLabel;
    }
  }

  await existingProduct.save();
  return existingProduct;
};

// remove product variations service
const removeProductVariations = async (
  productId: string,
  payload: {
    name: string;
    labelToRemove?: string;
  },
  currentUser: TCurrentUser,
) => {
  const existingProduct = await Product.findOne({
    productId,
    ...((currentUser.role === 'VENDOR' ||
      currentUser.role === 'SUB_VENDOR') && { vendorId: currentUser._id }),
  }).populate('vendorId', 'businessDetails.businessType');

  if (!existingProduct)
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');

  if (currentUser?.status !== 'APPROVED')
    throw new AppError(httpStatus.FORBIDDEN, 'Your account is not approved.');

  const vendor = existingProduct.vendorId as any;
  const isRestaurant =
    vendor?.businessDetails?.businessType === BusinessCategoryName.RESTAURANT;

  const { name, labelToRemove } = payload;
  const normalizedName = name.trim();

  if (!existingProduct.variations || existingProduct.variations.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No variations found to remove');
  }

  const variationIndex = existingProduct.variations.findIndex(
    (v) => v.name?.en?.toLowerCase() === normalizedName.toLowerCase(),
  );

  if (variationIndex === -1) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `Variation group '${normalizedName}' not found`,
    );
  }

  if (labelToRemove) {
    const optionIndex = existingProduct.variations[
      variationIndex
    ].options.findIndex(
      (o: any) =>
        o.label?.en?.toLowerCase() === labelToRemove.trim().toLowerCase(),
    );

    if (optionIndex === -1) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        `Option '${labelToRemove}' not found in '${normalizedName}'`,
      );
    }

    existingProduct.variations[variationIndex].options.splice(optionIndex, 1);

    if (existingProduct.variations[variationIndex].options.length === 0) {
      existingProduct.variations.splice(variationIndex, 1);
    }
  } else {
    existingProduct.variations.splice(variationIndex, 1);
  }

  let totalQty = 0;
  let totalAddedAcrossVariations = 0;
  let minPrice = Infinity;

  existingProduct.variations.forEach((v) => {
    if (v.options && Array.isArray(v.options)) {
      v.options.forEach((o: any) => {
        const optionPrice = typeof o.price === 'number' ? o.price : 0;
        const optionQty =
          typeof o.stockQuantity === 'number' ? o.stockQuantity : 0;
        const optionAddedQty =
          typeof o.totalAddedQuantity === 'number' ? o.totalAddedQuantity : 0;

        totalQty += optionQty;
        totalAddedAcrossVariations += optionAddedQty;

        if (optionPrice > 0 && optionPrice < minPrice) {
          minPrice = optionPrice;
        }
      });
    }
  });

  if (!isRestaurant && existingProduct.stock) {
    existingProduct.stock.quantity = totalQty;
    existingProduct.stock.totalAddedQuantity = totalAddedAcrossVariations;
    existingProduct.stock.hasVariations = existingProduct.variations.length > 0;
    existingProduct.stock.availabilityStatus =
      totalQty > 0 ? (totalQty < 5 ? 'Limited' : 'In Stock') : 'Out of Stock';
  } else if (isRestaurant) {
    existingProduct.stock = undefined;
  }

  if (minPrice !== Infinity) {
    existingProduct.pricing.price = minPrice;
  }

  await existingProduct.save();
  return existingProduct;
};

// update inventory and pricing service
const updateInventoryAndPricing = async (
  currentUser: TCurrentUser,
  productId: string,
  addedQuantity: number = 0,
  reduceQuantity: number = 0,
  newPrice?: number,
  variationSku?: string,
) => {
  const product = await Product.findOne({ productId }).populate(
    'vendorId',
    'businessDetails.businessType',
  );

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  const vendor = product.vendorId as any;
  const isRestaurant =
    vendor?.businessDetails?.businessType === BusinessCategoryName.RESTAURANT;

  if (currentUser.role === 'VENDOR' || currentUser.role === 'SUB_VENDOR') {
    if (
      currentUser._id.toString() !== (product.vendorId as any)._id.toString()
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not authorized to update this product',
      );
    }
  }

  const netQuantityChange = addedQuantity - reduceQuantity;

  const hasVariations = product.variations && product.variations.length > 0;

  if (variationSku && !hasVariations) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'This product does not have any variations. Cannot update using variationSku.',
    );
  }

  if (!variationSku && hasVariations) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Variation SKU is required for this product.',
    );
  }

  if (hasVariations && product.variations) {
    let variationFound = false;
    let minPrice = Infinity;

    product.variations.forEach((variation) => {
      variation.options.forEach((opt) => {
        if (opt.sku === variationSku) {
          variationFound = true;

          if (!isRestaurant) {
            if (
              reduceQuantity > 0 &&
              reduceQuantity > (opt.stockQuantity || 0)
            ) {
              throw new AppError(
                httpStatus.BAD_REQUEST,
                `Insufficient stock. Available: ${opt.stockQuantity}`,
              );
            }
            opt.stockQuantity = (opt.stockQuantity || 0) + netQuantityChange;

            opt.totalAddedQuantity =
              (opt.totalAddedQuantity || 0) + addedQuantity;

            opt.isOutOfStock = opt.stockQuantity <= 0;
          }

          if (newPrice !== undefined) opt.price = newPrice;
        }
        if (opt.price < minPrice) minPrice = opt.price;
      });
    });

    if (!variationFound)
      throw new AppError(httpStatus.NOT_FOUND, 'Variation SKU not found');

    if (!isRestaurant && product.stock) {
      let totalStock = 0;
      product.variations.forEach((v) =>
        v.options.forEach((opt) => (totalStock += opt.stockQuantity || 0)),
      );
      product.stock.quantity = totalStock;
      product.stock.totalAddedQuantity =
        (product.stock.totalAddedQuantity || 0) + addedQuantity;
    }

    if (newPrice !== undefined) product.pricing.price = minPrice;
  } else {
    if (!isRestaurant && product.stock) {
      if (reduceQuantity > 0 && reduceQuantity > product.stock.quantity) {
        throw new AppError(httpStatus.BAD_REQUEST, `Insufficient stock.`);
      }
      product.stock.quantity += netQuantityChange;
      product.stock.totalAddedQuantity =
        (product.stock.totalAddedQuantity || 0) + addedQuantity;
    }

    if (newPrice !== undefined) product.pricing.price = newPrice;
  }

  if (isRestaurant) {
    product.stock = undefined;
  } else if (product.stock) {
    const finalQty = product.stock.quantity;
    product.stock.availabilityStatus =
      finalQty > 0 ? (finalQty < 5 ? 'Limited' : 'In Stock') : 'Out of Stock';
  }

  await product.save();
  return product;
};

// Approved Product Service
const approvedProduct = async (
  productId: string,
  currentUser: TCurrentUser,
  payload: { isApproved: boolean; remarks?: string },
) => {
  const existingProduct = await Product.findOne({ productId });

  if (!existingProduct) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  const { isApproved, remarks } = payload;

  const currentStatus = existingProduct.isApproved ?? false;

  if (currentStatus === isApproved) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Product is already ${isApproved ? 'approved' : 'rejected'}`,
    );
  }

  if (!isApproved) {
    if (!remarks || remarks.trim() === '') {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Remarks are required when rejecting a product',
      );
    }
    existingProduct.remarks = remarks.trim();
  } else {
    existingProduct.remarks = undefined;
  }

  existingProduct.isApproved = isApproved;
  existingProduct.approvedBy = currentUser._id as any;

  await existingProduct.save();

  return {
    message: `Product has been ${isApproved ? 'approved' : 'rejected'} successfully`,
    data: {
      productId: existingProduct.productId,
      isApproved: existingProduct.isApproved,
      remarks: existingProduct.remarks,
      approvedBy: existingProduct.approvedBy,
    },
  };
};

// product image delete service
const deleteProductImages = async (
  productId: string,
  images: string[],
  currentUser: TCurrentUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to delete product images. Your account is ${currentUser.status}`,
    );
  }

  const product = await Product.findOne({ productId });
  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  if (
    (currentUser.role === 'VENDOR' || currentUser.role === 'SUB_VENDOR') &&
    product.vendorId.toString() !== currentUser._id.toString()
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You can only delete images of your own products',
    );
  }

  // -------------check if images to be deleted exist in product images-------------
  const invalidImages = images.filter((img) => !product.images.includes(img));
  if (invalidImages.length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'The following images do not belong to this product.',
    );
  }

  const remainingImagesCount = product.images.length - images.length;
  if (remainingImagesCount < 1) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'A product must have at least one image remaining. You cannot delete all images.',
    );
  }

  // delete image from cloudinary
  await Promise.all(images.map((img) => deleteSingleImageFromCloudinary(img)));

  // Remove images from product
  product.images = product.images.filter((img) => !images.includes(img));
  await product.save();

  return product;
};

// get all products service
const getAllProducts = async (
  query: Record<string, unknown>,
  currentUser: TCurrentUser,
  lang: 'en' | 'pt',
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view products. Your account is ${currentUser.status}`,
    );
  }
  const role = currentUser.role;

  if (role === 'VENDOR' || role === 'SUB_VENDOR') {
    query.vendorId = currentUser._id;
    query.isDeleted = false;
  }

  if (['CUSTOMER', 'FLEET_MANAGER', 'DELIVERY_PARTNER'].includes(role)) {
    query.isApproved = true;
    query.isDeleted = false;
    query['meta.status'] = 'ACTIVE';
  }

  const products = new QueryBuilder(Product.find(), query)
    .search(ProductSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const populateOptions = getPopulateOptions(role, {
    vendor:
      'userId  businessDetails.businessName businessDetails.businessType businessDetails.isStoreOpen businessDetails.openingHours businessDetails.closingHours businessDetails.closingDays businessLocation.latitude businessLocation.longitude documents.storePhoto rating',
    productCategory: 'name',
  });

  populateOptions.forEach((option) => {
    products.modelQuery = products.modelQuery.populate(option);
  });

  const meta = await products.countTotal();
  const rawData = await products.modelQuery;

  const localizedData = rawData.map((product: any) =>
    localizeProductData(product, role, lang),
  );
  return {
    meta,
    data: localizedData,
  };
};

// get all products service
const getAllProductsPublic = async (
  query: Record<string, unknown>,
  lang: 'en' | 'pt',
) => {
  const role = 'CUSTOMER';

  query.isApproved = true;
  query.isDeleted = false;

  const products = new QueryBuilder(Product.find(), query)
    .search(ProductSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const populateOptions = getPopulateOptions(role, {
    vendor:
      'userId  businessDetails.businessName businessDetails.businessType businessDetails.isStoreOpen businessDetails.openingHours businessDetails.closingHours businessDetails.closingDays businessLocation.latitude businessLocation.longitude documents.storePhoto rating',
    productCategory: 'name',
  });

  populateOptions.forEach((option) => {
    products.modelQuery = products.modelQuery.populate(option);
  });

  const meta = await products.countTotal();
  const rawData = await products.modelQuery;

  const localizedData = rawData.map((product: any) =>
    localizeProductData(product, 'CUSTOMER', lang),
  );
  return {
    meta,
    data: localizedData,
  };
};

// get single product service
const getSingleProduct = async (
  productId: string,
  currentUser: TCurrentUser,
  lang: 'en' | 'pt',
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view products. Your account is ${currentUser.status}`,
    );
  }

  const role = currentUser.role;
  let query;

  if (
    role === 'CUSTOMER' ||
    role === 'DELIVERY_PARTNER' ||
    role === 'FLEET_MANAGER'
  ) {
    query = Product.findOne({
      productId,
      isApproved: true,
      isDeleted: false,
    });
  } else if (role === 'VENDOR' || role === 'SUB_VENDOR') {
    query = Product.findOne({
      productId,
      vendorId: currentUser._id,
      isDeleted: false,
    });
  } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    query = Product.findOne({ productId });
  } else {
    throw new AppError(httpStatus.FORBIDDEN, 'Unauthorized role access');
  }

  const populateOptions = getPopulateOptions(role, {
    vendor:
      'userId  businessDetails.businessName businessDetails.businessType businessDetails.isStoreOpen businessDetails.openingHours businessDetails.closingHours businessDetails.closingDays businessLocation.latitude businessLocation.longitude documents.storePhoto rating',
    productCategory: 'name',
  });

  populateOptions.forEach((option) => {
    query.populate(option);
  });

  const product = await query;
  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  return localizeProductData(product, role, lang);
};

// get single product service
const getSingleProductPublic = async (productId: string, lang: 'en' | 'pt') => {
  const role = 'CUSTOMER';

  const productQuery = Product.findOne({
    productId,
    isApproved: true,
    isDeleted: false,
  });

  const populateOptions = getPopulateOptions(role, {
    vendor:
      'userId  businessDetails.businessName businessDetails.businessType businessDetails.isStoreOpen businessDetails.openingHours businessDetails.closingHours businessDetails.closingDays businessLocation.latitude businessLocation.longitude documents.storePhoto rating',
    productCategory: 'name',
  });

  populateOptions.forEach((option) => {
    productQuery.populate(option);
  });

  const product = await productQuery;

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  return localizeProductData(product, role, lang);
};

// product soft delete service
const softDeleteProduct = async (
  productId: string,
  currentUser: TCurrentUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to delete a product. Your account is ${currentUser.status}`,
    );
  }

  const product = await Product.findOne({ productId });
  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  if (currentUser.role === 'VENDOR' || currentUser.role === 'SUB_VENDOR') {
    if (currentUser._id.toString() !== product.vendorId.toString()) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not authorized to delete this product',
      );
    }
  }

  if (product.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Product is already deleted');
  }

  const activeOrderStatuses = [
    'PENDING',
    'ACCEPTED',
    'AWAITING_PARTNER',
    'DISPATCHING',
    'ASSIGNED',
    'REASSIGNMENT_NEEDED',
    'PREPARING',
    'READY_FOR_PICKUP',
    'PICKED_UP',
    'ON_THE_WAY',
  ];

  const hasActiveOrder = await Order.findOne({
    'items.productId': product._id,
    orderStatus: { $in: activeOrderStatuses },
  });
  if (hasActiveOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot delete product. This product is currently tied to an active, ongoing order.',
    );
  }
  product.isDeleted = true;
  await product.save();

  const productName = product.name?.en || 'Product';

  return {
    message: `${productName} has been deleted successfully`,
  };
};

// product permanent delete service (admin only)
const permanentDeleteProduct = async (
  productId: string,
  currentUser: TCurrentUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to permanently delete a product. Your account is ${currentUser.status}`,
    );
  }

  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only admins can permanently delete products',
    );
  }

  const product = await Product.findOne({ productId });
  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  if (product.isDeleted === false) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Product must be soft deleted before permanent deletion',
    );
  }

  const productName = product.name?.en || 'Product';

  await product.deleteOne();

  return {
    message: `${productName} has been permanently deleted successfully`,
  };
};

// get out of stock alerts
const getOutOfStockAlerts = async (
  query: Record<string, unknown>,
  currentUser: TCurrentUser,
  lang: 'en' | 'pt' = 'en',
) => {
  const {
    page = 1,
    limit = 10,
    searchTerm = '',
    sortBy = '-createdAt',
  } = query;

  const skip = (Number(page) - 1) * Number(limit);
  const role = currentUser.role;

  const lowStockConditions: any = {
    isDeleted: false,
    $or: [
      { 'stock.quantity': { $exists: true, $lt: 10 } },
      { 'variations.options.stockQuantity': { $exists: true, $lt: 10 } },
      { 'stock.availabilityStatus': 'Out of Stock' },
      { 'variations.options.isOutOfStock': true },
    ],
  };

  if (searchTerm) {
    lowStockConditions.$and = [
      {
        $or: [
          { 'name.en': { $regex: searchTerm, $options: 'i' } },
          { 'name.pt': { $regex: searchTerm, $options: 'i' } },
          { sku: { $regex: searchTerm, $options: 'i' } },
        ],
      },
    ];
  }

  const rawData = await Product.find(lowStockConditions)
    .select(
      'name sku stock variations vendorId category images createdAt updatedAt',
    )
    .populate('vendorId', 'userId businessDetails')
    .populate('productCategory', 'name')
    .sort(sortBy as string)
    .skip(skip)
    .limit(Number(limit))
    .lean();

  const total = await Product.countDocuments(lowStockConditions);
  const totalPage = Math.ceil(total / Number(limit));

  const localizedData = rawData.map((product: any) =>
    localizeProductData(product, role, lang),
  );

  return {
    data: localizedData,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPage,
    },
  };
};
export const ProductServices = {
  createProduct,
  updateProduct,
  manageProductVariations,
  renameProductVariation,
  removeProductVariations,
  updateInventoryAndPricing,
  approvedProduct,
  deleteProductImages,
  getAllProducts,
  getAllProductsPublic,
  getSingleProduct,
  getSingleProductPublic,
  softDeleteProduct,
  permanentDeleteProduct,
  getOutOfStockAlerts,
};
