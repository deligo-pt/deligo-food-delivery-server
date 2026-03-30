import { Schema, model } from 'mongoose';
import { IIngredientOrder, IIngredientOrderDetail } from './ing-order.interface';

const ingredientOrderDetailSchema = new Schema<IIngredientOrderDetail>({
    totalQuantity: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    ingredient: { type: Schema.Types.ObjectId, ref: 'Ingredient', required: true },
}, { _id: false });

const ingredientOrderSchema = new Schema<IIngredientOrder>(
    {
        vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
        admin: { type: Schema.Types.ObjectId, ref: 'Admin' },
        orderId: { type: String },
        orderDetails: { type: ingredientOrderDetailSchema, required: true },
        deliveryAddress: {
            label: { type: String },
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String },
            country: { type: String },
            postalCode: { type: String },
            longitude: { type: Number, required: true },
            latitude: { type: Number, required: true },
            geoAccuracy: { type: Number },
            detailedAddress: {
                type: String,
            },
        },
        delivery: {
            charge: { type: Number, required: true },
            distance: { type: Number, required: true },
            estimatedTime: { type: Number },
        },

        grandTotal: { type: Number, required: true },
        paymentMethod: {
            type: String,
            enum: ['CARD', 'MB_WAY', 'APPLE_PAY', 'PAYPAL', 'GOOGLE_PAY', 'OTHER'],
            required: true,
        },

        orderStatus: {
            type: String,
            enum: ['CONFIRMED', 'SHIPPED', 'DELIVERED'],
            default: 'CONFIRMED',
        },

        paymentStatus: {
            type: String,
            enum: ['PROCESSING', 'PAID'], // 'FAILED', 'REFUNDED' can be added later
            default: 'PROCESSING',
        },

        transactionId: { type: String },
        isPaid: { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

export const IngredientOrder = model<IIngredientOrder>('IngredientOrder', ingredientOrderSchema);