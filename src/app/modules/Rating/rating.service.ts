import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { TRating } from './rating.interface';
import { Rating } from './rating.model';
import {
  calcAndUpdateDeliveryPartner,
  calcAndUpdateFleetManager,
  calcAndUpdateProduct,
  calcAndUpdateVendor,
} from './rating.constant';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { AuthUser } from '../../constant/user.const';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';

// create rating service
const createRatingIntoDB = async (payload: TRating, currentUser: AuthUser) => {
  await findUserByEmailOrId({ userId: currentUser.id, isDeleted: false });
  // Prevent duplicate: same order + ratingType
  const exists = await Rating.findOne({
    orderId: payload.orderId,
    ratingType: payload.ratingType,
  });

  if (exists) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You already submitted rating for this order'
    );
  }

  const rating = await Rating.create(payload);

  // Update summary
  if (payload.ratingType === 'DELIVERY_PARTNER' && payload.deliveryPartnerId) {
    await calcAndUpdateDeliveryPartner(payload.deliveryPartnerId);
  }

  if (payload.ratingType === 'PRODUCT' && payload.productId) {
    await calcAndUpdateProduct(payload.productId);
  }

  if (payload.ratingType === 'VENDOR' && payload.vendorId) {
    await calcAndUpdateVendor(payload.vendorId);
  }

  if (payload.ratingType === 'FLEET_MANAGER' && payload.fleetManagerId) {
    await calcAndUpdateFleetManager(payload.fleetManagerId);
  }

  return rating;
};

// Get Ratings (Admin/User)
const getAllRatingsFromDB = async (
  query: Record<string, unknown>,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({ userId: currentUser.id, isDeleted: false });
  const ratingQuery = new QueryBuilder(Rating.find(), query)
    .filter()
    .sort()
    .paginate()
    .fields()
    .search(['orderId', 'ratingType']);

  const data = await ratingQuery.modelQuery;
  const meta = await ratingQuery.countTotal();

  return { meta, data };
};

export const RatingServices = {
  createRatingIntoDB,
  getAllRatingsFromDB,
};
