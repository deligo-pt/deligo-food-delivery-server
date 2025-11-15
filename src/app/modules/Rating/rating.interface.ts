export type TRating = {
  _id?: string;
  ratingType: 'DELIVERY_PARTNER' | 'PRODUCT' | 'FLEET_MANAGER' | 'VENDOR';
  rating: number;
  review?: string;

  reviewerId: string;

  deliveryPartnerId?: string;
  productId?: string;
  fleetManagerId?: string;
  vendorId?: string;

  orderId?: string;
  createdAt: Date;
  updatedAt: Date;
};
