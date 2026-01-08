/* eslint-disable no-unused-vars */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { TRating, TRefModel } from './rating.interface';
import { Rating } from './rating.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import {
  calcAndUpdateDeliveryPartner,
  calcAndUpdateProduct,
  calcAndUpdateVendorAllProductStats,
} from './rating.constant';
import { AuthUser, ROLE_COLLECTION_MAP } from '../../constant/user.constant';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { Order } from '../Order/order.model';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';
import { Product } from '../Product/product.model';

// create rating
const createRatingIntoDB = async (payload: TRating, currentUser: AuthUser) => {
  const exists = await Rating.findOne({
    orderId: payload.orderId,
    reviewerId: currentUser._id.toString(),
    ratingType: payload.ratingType,
  });

  if (exists) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You have already submitted a rating for this category in this order.'
    );
  }

  const reviewerModel =
    ROLE_COLLECTION_MAP[currentUser.role as keyof typeof ROLE_COLLECTION_MAP];
  payload.reviewerId = currentUser._id.toString();
  payload.reviewerModel = reviewerModel as TRefModel;

  const existsOrder = await Order.findOne({ _id: payload.orderId });
  if (!existsOrder) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found');
  }

  if (payload.ratingType === 'PRODUCT') {
    if (!existsOrder.items || existsOrder.items.length === 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'No products found in this order to rate.'
      );
    }
    const productRatings = existsOrder.items.map((item) => ({
      ...payload,
      targetId: item.productId.toString(),
      targetModel: 'Product' as TRefModel,
      productId: item.productId.toString(),
    }));
    const result = await Rating.insertMany(productRatings);
    const updatePromises = existsOrder.items.map((item) =>
      calcAndUpdateProduct(item.productId.toString())
    );
    await Promise.all(updatePromises);
    await calcAndUpdateVendorAllProductStats(existsOrder.vendorId.toString());
    return result;
  } else {
    if (!payload.targetId) {
      throw new AppError(httpStatus.BAD_REQUEST, 'targetId is required.');
    }
    const { user: existsTargetedUser } = await findUserByEmailOrId({
      userId: payload.targetId as string,
    });

    if (!existsTargetedUser) {
      throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }
    const targetModel =
      ROLE_COLLECTION_MAP[
        existsTargetedUser?.role as keyof typeof ROLE_COLLECTION_MAP
      ];
    payload.targetId = existsTargetedUser._id.toString();
    payload.targetModel = targetModel as TRefModel;
    const rating = await Rating.create(payload);
    const updateMap: Record<string, (targetId: string) => Promise<void>> = {
      DELIVERY_PARTNER: calcAndUpdateDeliveryPartner,
    };
    const updateFunction = updateMap[payload.ratingType];

    if (updateFunction) {
      await updateFunction(payload.targetId.toString());
    }
    return rating;
  }
};

const getAllRatingsFromDB = async (
  query: Record<string, unknown>,
  currentUser: AuthUser
) => {
  if (currentUser.role === 'FLEET_MANAGER') {
    const myDeliveryPartners = await DeliveryPartner.find({
      registeredBy: currentUser._id,
    }).select('_id');
    const partnerIds = myDeliveryPartners.map((dp) => dp._id);
    query.targetId = { $in: [...partnerIds, currentUser._id] };
  } else if (currentUser.role === 'VENDOR') {
    const myProducts = await Product.find({
      vendorId: currentUser._id,
      isDeleted: false,
    }).select('_id');

    const productIds = myProducts.map((product) => product._id);

    query.targetId = { $in: [...productIds, currentUser._id] };
  } else if (
    currentUser.role !== 'ADMIN' &&
    currentUser.role !== 'SUPER_ADMIN'
  ) {
    query.targetId = currentUser._id.toString();
  }

  const ratingQuery = new QueryBuilder(Rating.find(), query)
    .filter()
    .sort()
    .paginate()
    .fields()
    .search(['review', 'ratingType']);

  const populateOptions = getPopulateOptions(currentUser.role, {
    reviewerId: 'name userId role',
    targetId: 'name userId role',
  });

  populateOptions.forEach((option) => {
    ratingQuery.modelQuery = ratingQuery.modelQuery.populate(option);
  });

  const data = await ratingQuery.modelQuery;
  const meta = await ratingQuery.countTotal();

  return { meta, data };
};

export const RatingServices = {
  createRatingIntoDB,
  getAllRatingsFromDB,
};
