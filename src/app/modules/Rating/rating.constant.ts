import mongoose, { ClientSession } from 'mongoose';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';
import { Product } from '../Product/product.model';
import { Vendor } from '../Vendor/vendor.model';
import { Rating } from './rating.model';

const getRatingStats = async (
  targetId: string,
  ratingType: string,
  session?: ClientSession,
) => {
  return await Rating.aggregate([
    {
      $match: {
        targetId: new mongoose.Types.ObjectId(targetId),
        ratingType: ratingType,
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]).session(session || null);
};

// --- Exported Functions ---

export const calcAndUpdateDeliveryPartner = async (
  deliveryPartnerId: string,
  session?: ClientSession,
) => {
  const stats = await getRatingStats(
    deliveryPartnerId,
    'DELIVERY_PARTNER',
    session,
  );

  const average = stats[0]?.averageRating ?? 0;
  const totalReviews = stats[0]?.totalReviews ?? 0;

  await DeliveryPartner.findByIdAndUpdate(
    deliveryPartnerId,
    {
      $set: {
        'rating.average': Number(average.toFixed(1)),
        'rating.totalReviews': totalReviews,
      },
    },
    { session: session || null },
  );
};

export const calcAndUpdateProduct = async (
  productId: string,
  session?: ClientSession,
) => {
  const stats = await getRatingStats(productId, 'PRODUCT', session);

  const average = stats[0]?.averageRating ?? 0;
  const totalReviews = stats[0]?.totalReviews ?? 0;

  await Product.findByIdAndUpdate(
    productId,
    {
      $set: {
        'rating.average': Number(average.toFixed(1)),
        'rating.totalReviews': totalReviews,
      },
    },
    { session: session || null },
  );
};

export const calcAndUpdateVendorAllProductStats = async (
  vendorId: string,
  session?: ClientSession,
) => {
  const productStats = await Product.aggregate([
    {
      $match: {
        vendorId: new mongoose.Types.ObjectId(vendorId),
        isDeleted: false,
        'rating.totalReviews': { $gt: 0 },
      },
    },
    {
      $group: {
        _id: null,

        overallAverage: { $avg: '$rating.average' },

        overallTotalReviews: { $sum: '$rating.totalReviews' },
      },
    },
  ]).session(session || null);

  const average = productStats[0]?.overallAverage ?? 0;
  const totalReviews = productStats[0]?.overallTotalReviews ?? 0;

  await Vendor.findByIdAndUpdate(
    vendorId,
    {
      $set: {
        'rating.average': Number(average.toFixed(1)),
        'rating.totalReviews': totalReviews,
      },
    },
    { session: session || null },
  );
};
