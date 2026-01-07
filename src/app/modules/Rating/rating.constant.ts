import mongoose from 'mongoose';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';
import { FleetManager } from '../Fleet-Manager/fleet-manager.model';
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

export const calcAndUpdateVendor = async (vendorId: string) => {
  const stats = await getRatingStats(vendorId, 'VENDOR');

  const average = stats[0]?.averageRating ?? 0;
  const totalReviews = stats[0]?.totalReviews ?? 0;

  await Vendor.findByIdAndUpdate(vendorId, {
    $set: {
      'rating.average': Number(average.toFixed(1)),
      'rating.totalReviews': totalReviews,
    },
  });
};

export const calcAndUpdateFleetManager = async (fmId: string) => {
  const stats = await getRatingStats(fmId, 'FLEET_MANAGER');

  const average = stats[0]?.averageRating ?? 0;
  const totalReviews = stats[0]?.totalReviews ?? 0;

  await FleetManager.findByIdAndUpdate(fmId, {
    $set: {
      'rating.average': Number(average.toFixed(1)),
      'rating.totalReviews': totalReviews,
    },
  });
};
