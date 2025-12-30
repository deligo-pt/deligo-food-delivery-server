/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.constant';
import AppError from '../../errors/AppError';
import { TProduct } from './product.interface';
import { Product } from './product.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { ProductSearchableFields } from './product.constant';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { BusinessCategory, ProductCategory } from '../Category/category.model';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { Customer } from '../Customer/customer.model';
import { getCustomerCoordinates } from '../../utils/getCustomerCoordinates';
import { calculateDistance } from '../../utils/calculateDistance';
import { Vendor } from '../Vendor/vendor.model';
import { getPopulateOptions } from '../../utils/getPopulateOptions';

// Product Create Service
const createProduct = async (
  payload: TProduct,
  currentUser: AuthUser,
  images: string[]
) => {
  //  ------------ Vendor Details Adjustment ------------
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const existingUser = result?.user;
  if (existingUser?.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Vendor is not approved to add products'
    );
  }
  const vendorCategory = existingUser?.businessDetails?.businessType;
  // find vendor category is exist
  const vendorCategoryExist = await BusinessCategory.findOne({
    name: vendorCategory,
  });
  payload.vendorId = existingUser?._id;

  // check category
  if (payload?.category) {
    payload.category = payload?.category?.toUpperCase();
    const category = await ProductCategory.findOne({ name: payload.category });
    if (!category) {
      throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
    }

    //  ------------ Generating productId ------------
    const lastProduct = await Product.findOne().sort({ productId: -1 });
    let newProductId = 'PROD-0001';
    if (lastProduct) {
      const lastProductIdNumber = parseInt(lastProduct.productId.split('-')[1]);
      const newProductIdNumber = lastProductIdNumber + 1;
      newProductId = `PROD-${String(newProductIdNumber).padStart(4, '0')}`;
    }
    payload.productId = newProductId;
    //  ------------ Generating slug ------------
    const newSlug = payload.name
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '');
    payload.slug = newSlug;
    //  ------------ Generating SKU ------------
    const newSKU = `SKU-${payload?.category?.toUpperCase()}-${String(
      newProductId
    )
      .split('-')
      .pop()
      ?.padStart(4, '0')}`;
    payload.sku = newSKU;
    if (
      category?.businessCategoryId.toString() !==
      vendorCategoryExist?._id.toString()
    ) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'Category is not under business category of vendor'
      );
    }
  }

  const newProduct = await Product.create({ ...payload, images });
  return newProduct;
};

