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
  vendorId: mongoose.Types.ObjectId;
  name: string;
  image?: string;
  addons?: {
    optionId: string;
    name: string;
    price: number;
    quantity: number;
    taxRate: number;
    taxAmount: number;
  }[];
  quantity: number;

  originalPrice: number;
  discountAmount: number;
  price: number;

  productTotalBeforeTax?: number;
  productTaxAmount?: number;

  totalBeforeTax?: number;
  taxRate?: number;
  taxAmount?: number;
  subtotal: number;
};

export type TAppliedOfferSnapshot = {
  offerId: mongoose.Types.ObjectId;
  title: string;
  offerType: OfferType;
  discountValue?: number;
  maxDiscountAmount?: number;
  code?: string;
};
