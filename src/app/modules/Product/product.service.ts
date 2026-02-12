/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.constant';
import AppError from '../../errors/AppError';
import { TProduct } from './product.interface';
import { Product } from './product.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { ProductSearchableFields } from './product.constant';
import { BusinessCategory, ProductCategory } from '../Category/category.model';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { AddonGroup } from '../Add-Ons/addOns.model';
import { customAlphabet } from 'nanoid';
import { cleanForSKU, generateSlug } from './product.utils';
import { Tax } from '../Tax/tax.model';
import { TTax } from '../Tax/tax.interface';
// import { ProductPdService } from '../PdInvoice/Services/productPd.service';

const generateShortId = customAlphabet(
  '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  6,
);

// Product Create Service
const createProduct = async (
  payload: TProduct,
  currentUser: AuthUser,
  images: string[],
) => {
  if (currentUser?.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Vendor is not approved to add products',
    );
  }

  if (!payload.variations && !payload.pricing.price) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Price is required when no variations',
    );
  }

  const [vendorCategoryExist, category] = await Promise.all([
    BusinessCategory.findOne({
      name: currentUser?.businessDetails?.businessType,
    }),
    ProductCategory.findById(payload.category),
  ]);

  if (!category) throw new AppError(httpStatus.NOT_FOUND, 'Category not found');

  if (
    category.businessCategoryId.toString() !==
    vendorCategoryExist?._id.toString()
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Category is not under your business type',
    );
  }

  if (payload.addonGroups?.length) {
    const validAddonsCount = await AddonGroup.countDocuments({
      _id: { $in: payload.addonGroups },
      vendorId: currentUser._id,
      isDeleted: false,
    });
    if (validAddonsCount !== payload.addonGroups.length) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'One or more invalid Addon Groups',
      );
    }
  }

  if (payload.pricing.taxId) {
    const tax: TTax | null = await Tax.findById(payload.pricing.taxId);
    if (!tax) throw new AppError(httpStatus.NOT_FOUND, 'Tax not found');
    payload.pricing.taxRate = tax.taxRate;
  }

  const shortId = generateShortId();
  const productNamePart = cleanForSKU(payload.name);

  payload.vendorId = currentUser._id;
  payload.productId = `PROD-${shortId}`;
  payload.slug = generateSlug(payload.name);
  payload.sku = `${category.name.substring(0, 3).toUpperCase()}-${productNamePart}-${shortId.split('-').pop()}`;

  if (payload.variations && payload.variations?.length > 0) {
    let totalStock = 0;
    let minNetPrice = Infinity;

    payload.variations = payload.variations.map((variation) => ({
      ...variation,
      options: variation.options.map((option) => {
        const currentOptionPrice = option.price;
        if (currentOptionPrice < minNetPrice) minNetPrice = currentOptionPrice;

        const stock = option.stockQuantity || 0;
        totalStock += stock;

        return {
          ...option,
          price: currentOptionPrice,
          sku:
            option.sku ||
            `VAR-${productNamePart}-${cleanForSKU(option.label)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
          stockQuantity: stock,
          totalAddedQuantity: stock,
          isOutOfStock: stock <= 0,
        };
      }),
    }));

    payload.pricing.price = minNetPrice === Infinity ? 0 : minNetPrice;
    payload.stock.quantity = totalStock;
    payload.stock.totalAddedQuantity = totalStock;
    payload.stock.hasVariations = true;
  } else {
    payload.stock.hasVariations = false;
    payload.stock.totalAddedQuantity = payload.stock.quantity;
  }

  const newProduct = await Product.create({ ...payload, images });

  // if (newProduct) {
  //   const syncData = {
  //     ...newProduct.toObject(),
  //     category: category.name,
  //   } as any;
  //   ProductPdService.syncProductToPd(syncData).catch((error) => {
  //     console.error('Error syncing product to Pasta Digital:', error);
  //   });
  // }

  return newProduct;
};

// update Product Service
const updateProduct = async (
  productId: string,
  payload: Partial<TProduct>,
  currentUser: AuthUser,
  images: string[],
) => {
  const existingProduct = await Product.findOne({
    productId,
    ...(currentUser.role === 'VENDOR' && { vendorId: currentUser._id }),
  });

  if (!existingProduct)
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');

  if (currentUser?.status !== 'APPROVED')
    throw new AppError(httpStatus.FORBIDDEN, 'Action forbidden.');

  const modifiedData: Record<string, any> = {};

  if (payload.name) {
    modifiedData.name = payload.name;
    modifiedData.slug = generateSlug(payload.name);
  }
  if (payload.description) modifiedData.description = payload.description;
  if (payload.category) modifiedData.category = payload.category;
  if (payload.subCategory) modifiedData.subCategory = payload.subCategory;
  if (payload.brand) modifiedData.brand = payload.brand;
  if (payload.tags) modifiedData.tags = payload.tags;
  if (payload.attributes) modifiedData.attributes = payload.attributes;

  // Pricing & Tax Update
  if (payload.pricing) {
    if (payload.pricing.taxId) {
      const tax = await Tax.findById(payload.pricing.taxId);
      if (!tax) throw new AppError(httpStatus.NOT_FOUND, 'Tax not found');
      modifiedData['pricing.taxId'] = payload.pricing.taxId;
      modifiedData['pricing.taxRate'] = tax.taxRate;
    }
    if (payload.pricing.currency)
      modifiedData['pricing.currency'] = payload.pricing.currency;
    if (payload.pricing.discount !== undefined)
      modifiedData['pricing.discount'] = payload.pricing.discount;
  }

  // Meta & Stock Unit Update
  if (payload.stock?.unit) modifiedData['stock.unit'] = payload.stock.unit;
  if (payload.meta) {
    Object.keys(payload.meta).forEach((key) => {
      modifiedData[`meta.${key}`] = (payload.meta as any)[key];
    });
  }

  // Database Update Query
  const updateQuery: any = { $set: modifiedData };
  if (payload.addonGroups && payload.addonGroups.length > 0) {
    updateQuery.$addToSet = { addonGroups: { $each: payload.addonGroups } };
  }
  if (images && images.length > 0) {
    updateQuery.$push = { images: { $each: images } };
  }

  const updatedProduct = await Product.findOneAndUpdate(
    { productId },
    updateQuery,
    { new: true, runValidators: true },
  );

  // Availability Status Auto-Update (Based on the current variation stock)
  if (updatedProduct) {
    const finalQty = updatedProduct.stock.quantity;
    updatedProduct.stock.availabilityStatus =
      finalQty > 0 ? (finalQty < 5 ? 'Limited' : 'In Stock') : 'Out of Stock';
    await updatedProduct.save();
  }

  return updatedProduct;
};

// manage product variations service
const manageProductVariations = async (
  productId: string,
  payload: { name: string; options: any[] },
  currentUser: AuthUser,
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
    const inputStockQty = opt.stockQuantity || 0;

    if (variationIndex > -1) {
      const isOptionExists = existingProduct.variations[
        variationIndex
      ].options.some(
        (o: any) => o.label.toLowerCase() === normalizedLabel.toLowerCase(),
      );

      if (isOptionExists) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Option '${normalizedLabel}' already exists in '${normalizedName}'. Use update API to change stock or price.`,
        );
      }
    }

    const generatedSku =
      opt.sku ||
      `VAR-${productNamePart}-${cleanForSKU(normalizedLabel)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const isSkuTaken = await Product.findOne({
      'variations.options.sku': generatedSku,
    });

    if (isSkuTaken) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Generated SKU ${generatedSku} is already in use.`,
      );
    }

    finalOptionsToPush.push({
      ...opt,
      label: normalizedLabel,
      sku: generatedSku,
      stockQuantity: inputStockQty,
      totalAddedQuantity: inputStockQty,
      isOutOfStock: inputStockQty <= 0,
    });
  }

  if (variationIndex > -1) {
    if (finalOptionsToPush.length > 0) {
      existingProduct.variations[variationIndex].options.push(
        ...finalOptionsToPush,
      );
    }
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

  existingProduct.stock.quantity = totalQty;
  existingProduct.stock.totalAddedQuantity = totalAddedAcrossVariations;
  existingProduct.stock.hasVariations = true;
  existingProduct.stock.availabilityStatus =
    totalQty > 0 ? (totalQty < 5 ? 'Limited' : 'In Stock') : 'Out of Stock';

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
  currentUser: AuthUser,
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
  currentUser: AuthUser,
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

  existingProduct.stock.quantity = totalQty;
  existingProduct.stock.totalAddedQuantity = totalAddedAcrossVariations;
  existingProduct.stock.hasVariations = existingProduct.variations.length > 0;
  existingProduct.stock.availabilityStatus =
    totalQty > 0 ? (totalQty < 5 ? 'Limited' : 'In Stock') : 'Out of Stock';

  if (minPrice !== Infinity) {
    existingProduct.pricing.price = minPrice;
  }

  await existingProduct.save();
  return existingProduct;
};

// update inventory and pricing service
const updateInventoryAndPricing = async (
  currentUser: AuthUser,
  productId: string,
  addedQuantity: number = 0,
  reduceQuantity: number = 0,
  newPrice?: number,
  variationSku?: string,
) => {
  const product = await Product.findOne({ productId });

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  if (currentUser.role === 'VENDOR' || currentUser.role === 'SUB_VENDOR') {
    if (currentUser._id.toString() !== product?.vendorId.toString()) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not authorized to update this product',
      );
    }
  }

  const netQuantityChange = addedQuantity - reduceQuantity;

  if (product.stock.hasVariations) {
    if (!variationSku) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Variation SKU is required');
    }

    let variationFound = false;
    let minPrice = Infinity;

    product?.variations?.forEach((variation) => {
      variation.options.forEach((opt) => {
        if (opt.sku === variationSku) {
          if (reduceQuantity > 0 && reduceQuantity > opt.stockQuantity) {
            throw new AppError(
              httpStatus.BAD_REQUEST,
              `Insufficient stock for SKU ${variationSku}. Available: ${opt.stockQuantity}`,
            );
          }

          opt.stockQuantity += netQuantityChange;
          opt.totalAddedQuantity += netQuantityChange;
          opt.isOutOfStock = opt.stockQuantity <= 0;

          if (newPrice !== undefined) opt.price = newPrice;
          variationFound = true;
        }
        if (opt.price < minPrice) minPrice = opt.price;
      });
    });

    if (!variationFound) {
      throw new AppError(httpStatus.NOT_FOUND, 'Variation SKU not found');
    }

    let totalStock = 0;
    product?.variations?.forEach((v) =>
      v.options.forEach((opt) => (totalStock += opt.stockQuantity)),
    );

    product.stock.quantity = totalStock;
    product.stock.totalAddedQuantity += netQuantityChange;
    if (newPrice !== undefined) product.pricing.price = minPrice;
  } else {
    if (reduceQuantity > 0 && reduceQuantity > product.stock.quantity) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Insufficient stock. Available: ${product.stock.quantity}`,
      );
    }

    product.stock.quantity += netQuantityChange;
    product.stock.totalAddedQuantity += netQuantityChange;
    if (newPrice !== undefined) product.pricing.price = newPrice;
  }

  const finalQty = product.stock.quantity;
  product.stock.availabilityStatus =
    finalQty > 0 ? (finalQty < 5 ? 'Limited' : 'In Stock') : 'Out of Stock';

  await product.save();
  return product;
};

// Approved Product Service
const approvedProduct = async (
  productId: string,
  currentUser: AuthUser,
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
  currentUser: AuthUser,
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
  currentUser: AuthUser,
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
      'userId businessDetails.businessName businessDetails.businessType documents.storePhoto businessLocation.latitude businessLocation.longitude',
    productCategory: 'name ',
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
const getSingleProduct = async (productId: string, currentUser: AuthUser) => {
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
      'userId businessDetails.businessName businessDetails.businessType documents.storePhoto businessLocation.latitude businessLocation.longitude',
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
const softDeleteProduct = async (productId: string, currentUser: AuthUser) => {
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
  currentUser: AuthUser,
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
};
