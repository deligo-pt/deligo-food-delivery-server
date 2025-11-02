import { model, Schema } from 'mongoose';
import { TOrder } from './order.interface';

const orderSchema = new Schema<TOrder>(
  {
    customerId: { type: String, required: true },
    vendorId: { type: String, required: true },
    items: [
      {
        productId: { type: String, required: true },
        quantity: { type: Number, required: true },
      },
    ],
    totalPrice: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    orderStatus: {
      type: String,
      enum: [
        'pending',
        'accepted',
        'assigned',
        'picked',
        'delivered',
        'canceled',
      ],
      default: 'pending',
    },
    deliveryAddress: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

// Export Model
export const Order = model<TOrder>('Order', orderSchema);
