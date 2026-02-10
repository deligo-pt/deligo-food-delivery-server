import mongoose from 'mongoose';

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
  detailedAddress?: string;
};

export type TOrderItemSnapshot = {
  productId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  name: string;
  image?: string;
  hasVariations: boolean;
  variationSku?: string | null;
  addons?: {
    optionId: string;
    name: string;
    sku: string;
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

  taxRate: number;
  taxAmount: number;
  subtotal: number;

  commissionRate: number;
  commissionAmount: number;
  commissionVatRate: number;
  commissionVatAmount: number;

  vendorNetEarnings: number;
};
