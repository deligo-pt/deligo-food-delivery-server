/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { TProduct } from './product.interface';
import { Product } from './product.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { ProductSearchableFields } from './product.constant';
import { BusinessCategory, ProductCategory } from '../Category/category.model';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { cleanForSKU, generateSlug } from './product.utils';
import { Tax } from '../Tax/tax.model';
import { BusinessCategoryName } from '../Category/category.interface';
import { CreateProductUtils } from './createProduct.utils';
import customNanoId from '../../utils/customNanoId';
import { TAuthUser } from '../AuthUser/authUser.interface';
import { UpdateProductUtils } from './updateProduct.utils';

// Create Product Service
const createProduct = async (payload: TProduct, currentUser: any) => {
  await currentUser.populate('userObjectId', 'businessDetails');

  const vendorProfile = currentUser.userObjectId as any;

  CreateProductUtils.validateVendor(currentUser);
  CreateProductUtils.validateBasePayload(payload);

  const [vendorCategoryExist, category] = await Promise.all([
    BusinessCategory.findOne({
      name: vendorProfile?.businessDetails?.businessType,
    }),
    ProductCategory.findById(payload.category),
  ]);

  CreateProductUtils.validateRestaurantStock(vendorCategoryExist, payload);
  CreateProductUtils.validateCategory(vendorCategoryExist, category);

  await CreateProductUtils.validateAddons(payload, currentUser._id);
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

// update Product Service
const updateProduct = async (
  productId: string,
  payload: Partial<TProduct>,
  currentUser: TAuthUser,
) => {
  const existingProduct = await UpdateProductUtils.getAndValidateProduct(
    productId,
    currentUser,
  );
  const { images } = payload;
  const vendorBusinessType = await UpdateProductUtils.getVendorBusinessType(
    existingProduct.vendorId,
  );

  const modifiedData = await UpdateProductUtils.prepareUpdateData(
    payload,
    vendorBusinessType,
    existingProduct.name,
  );

  const updateQuery: any = { $set: modifiedData };
  if (payload.images && payload.images.length > 0) {
    updateQuery.$set.images = payload.images;
  }

  const updatedProduct = await Product.findOneAndUpdate(
    { productId },
    updateQuery,
    { new: true, runValidators: true },
  );

  await UpdateProductUtils.syncStockStatus(updatedProduct, vendorBusinessType);

  return updatedProduct;
};

// manage product variations service
const manageProductVariations = async (
  productId: string,
  payload: { name: string; options: any[] },
  currentUser: TAuthUser,
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
  const normalizedName = name.trim();
  const productNamePart = cleanForSKU(existingProduct.name);

  if (!existingProduct.variations) {
    existingProduct.variations = [];
  }

  const variationIndex = existingProduct.variations.findIndex(
    (v) => v.name.toLowerCase() === normalizedName.toLowerCase(),
  );

  const finalOptionsToPush: any[] = [];

  for (const opt of options) {
    const normalizedLabel = opt.label.trim();

    if (variationIndex > -1) {
      const isOptionExists = existingProduct.variations[
        variationIndex
      ].options.some(
        (o: any) => o.label.toLowerCase() === normalizedLabel.toLowerCase(),
      );
      if (isOptionExists) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Option '${normalizedLabel}' already exists.`,
        );
      }
    }

    const generatedSku =
      opt.sku ||
      `VAR-${productNamePart}-${cleanForSKU(normalizedLabel)}-${customNanoId(3)}`;

    const isSkuTaken = await Product.findOne({
      'variations.options.sku': generatedSku,
    });
    if (isSkuTaken) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `SKU ${generatedSku} is already in use.`,
      );
    }

    const newOption: any = {
      label: normalizedLabel,
      price: opt.price,
      sku: generatedSku,
    };

    if (!isRestaurant) {
      const inputStockQty = opt.stockQuantity || 0;
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
      name: normalizedName,
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
    newName?: string;
    oldLabel?: string;
    newLabel?: string;
  },
  currentUser: TAuthUser,
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
    (v) => v.name.toLowerCase() === oldName.trim().toLowerCase(),
  );

  if (variationIndex === -1)
    throw new AppError(
      httpStatus.NOT_FOUND,
      `Variation group '${oldName}' not found`,
    );

  if (newName && !oldLabel) {
    existingProduct.variations[variationIndex].name = newName.trim();
  }

  if (oldLabel && newLabel) {
    const optionIndex = existingProduct.variations[
      variationIndex
    ].options.findIndex(
      (o: any) => o.label.toLowerCase() === oldLabel.trim().toLowerCase(),
    );

    if (optionIndex === -1)
      throw new AppError(
        httpStatus.NOT_FOUND,
        `Option '${oldLabel}' not found`,
      );

    existingProduct.variations[variationIndex].options[optionIndex].label =
      newLabel.trim();
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
  currentUser: TAuthUser,
) => {
  const existingProduct = await Product.findOne({
    productId,
    ...((currentUser.role === 'VENDOR' ||
      currentUser.role === 'SUB_VENDOR') && { vendorId: currentUser._id }),
  });

  if (!existingProduct)
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');

  if (currentUser?.status !== 'APPROVED')
    throw new AppError(httpStatus.FORBIDDEN, 'Your account is not approved.');

  const { name, labelToRemove } = payload;
  const normalizedName = name.trim();

  if (!existingProduct.variations || existingProduct.variations.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No variations found to remove');
  }

  const variationIndex = existingProduct.variations.findIndex(
    (v) => v.name.toLowerCase() === normalizedName.toLowerCase(),
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
      (o: any) => o.label.toLowerCase() === labelToRemove.trim().toLowerCase(),
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

  if (existingProduct.stock && existingProduct.stock.quantity) {
    existingProduct.stock.quantity = totalQty;
    existingProduct.stock.totalAddedQuantity = totalAddedAcrossVariations;
    existingProduct.stock.hasVariations = existingProduct.variations.length > 0;
    existingProduct.stock.availabilityStatus =
      totalQty > 0 ? (totalQty < 5 ? 'Limited' : 'In Stock') : 'Out of Stock';

    if (minPrice !== Infinity) {
      existingProduct.pricing.price = minPrice;
    }
  }

  await existingProduct.save();
  return existingProduct;
};

// update inventory and pricing service
const updateInventoryAndPricing = async (
  currentUser: TAuthUser,
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

  if (product.variations && product.variations.length > 0) {
    if (!variationSku) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Variation SKU is required');
    }

    let variationFound = false;
    let minPrice = Infinity;

    product.variations.forEach((variation) => {
      variation.options.forEach((opt) => {
        if (opt.sku === variationSku) {
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
              (opt.totalAddedQuantity || 0) + netQuantityChange;
            opt.isOutOfStock = opt.stockQuantity <= 0;
          }

          if (newPrice !== undefined) opt.price = newPrice;
          variationFound = true;
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
        (product.stock.totalAddedQuantity || 0) + netQuantityChange;
    }

    if (newPrice !== undefined) product.pricing.price = minPrice;
  } else {
    if (!isRestaurant && product.stock) {
      if (reduceQuantity > 0 && reduceQuantity > product.stock.quantity) {
        throw new AppError(httpStatus.BAD_REQUEST, `Insufficient stock.`);
      }
      product.stock.quantity += netQuantityChange;
      product.stock.totalAddedQuantity =
        (product.stock.totalAddedQuantity || 0) + netQuantityChange;
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
  currentUser: TAuthUser,
  payload: { isApproved: boolean; remarks?: string },
) => {
  const existingProduct = await Product.findOne({
    productId,
  });
  if (!existingProduct) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  if (existingProduct.isApproved === payload.isApproved) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Product is already ${payload.isApproved ? 'approved' : 'rejected'}`,
    );
  }

  if (existingProduct.isApproved === false && payload.isApproved === true) {
    existingProduct.isApproved = payload.isApproved;
  } else if (
    existingProduct.isApproved === true &&
    payload.isApproved === false
  ) {
    if (payload.isApproved === false && !payload.remarks) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Remarks are required when rejecting a product',
      );
    }
    existingProduct.remarks = payload.remarks;
    existingProduct.isApproved = payload.isApproved;
  }

  await existingProduct.save();
  return {
    message: `Product has been ${
      payload.isApproved ? 'approved' : 'rejected'
    } successfully`,
    data: {
      productId: existingProduct.productId,
      isApproved: existingProduct.isApproved,
      remarks: existingProduct.remarks,
    },
  };
};

