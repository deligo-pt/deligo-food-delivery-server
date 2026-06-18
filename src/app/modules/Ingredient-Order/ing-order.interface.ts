import { Types } from 'mongoose';
import { TPaymentMethod } from '../../constant/GlobalInterface/payment.interface';

export type TOrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED';
export type TPaymentStatus = 'PROCESSING' | 'PAID';

export type TIngredientOrderDetail = {
  ingredient: Types.ObjectId;
  name: string; // Snapshot: Ingredient name at the time of order
  sku: string; // Snapshot: SKU for SAF-T billing auditing
  unit: string; // Snapshot: unit (e.g., kg, litre)
  quantity: number; // Ordered quantity
  pricePerUnit: number; // Snapshot: Net Price before tax
  taxRate: number; // Snapshot: Portugal Tax Rate percentage (e.g., 6, 23)
  taxAmount: number; // Calculated tax for this item quantity: (price * quantity) * (taxRate/100)
  totalAmount: number; // Gross amount for this item: (Price * Qty) + TaxAmount
};
export type TIngredientOrder = {
  orderId?: string;
  vendorId: Types.ObjectId;
  adminId?: Types.ObjectId;
  orderDetails: TIngredientOrderDetail[];
  deliveryAddress: {
    label: string;
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    longitude: number;
    latitude: number;
    geoAccuracy: number;
    detailedAddress: string;
  };
  delivery: {
    charge: number;
    vatRate: number;
    vatAmount: number;
    totalDeliveryCharge: number;
  };

  orderCalculation: {
    totalOriginalPrice: number;
    totalProductDiscount: number;
    taxableAmount: number;
    totalTaxAmount: number;
  };

  grandTotal: number;

  paymentMethod: TPaymentMethod;
  orderStatus: TOrderStatus;
  paymentStatus: TPaymentStatus;

  statusHistory: {
    shippedAt?: Date;
    deliveredAt?: Date;
  };

  transactionId?: string;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};
