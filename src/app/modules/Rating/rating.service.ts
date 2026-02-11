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
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { Order } from '../Order/order.model';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';
import { Product } from '../Product/product.model';
import mongoose from 'mongoose';

// create rating
const createRating = async (payload: TRating, currentUser: AuthUser) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const [exists, existsOrder] = await Promise.all([
      Rating.findOne({
        orderId: payload.orderId,
        reviewerId: currentUser._id,
        ratingType: payload.ratingType,
      }).session(session),
      Order.findById(payload.orderId).session(session),
    ]);

    if (exists) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'You have already submitted a rating for this category in this order.',
      );
    }

    if (!existsOrder) {
      throw new AppError(httpStatus.NOT_FOUND, 'Order not found');
    }

    const reviewerModel =
      ROLE_COLLECTION_MAP[currentUser.role as keyof typeof ROLE_COLLECTION_MAP];
    payload.reviewerId = currentUser._id;
    payload.reviewerModel = reviewerModel as TRefModel;

    let result;
    const updateFields: Record<string, boolean> = {};

    if (payload.ratingType === 'PRODUCT') {
      if (!existsOrder.items || existsOrder.items.length === 0) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'No products found in this order.',
        );
      }

      const productRatings = existsOrder.items.map((item) => ({
        ...payload,
        targetId: item.productId,
        targetModel: 'Product' as TRefModel,
        productId: item.productId,
      }));

      result = await Rating.insertMany(productRatings, { session });
      updateFields['ratingStatus.isProductRated'] = true;
      updateFields['ratingStatus.isVendorRated'] = true;

      await Promise.all(
        existsOrder.items.map((item) =>
          calcAndUpdateProduct(item.productId.toString(), session),
        ),
      );
      await calcAndUpdateVendorAllProductStats(
        existsOrder.vendorId.toString(),
        session,
      );
    } else {
      let targetId: string | undefined;
      let targetModel: TRefModel | undefined;

      if (payload.ratingType === 'DELIVERY_PARTNER') {
        if (!existsOrder.deliveryPartnerId) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            'No delivery partner assigned to this order.',
          );
        }
        targetId = existsOrder.deliveryPartnerId.toString();
        targetModel = 'DeliveryPartner';
        updateFields['ratingStatus.isDeliveryRated'] = true;
      } else if (payload.ratingType === 'VENDOR') {
        targetId = existsOrder.vendorId.toString();
        targetModel = 'Vendor';
        updateFields['ratingStatus.isVendorRated'] = true;
      }

      if (!targetId || !targetModel) {
        throw new AppError(httpStatus.NOT_FOUND, 'Target for rating not found');
      }

      payload.targetId = new mongoose.Types.ObjectId(targetId);
      payload.targetModel = targetModel;

      const newRatings = await Rating.create([payload], { session });
      result = newRatings[0];

      if (payload.ratingType === 'DELIVERY_PARTNER') {
        await calcAndUpdateDeliveryPartner(targetId, session);
      }
    }
    await Order.findByIdAndUpdate(
      payload.orderId,
      { $set: updateFields },
      { session },
    );
    await session.commitTransaction();
    await session.endSession();
    return result;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

