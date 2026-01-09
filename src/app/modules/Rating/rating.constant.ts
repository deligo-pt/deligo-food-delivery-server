import mongoose from 'mongoose';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';
import { Product } from '../Product/product.model';
import { Vendor } from '../Vendor/vendor.model';
import { Rating } from './rating.model';

const getRatingStats = async (targetId: string, ratingType: string) => {
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
  ]);
};

// --- Exported Functions ---

export const calcAndUpdateDeliveryPartner = async (
  deliveryPartnerId: string
) => {
  const stats = await getRatingStats(deliveryPartnerId, 'DELIVERY_PARTNER');

  const average = stats[0]?.averageRating ?? 0;
  const totalReviews = stats[0]?.totalReviews ?? 0;

  await DeliveryPartner.findByIdAndUpdate(deliveryPartnerId, {
    $set: {
      'rating.average': Number(average.toFixed(1)),
      'rating.totalReviews': totalReviews,
    },
  });
};

export const calcAndUpdateProduct = async (productId: string) => {
  const stats = await getRatingStats(productId, 'PRODUCT');

  const average = stats[0]?.averageRating ?? 0;
  const totalReviews = stats[0]?.totalReviews ?? 0;

  await Product.findByIdAndUpdate(productId, {
    $set: {
      'rating.average': Number(average.toFixed(1)),
      'rating.totalReviews': totalReviews,
    },
  });
};

export const calcAndUpdateVendorAllProductStats = async (vendorId: string) => {
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
  ]);

  const average = productStats[0]?.overallAverage ?? 0;
  const totalReviews = productStats[0]?.overallTotalReviews ?? 0;

  await Vendor.findByIdAndUpdate(vendorId, {
    $set: {
      'rating.average': Number(average.toFixed(1)),
      'rating.totalReviews': totalReviews,
    },
  });
};
