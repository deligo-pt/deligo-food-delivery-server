import { Types } from "mongoose";

export type TOrderStatus = 'CONFIRMED' | 'SHIPPED' | 'DELIVERED';
export type TPaymentStatus = 'PROCESSING' | 'PAID'; // | 'FAILED' | 'REFUNDED';
export type TPaymentMethod = 'CARD' | 'MB_WAY' | 'APPLE_PAY' | 'PAYPAL' | 'GOOGLE_PAY' | 'OTHER';

export interface IIngredientOrderDetail {
    totalQuantity: number;
    totalAmount: number;
    ingredient: Types.ObjectId; // it will have everything related ingredient
}

export interface IIngredientOrder {
    vendor: Types.ObjectId;
    admin?: Types.ObjectId;
    orderId: string;
    orderDetails: IIngredientOrderDetail;
    deliveryAddress: {
        label: string,
        street: string,
        city: string,
        state: string,
        country: string,
        postalCode: string,
        longitude: number,
        latitude: number,
        geoAccuracy: number,
        detailedAddress: string,
    },
    delivery: {
        charge: number;
        distance: number;
        estimatedTime: number;
    };

    grandTotal: number;
    paymentMethod: TPaymentMethod;

    orderStatus: TOrderStatus;
    paymentStatus: TPaymentStatus;

    transactionId?: string;
    isPaid?: boolean;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}