// update Product Service
const updateProduct = async (
  productId: string,
  payload: Partial<TProduct>,
  currentUser: AuthUser,
  images: string[]
) => {
  const existingVendor = await Vendor.findOne({
    userId: currentUser.id,
    isDeleted: false,
  });
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found...');
  }

  if (existingVendor.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to delete product images. Your account is ${existingVendor.status}`
    );
  }

  const existingProduct = await Product.findOne({
    productId,
    ...(currentUser.role === 'VENDOR' && {
      vendorId: existingVendor._id,
    }),
  });

  if (!existingProduct) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Product not found or you are not authorized to update this product'
    );
  }

  // check image if up to 5

  if (existingProduct.images.length + images.length > 5) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You can upload maximum 5 images'
    );
  }

  const nestedFields = [
    'pricing',
    'stock',
    'deliveryInfo',
    'meta',
    'attributes',
  ] as const;

  const mergeInto = (target: any, src: any) => {
    const t = (target?.toObject?.() || target) ?? {};
    Object.entries(src).forEach(([k, v]) => {
      if (v !== undefined) (t as any)[k] = v;
    });
    return t;
  };

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    if (key === 'images' && Array.isArray(value)) {
      existingProduct.images = [...(existingProduct.images || []), ...value];
      continue;
    }
    if (key === 'tags' && Array.isArray(value)) {
      existingProduct.tags = value as string[];
      continue;
    }
    if (
      (nestedFields as readonly string[]).includes(key) &&
      !Array.isArray(value) &&
      typeof value === 'object'
    ) {
      (existingProduct as any)[key] = mergeInto(
        (existingProduct as any)[key],
        value
      );
      if (key === 'attributes') existingProduct.markModified('attributes');
      if (key === 'pricing') existingProduct.markModified('pricing');
      if (key === 'stock') existingProduct.markModified('stock');
      if (key === 'deliveryInfo') existingProduct.markModified('deliveryInfo');
      if (key === 'meta') existingProduct.markModified('meta');
      continue;
    }
    (existingProduct as any)[key] = value;
  }

  if (images && images.length > 0) {
    existingProduct.images = [...(existingProduct.images || []), ...images];
  }
  await existingProduct.save({ validateModifiedOnly: true });
  return existingProduct;
};

// Approved Product Service
const approvedProduct = async (
  productId: string,
  currentUser: AuthUser,
  payload: { isApproved: boolean; remarks?: string }
) => {
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const existingProduct = await Product.findOne({
    productId,
  });
  if (!existingProduct) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  if (existingProduct.isApproved === payload.isApproved) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Product is already ${payload.isApproved ? 'approved' : 'rejected'}`
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
        'Remarks are required when rejecting a product'
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
  currentUser: AuthUser
) => {
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const existingUser = result.user;
  if (existingUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to delete product images. Your account is ${existingUser.status}`
    );
  }

  const product = await Product.findOne({ productId });
  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  // -------------check if images to be deleted exist in product images-------------
  const invalidImages = images.filter((img) => !product.images.includes(img));
  if (invalidImages.length > 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid images');
  }

  // delete image from cloudinary
  for (const image of images) {
    deleteSingleImageFromCloudinary(image).catch((err) => {
      throw new AppError(httpStatus.BAD_REQUEST, err.message);
    });
  }

  // Remove images from product
  product.images = product.images.filter((img) => !images.includes(img));
  await product.save();

  return product;
};

// get all products service
const getAllProducts = async (
  query: Record<string, unknown>,
  currentUser: AuthUser
) => {
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const loggedInUser = result.user;

  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view products. Your account is ${loggedInUser.status}`
    );
  }
  const role = loggedInUser.role;

  if (role === 'VENDOR') {
    query.vendorId = loggedInUser._id;
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
      query
    )
      .fields()
      .filter()
      .search(ProductSearchableFields);

    // Use QueryBuilder to get total/page/limit, but NOT DB pagination
    const [customer, meta, products] = await Promise.all([
      Customer.findOne({
        userId: currentUser.id,
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
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const loggedInUser = result.user;

  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view products. Your account is ${loggedInUser.status}`
    );
  }

  let query;
  if (
    loggedInUser.role === 'CUSTOMER' ||
    loggedInUser.role === 'DELIVERY_PARTNER' ||
    loggedInUser.role === 'FLEET_MANAGER'
  ) {
    query = Product.findOne({
      productId,
      isApproved: true,
      isDeleted: false,
    });
  } else if (loggedInUser.role === 'VENDOR') {
    query = Product.findOne({
      productId,
      vendorId: loggedInUser._id,
    });
  } else {
    query = Product.findOne({ productId });
  }
  const populateOptions = getPopulateOptions(loggedInUser.role, {
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
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const loggedInUser = result.user;
  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to delete a product. Your account is ${loggedInUser.status}`
    );
  }

  const product = await Product.findOne({ productId });
  if (loggedInUser.role === 'VENDOR' || loggedInUser.role === 'SUB_VENDOR') {
    if (loggedInUser._id.toString() !== product?.vendorId.toString()) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'You are not authorized to delete this product'
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
  currentUser: AuthUser
) => {
  const result = await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const loggedInUser = result.user;
  if (loggedInUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to permanently delete a product. Your account is ${loggedInUser.status}`
    );
  }

  const product = await Product.findOne({ productId });

  if (product?.isDeleted === false) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Product must be soft deleted before permanent deletion'
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
