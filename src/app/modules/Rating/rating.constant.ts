import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';
import { FleetManager } from '../Fleet-Manager/fleet-manager.model';
import { Product } from '../Product/product.model';
import { Vendor } from '../Vendor/vendor.model';
import { Rating } from './rating.model';

export const calcAndUpdateDeliveryPartner = async (
  deliveryPartnerId: string
) => {
  const stats = await Rating.aggregate([
    {
      $match: {
        ratingType: 'DELIVERY_PARTNER',
        deliveryPartnerId,
      },
    },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const avg = stats[0]?.avg ?? 0;
  const count = stats[0]?.count ?? 0;

  await DeliveryPartner.findByIdAndUpdate(deliveryPartnerId, {
    'operationalData.rating.average': avg,
    'operationalData.rating.totalReviews': count,
  }).lean();
};

export const calcAndUpdateProduct = async (productId: string) => {
  const stats = await Rating.aggregate([
    { $match: { ratingType: 'PRODUCT', productId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avg = stats[0]?.avg ?? 0;
  const count = stats[0]?.count ?? 0;

  await Product.findByIdAndUpdate(productId, {
    'rating.average': avg,
    'rating.totalReviews': count,
  }).lean();
};

export const calcAndUpdateVendor = async (vendorId: string) => {
  const stats = await Rating.aggregate([
    { $match: { ratingType: 'VENDOR', vendorId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avg = stats[0]?.avg ?? 0;
  const count = stats[0]?.count ?? 0;

  await Vendor.findByIdAndUpdate(vendorId, {
    'rating.average': avg,
    'rating.totalReviews': count,
  }).lean();
};

export const calcAndUpdateFleetManager = async (fmId: string) => {
  const stats = await Rating.aggregate([
    { $match: { ratingType: 'FLEET_MANAGER', fleetManagerId: fmId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avg = stats[0]?.avg ?? 0;
  const count = stats[0]?.count ?? 0;

  await FleetManager.findByIdAndUpdate(fmId, {
    'operationalData.rating.average': avg,
    'operationalData.rating.totalReviews': count,
  }).lean();
};