// product image delete service
const deleteProductImages = async (
  productId: string,
  images: string[],
  currentUser: TAuthUser,
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
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid images');
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
  currentUser: TAuthUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view products. Your account is ${currentUser.status}`,
    );
  }
  const role = currentUser.role;

  if (role === 'VENDOR') {
    query.vendorId = currentUser._id;
    query.isDeleted = false;
  }

  if (['CUSTOMER', 'FLEET_MANAGER', 'DELIVERY_PARTNER'].includes(role)) {
    query.isApproved = true;
    query.isDeleted = false;
  }

  const products = new QueryBuilder(Product.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(ProductSearchableFields);

  const populateOptions = getPopulateOptions(role, {
    vendor:
      'userId  businessDetails.businessName businessDetails.businessType businessDetails.isStoreOpen businessDetails.openingHours businessDetails.closingHours businessDetails.closingDays businessLocation.latitude businessLocation.longitude documents.storePhoto rating',
    productCategory: 'name',
  });

  populateOptions.forEach((option) => {
    products.modelQuery = products.modelQuery.populate(option);
  });

  const meta = await products.countTotal();
  const data = await products.modelQuery;
  return {
    meta,
    data,
  };
};

// get single product service
const getSingleProduct = async (productId: string, currentUser: TAuthUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view products. Your account is ${currentUser.status}`,
    );
  }

  let query;
  if (
    currentUser.role === 'CUSTOMER' ||
    currentUser.role === 'DELIVERY_PARTNER' ||
    currentUser.role === 'FLEET_MANAGER'
  ) {
    query = Product.findOne({
      productId,
      isApproved: true,
      isDeleted: false,
    });
  } else if (currentUser.role === 'VENDOR') {
    query = Product.findOne({
      productId,
      vendorId: currentUser._id,
    });
  } else {
    query = Product.findOne({ productId });
  }
  const populateOptions = getPopulateOptions(currentUser.role, {
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
  return product;
};

// product soft delete service
const softDeleteProduct = async (productId: string, currentUser: TAuthUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to delete a product. Your account is ${currentUser.status}`,
    );
  }

  const product = await Product.findOne({ productId });
  if (currentUser.role === 'VENDOR' || currentUser.role === 'SUB_VENDOR') {
    if (currentUser._id.toString() !== product?.vendorId.toString()) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'You are not authorized to delete this product',
      );
    }
  }

  if (product?.isDeleted) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Product is already deleted');
  }

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  // --------------------------------------------------------------------------
  // TODO: check if product in order or not. if in order, throw error will be added
  // --------------------------------------------------------------------------
  product.isDeleted = true;
  await product.save();
  return {
    message: `${product.name} has been deleted successfully`,
  };
};

//  product permanent delete service (admin only)
const permanentDeleteProduct = async (
  productId: string,
  currentUser: TAuthUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to permanently delete a product. Your account is ${currentUser.status}`,
    );
  }

  const product = await Product.findOne({ productId });

  if (product?.isDeleted === false) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Product must be soft deleted before permanent deletion',
    );
  }

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }
  await product.deleteOne();
  return {
    message: `${product.name} has been permanently deleted successfully`,
  };
};