const getAllRatings = async (
  query: Record<string, unknown>,
  currentUser: AuthUser,
) => {
  if (currentUser.role === 'FLEET_MANAGER') {
    const myDeliveryPartners = await DeliveryPartner.find({
      'registeredBy.id': currentUser._id,
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
  } else if (currentUser.role === 'CUSTOMER') {
    query.reviewerId = currentUser._id.toString();
  } else if (currentUser.role === 'DELIVERY_PARTNER') {
    query.targetId = currentUser._id.toString();
  }

  const ratingQuery = new QueryBuilder(
    Rating.find().populate('productId', 'name image'),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields()
    .search(['review', 'ratingType']);

  const populateOptions = getPopulateOptions(currentUser.role, {
    reviewerId: 'name userId role',
    targetId: 'name userId role',
    orderId: 'orderId',
  });

  populateOptions.forEach((option) => {
    ratingQuery.modelQuery = ratingQuery.modelQuery.populate(option);
  });

  const data = await ratingQuery.modelQuery;
  const meta = await ratingQuery.countTotal();

  return { meta, data };
};

// get single rating
const getSingleRating = async (ratingId: string, currentUser: AuthUser) => {
  const rating = await Rating.findById(ratingId)
    .populate('reviewerId', 'name image role userId')
    .populate('targetId', 'name image role userId')
    .populate('productId', 'name image')
    .populate('orderId', 'orderId');

  if (!rating) {
    throw new AppError(httpStatus.NOT_FOUND, 'Rating not found');
  }

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);

  const isReviewer =
    rating.reviewerId?._id.toString() === currentUser._id.toString();
  const isTarget =
    rating.targetId?._id.toString() === currentUser._id.toString();

  let isProductOwner = false;
  if (currentUser.role === 'VENDOR' && rating.ratingType === 'PRODUCT') {
    const product = await Product.findOne({
      _id: rating.productId,
      vendorId: currentUser._id,
    });
    if (product) isProductOwner = true;
  }

  let isFleetManagerOfPartner = false;
  if (
    currentUser.role === 'FLEET_MANAGER' &&
    rating.ratingType === 'DELIVERY_PARTNER'
  ) {
    const partner = await DeliveryPartner.findOne({
      _id: rating.targetId,
      'registeredBy.id': currentUser._id,
    });
    if (partner) isFleetManagerOfPartner = true;
  }

  if (
    !isAdmin &&
    !isReviewer &&
    !isTarget &&
    !isProductOwner &&
    !isFleetManagerOfPartner
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'You do not have permission to view this rating detail',
    );
  }

  return rating;
};

const getRatingSummary = async (currentUser: AuthUser) => {
  const myProducts = await Product.find({
    vendorId: currentUser._id,
    isDeleted: false,
  }).select('_id');

  const productIds = myProducts.map((p) => p._id);

  const allTargetIds = [
    new mongoose.Types.ObjectId(currentUser._id),
    ...productIds,
  ];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const stats = await Rating.aggregate([
    {
      $match: {
        targetId: { $in: allTargetIds },
      },
    },
    {
      $facet: {
        overallStats: [
          {
            $group: {
              _id: null,
              totalRatings: { $sum: 1 },
              avgRating: { $avg: '$rating' },

              // star rating
              fiveStar: {
                $sum: { $cond: [{ $eq: [{ $floor: '$rating' }, 5] }, 1, 0] },
              },
              fourStar: {
                $sum: { $cond: [{ $eq: [{ $floor: '$rating' }, 4] }, 1, 0] },
              },
              threeStar: {
                $sum: { $cond: [{ $eq: [{ $floor: '$rating' }, 3] }, 1, 0] },
              },
              twoStar: {
                $sum: { $cond: [{ $eq: [{ $floor: '$rating' }, 2] }, 1, 0] },
              },
              oneStar: {
                $sum: { $cond: [{ $eq: [{ $floor: '$rating' }, 1] }, 1, 0] },
              },

              // sentiment
              positiveCount: {
                $sum: { $cond: [{ $eq: ['$sentiment', 'POSITIVE'] }, 1, 0] },
              },
              neutralCount: {
                $sum: { $cond: [{ $eq: ['$sentiment', 'NEUTRAL'] }, 1, 0] },
              },
              negativeCount: {
                $sum: { $cond: [{ $eq: ['$sentiment', 'NEGATIVE'] }, 1, 0] },
              },

              // subRatings

              foodQuality: { $avg: '$subRatings.foodQuality' },
              packaging: { $avg: '$subRatings.packaging' },
              deliverySpeed: { $avg: '$subRatings.deliverySpeed' },
              riderBehavior: { $avg: '$subRatings.riderBehavior' },
            },
          },
          {
            $project: {
              _id: 0,
              totalRatings: 1,
              avgRating: { $round: ['$avgRating', 1] },
              sentimentPercentages: {
                positive: {
                  $cond: [
                    '$totalRatings',
                    {
                      $multiply: [
                        { $divide: ['$positiveCount', '$totalRatings'] },
                        100,
                      ],
                    },
                    0,
                  ],
                },
                neutral: {
                  $cond: [
                    '$totalRatings',
                    {
                      $multiply: [
                        { $divide: ['$neutralCount', '$totalRatings'] },
                        100,
                      ],
                    },
                    0,
                  ],
                },
                negative: {
                  $cond: [
                    '$totalRatings',
                    {
                      $multiply: [
                        { $divide: ['$negativeCount', '$totalRatings'] },
                        100,
                      ],
                    },
                    0,
                  ],
                },
              },
              starPercentages: {
                five: {
                  $cond: [
                    '$totalRatings',
                    {
                      $multiply: [
                        { $divide: ['$fiveStar', '$totalRatings'] },
                        100,
                      ],
                    },
                    0,
                  ],
                },
                four: {
                  $cond: [
                    '$totalRatings',
                    {
                      $multiply: [
                        { $divide: ['$fourStar', '$totalRatings'] },
                        100,
                      ],
                    },
                    0,
                  ],
                },
                three: {
                  $cond: [
                    '$totalRatings',
                    {
                      $multiply: [
                        { $divide: ['$threeStar', '$totalRatings'] },
                        100,
                      ],
                    },
                    0,
                  ],
                },
                two: {
                  $cond: [
                    '$totalRatings',
                    {
                      $multiply: [
                        { $divide: ['$twoStar', '$totalRatings'] },
                        100,
                      ],
                    },
                    0,
                  ],
                },
                one: {
                  $cond: [
                    '$totalRatings',
                    {
                      $multiply: [
                        { $divide: ['$oneStar', '$totalRatings'] },
                        100,
                      ],
                    },
                    0,
                  ],
                },
              },
              categoryRatings: {
                foodQuality: { $round: [{ $ifNull: ['$foodQuality', 0] }, 1] },
                packaging: { $round: [{ $ifNull: ['$packaging', 0] }, 1] },
                deliverySpeed: {
                  $round: [{ $ifNull: ['$deliverySpeed', 0] }, 1],
                },
                riderBehavior: {
                  $round: [{ $ifNull: ['$riderBehavior', 0] }, 1],
                },
              },
            },
          },
        ],
        chartData: [
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: {
                $dateToString: { format: '%d %b, %Y', date: '$createdAt' },
              },
              avgRatings: { $avg: '$rating' },
            },
          },
          {
            $project: {
              _id: 0,
              date: '$_id',
              avgRatings: { $round: ['$avgRatings', 1] },
            },
          },
          { $sort: { date: 1 } },
        ],
      },
    },
  ]);

  return {
    summary: stats[0].overallStats[0] || {
      totalRatings: 0,
      avgRating: 0,
      sentimentPercentages: { positive: 0, neutral: 0, negative: 0 },
      starPercentages: { five: 0, four: 0, three: 0, two: 0, one: 0 },
      categoryRatings: {
        foodQuality: 0,
        packaging: 0,
        deliverySpeed: 0,
        riderBehavior: 0,
      },
    },
    chart: stats[0].chartData || [],
  };
};

export const RatingServices = {
  createRating,
  getAllRatings,
  getSingleRating,
  getRatingSummary,
};
