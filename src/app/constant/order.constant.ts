import mongoose from 'mongoose';
import { OfferType } from '../modules/Offer/offer.constant';

export type TAddress = {
  label?: 'Home' | 'Work' | 'Other';
  street: string;
  city: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  geoAccuracy?: number;
};

export type TOrderItemSnapshot = {
  productId: mongoose.Types.ObjectId;
  name: string;
  image?: string;
  variantName?: string;
  addons?: {
    name: string;
    price: number;
    quantity: number;
  }[];
  quantity: number;
  price: number;

  subtotal: number;
  vendorId: mongoose.Types.ObjectId;
  taxRate?: number;
};

export type TAppliedOfferSnapshot = {
  offerId: mongoose.Types.ObjectId;
  title: string;
  offerType: OfferType;
  discountValue?: number;
  maxDiscountAmount?: number;
  code?: string;
};
