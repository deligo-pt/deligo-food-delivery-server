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
  const exists = await Rating.findOne({
    orderId: payload.orderId,
    reviewerId: currentUser._id,
    ratingType: payload.ratingType,
  });

  if (exists) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You have already submitted a rating for this category in this order.',
    );
  }

  const reviewerModel =
    ROLE_COLLECTION_MAP[currentUser.role as keyof typeof ROLE_COLLECTION_MAP];
  payload.reviewerId = currentUser._id;
  payload.reviewerModel = reviewerModel as TRefModel;

  const existsOrder = await Order.findById(payload.orderId);
  if (!existsOrder) {
    throw new AppError(httpStatus.NOT_FOUND, 'Order not found');
  }

  if (payload.ratingType === 'PRODUCT') {
    if (!existsOrder.items || existsOrder.items.length === 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'No products found in this order.',
      );
    }

    let sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' = 'NEUTRAL';
    if (payload.rating >= 4) sentiment = 'POSITIVE';
    else if (payload.rating <= 2) sentiment = 'NEGATIVE';
    const productRatings = existsOrder.items.map((item) => ({
      ...payload,
      sentiment,
      targetId: item.productId,
      targetModel: 'Product' as TRefModel,
      productId: item.productId,
    }));

    const result = await Rating.insertMany(productRatings);

    const updatePromises = existsOrder.items.map((item) =>
      calcAndUpdateProduct(item.productId.toString()),
    );
    await Promise.all(updatePromises);
    await calcAndUpdateVendorAllProductStats(existsOrder.vendorId.toString());

    return result;
  } else {
    let targetedUser;

    if (payload.ratingType === 'DELIVERY_PARTNER') {
      targetedUser = await DeliveryPartner.findById(
        existsOrder.deliveryPartnerId,
      );
    }

    if (!targetedUser) {
      throw new AppError(httpStatus.NOT_FOUND, 'Targeted user not found');
    }

    const targetModel =
      ROLE_COLLECTION_MAP[
        targetedUser?.role as keyof typeof ROLE_COLLECTION_MAP
      ];
    payload.targetId = new mongoose.Types.ObjectId(targetedUser._id);
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
  getRatingSummary,
};
