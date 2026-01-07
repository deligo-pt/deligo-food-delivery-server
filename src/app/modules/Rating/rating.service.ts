/* eslint-disable no-unused-vars */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { TRating, TRefModel } from './rating.interface';
import { Rating } from './rating.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import {
  calcAndUpdateDeliveryPartner,
  // calcAndUpdateFleetManager,
  // calcAndUpdateProduct,
  // calcAndUpdateVendor,
} from './rating.constant';
import { AuthUser, ROLE_COLLECTION_MAP } from '../../constant/user.constant';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';
import { getPopulateOptions } from '../../utils/getPopulateOptions';

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

  const { user: existsTargetedUser } = await findUserByEmailOrId({
    userId: payload.targetId as string,
  });

  if (!existsTargetedUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const reviewerModel =
    ROLE_COLLECTION_MAP[currentUser.role as keyof typeof ROLE_COLLECTION_MAP];
  const targetModel =
    ROLE_COLLECTION_MAP[
      existsTargetedUser?.role as keyof typeof ROLE_COLLECTION_MAP
    ];
  payload.reviewerId = currentUser._id.toString();
  payload.reviewerModel = reviewerModel as TRefModel;
  payload.targetId = existsTargetedUser._id.toString();
  payload.targetModel = targetModel as TRefModel;

  const rating = await Rating.create(payload);

  const updateMap: Record<string, (targetId: string) => Promise<void>> = {
    DELIVERY_PARTNER: calcAndUpdateDeliveryPartner,
    // VENDOR: calcAndUpdateVendor,
    // PRODUCT: calcAndUpdateProduct,
    // FLEET_MANAGER: calcAndUpdateFleetManager,
  };

  const updateFunction = updateMap[payload.ratingType];

  if (updateFunction) {
    await updateFunction(payload.targetId.toString());
  }

  return rating;
};

const getAllRatingsFromDB = async (
  query: Record<string, unknown>,
  currentUser: AuthUser
) => {
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
