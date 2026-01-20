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
import { Customer } from '../Customer/customer.model';
import { getCustomerCoordinates } from '../../utils/getCustomerCoordinates';
import { calculateDistance } from '../../utils/calculateDistance';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { AddonGroup } from '../Add-Ons/addOns.model';
import { customAlphabet } from 'nanoid';
import { SageService } from '../Sage/SageService';
import { cleanForSKU, generateSlug } from './product.utils';
import { Tax } from '../Tax/tax.model';
import { TTax } from '../Tax/tax.interface';

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

  if (payload.variations?.length) {
    let totalStock = 0;

    payload.variations = payload.variations.map((variation) => ({
      ...variation,
      options: variation.options.map((option) => {
        const stock = option.stockQuantity || 0;
        totalStock += stock;

        return {
          ...option,
          sku:
            option.sku ||
            `VAR-${productNamePart}-${cleanForSKU(option.label)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
          stockQuantity: stock,
          totalAddedQuantity: stock,
          isOutOfStock: stock <= 0,
        };
      }),
    }));

    payload.stock.quantity = totalStock;
    payload.stock.totalAddedQuantity = totalStock;
    payload.stock.hasVariations = true;
  } else {
    payload.stock.hasVariations = false;
    payload.stock.totalAddedQuantity = payload.stock.quantity;
  }

  const newProduct = await Product.create({ ...payload, images });

  if (newProduct) {
    SageService.syncProductToSage(newProduct).catch((error) => {
      console.error('Error syncing product to Sage:', error);
    });
  }

  return newProduct;
};

// update Product Service
const updateProduct = async (
  productId: string,
  payload: Partial<TProduct>,
  currentUser: AuthUser,
  images: string[],
) => {
  if (currentUser?.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, `Action forbidden.`);
  }

  const existingProduct = await Product.findOne({
    productId,
    ...(currentUser.role === 'VENDOR' && { vendorId: currentUser._id }),
  });

  if (!existingProduct) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  const { pricing, stock, meta, attributes, variations, ...remainingData } =
    payload;
  const modifiedData: Record<string, any> = { ...remainingData };
  const productNamePart = cleanForSKU(existingProduct.name);

  if (variations && variations.length > 0) {
    let totalStock = 0;

    const finalVariations = JSON.parse(
      JSON.stringify(existingProduct.variations || []),
    );

    variations.forEach((newVar) => {
      const varIndex = finalVariations.findIndex(
        (v: any) => v.name === newVar.name,
      );

      if (varIndex > -1) {
        newVar.options.forEach((newOpt) => {
          const optIndex = finalVariations[varIndex].options.findIndex(
            (o: any) => o.label === newOpt.label,
          );

          if (optIndex > -1) {
            const existingOpt = finalVariations[varIndex].options[optIndex];
            const updatedStock =
              newOpt.stockQuantity ?? existingOpt.stockQuantity ?? 0;

            finalVariations[varIndex].options[optIndex] = {
              ...existingOpt,
              ...newOpt,
              stockQuantity: updatedStock,
              totalAddedQuantity:
                existingOpt.totalAddedQuantity || updatedStock,
              isOutOfStock: updatedStock <= 0,
            };
          } else {
            const stock = newOpt.stockQuantity || 0;
            finalVariations[varIndex].options.push({
              ...newOpt,
              sku:
                newOpt.sku ||
                `VAR-${productNamePart}-${cleanForSKU(newOpt.label)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
              stockQuantity: stock,
              totalAddedQuantity: stock,
              isOutOfStock: stock <= 0,
            });
          }
        });
      } else {
        const processedNewVar = {
          ...newVar,
          options: newVar.options.map((o) => {
            const s = o.stockQuantity || 0;
            return {
              ...o,
              sku:
                o.sku ||
                `VAR-${productNamePart}-${cleanForSKU(o.label)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
              stockQuantity: s,
              totalAddedQuantity: s,
              isOutOfStock: s <= 0,
            };
          }),
        };
        finalVariations.push(processedNewVar);
      }
    });

    finalVariations.forEach((v: any) => {
      v.options.forEach((o: any) => {
        totalStock += o.stockQuantity || 0;
      });
    });

    modifiedData.variations = finalVariations;
    modifiedData['stock.quantity'] = totalStock;
    modifiedData['stock.totalAddedQuantity'] = totalStock;
    modifiedData['stock.hasVariations'] = true;
  } else if (stock?.quantity !== undefined) {
    modifiedData['stock.quantity'] = stock.quantity;
    modifiedData['stock.totalAddedQuantity'] = stock.quantity;
    modifiedData['stock.hasVariations'] = false;
  }

  if (pricing) {
    Object.keys(pricing).forEach((key) => {
      modifiedData[`pricing.${key}`] = (pricing as any)[key];
    });
  }

  if (meta) {
    Object.keys(meta).forEach((key) => {
      modifiedData[`meta.${key}`] = (meta as any)[key];
    });
  }

  if (stock?.unit) modifiedData['stock.unit'] = stock.unit;

  if (attributes) modifiedData.attributes = attributes;

  if (images && images.length > 0) {
    modifiedData.$push = { images: { $each: images } };
  }

  const finalStockQty =
    modifiedData['stock.quantity'] ?? existingProduct.stock.quantity;
  modifiedData['stock.availabilityStatus'] =
    finalStockQty > 0 ? 'In Stock' : 'Out of Stock';

  const updatedProduct = await Product.findOneAndUpdate(
    { productId },
    modifiedData,
    { new: true, runValidators: true, context: 'query' },
  );

  return updatedProduct;
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
    currentUser.role === 'VENDOR' &&
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

  // ------------------------------------
  // CUSTOMER → nearest vendors first
  // ------------------------------------

  if (role === 'CUSTOMER') {
    // Build base query WITH filter/search/fields but WITHOUT paginate/sort
    const productsQB = new QueryBuilder(
      Product.find().populate({
        path: 'vendorId',
        select:
          'userId businessDetails.businessName businessDetails.businessType documents.storePhoto businessDetails.isStoreOpen businessLocation.latitude businessLocation.longitude',
      }),
      query,
    )
      .fields()
      .filter()
      .search(ProductSearchableFields);

    // Use QueryBuilder to get total/page/limit, but NOT DB pagination
    const [customer, meta, products] = await Promise.all([
      Customer.findOne({
        userId: currentUser.userId,
        isDeleted: false,
      }).lean(),
      productsQB.countTotal(), // uses query.page + query.limit
      productsQB.modelQuery.lean<TProduct[]>(), // NO skip/limit applied here
    ]);

    const coords = customer ? getCustomerCoordinates(customer) : null;

    let sortedProducts: (TProduct & { distance?: number })[] = products;

    if (coords) {
      const [custLng, custLat] = coords;

      sortedProducts = products
        .map((product) => {
          const vLng = (product as any).vendorId?.businessLocation?.longitude;
          const vLat = (product as any).vendorId?.businessLocation?.latitude;

          if (typeof vLng === 'number' && typeof vLat === 'number') {
            const { meters } = calculateDistance(custLng, custLat, vLng, vLat);
            return { ...product, distance: meters };
          }

          // No vendor coordinates → send to bottom
          return { ...product, distance: Number.POSITIVE_INFINITY };
        })
        .sort((a, b) => {
          const dA = a.distance ?? Number.POSITIVE_INFINITY;
          const dB = b.distance ?? Number.POSITIVE_INFINITY;
          return dA - dB;
        });
    }

    // Manual paginate AFTER distance sort
    const page = meta.page;
    const limit = meta.limit;
    const skip = (page - 1) * limit;

    const paginated = sortedProducts.slice(skip, skip + limit);

    return {
      meta: {
        ...meta,
        totalPages: meta.totalPage,
      },
      data: paginated,
    };
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
  approvedProduct,
  deleteProductImages,
  getAllProducts,
  getSingleProduct,
  softDeleteProduct,
  permanentDeleteProduct,
};
