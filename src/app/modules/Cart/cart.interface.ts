import mongoose from 'mongoose';
import { TLocalizedText } from '../../constant/GlobalInterface/language.interface';

export type TCartAddon = {
  name: TLocalizedText;
  sku: string;
  originalPrice: number;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  taxRate: number;
  taxAmount: number;
};

export type TCartItem = {
  productId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  name: TLocalizedText;
  image?: string;
  hasVariations: boolean;
  variationSku?: string | null;
  isActive: boolean;
  addons: TCartAddon[];

  productPricing: {
    originalPrice: number;
    productDiscountAmount: number;
    discountType: 'PERCENTAGE' | 'FLAT';
    unitPrice: number;
    lineTotal: number;
    taxRate: number;
    taxAmount: number;
  };

  itemSummary: {
    quantity: number;
    totalTaxAmount: number;
    totalProductDiscount: number;
    grandTotal: number;
  };
};

export type TCartItemInput = {
  items: {
    productId: string;
    quantity?: number;
    variationSku?: string;
    addons?: {
      optionSku: string;
      quantity: number;
    }[];
  }[];
};

export type TCart = {
  customerId: mongoose.Types.ObjectId;
  items: TCartItem[];
  totalItems: number;
  totalQuantity: number;
  cartCalculation: {
    totalOriginalPrice: number;
    totalProductDiscount: number;
    totalTaxAmount: number;
    grandTotal: number;
  };
  status?: 'active' | 'abandoned';
  isNotified?: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};
