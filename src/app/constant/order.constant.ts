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
    originalPrice: number;
    promoDiscountAmount: number;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    taxRate: number;
    taxAmount: number;
  }[];

  productPricing: {
    originalPrice: number;
    productDiscountAmount: number;
    priceAfterProductDiscount: number;
    promoDiscountAmount: number;
    unitPrice: number;
    lineTotal: number;
    taxRate: number;
    taxAmount: number;
  };

  itemSummary: {
    quantity: number;
    totalBeforeTax: number;
    totalTaxAmount: number;
    totalPromoDiscount: number;
    totalProductDiscount: number;
    grandTotal: number;
  };

  commission: {
    deliGoCommissionRate: number;
    deliGoCommissionAmount: number;
    deliGoCommissionVatRate: number;
    deliGoCommissionVatAmount: number;
  };

  vendor: {
    vendorEarningsWithoutTax: number;
    payableTax: number;
    vendorNetEarnings: number;
  };
};