const getOutOfStockAlerts = async (query: Record<string, unknown>) => {
  const {
    page = 1,
    limit = 10,
    searchTerm = '',
    sortBy = '-createdAt',
  } = query;

  const skip = (Number(page) - 1) * Number(limit);

  const lowStockConditions: any = {
    isDeleted: false,
    $or: [
      { 'stock.quantity': { $lt: 10 } },
      { 'variations.options.stockQuantity': { $lt: 10 } },
      { 'stock.availabilityStatus': 'Out of Stock' },
      { 'variations.options.isOutOfStock': true },
    ],
  };

  if (searchTerm) {
    lowStockConditions.$and = [
      {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { sku: { $regex: searchTerm, $options: 'i' } },
        ],
      },
    ];
  }

  const data = await Product.find(lowStockConditions)
    .select(
      'name sku stock variations vendorId category images createdAt updatedAt',
    )
    .populate('vendorId', 'userId businessDetails')
    .populate('category')
    .sort(sortBy as string)
    .skip(skip)
    .limit(Number(limit))
    .lean();

  const total = await Product.countDocuments(lowStockConditions);
  const totalPage = Math.ceil(total / Number(limit));

  return {
    data,
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
  getSingleProduct,
  softDeleteProduct,
  permanentDeleteProduct,
  getOutOfStockAlerts,
};
