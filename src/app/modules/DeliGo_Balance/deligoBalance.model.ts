import { Schema, model } from 'mongoose';
import { TDeliGoBalance } from './deligoBalance.interface';

const deliGoBalanceSchema = new Schema<TDeliGoBalance>(
  {
    userObjectId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'userModel',
      unique: true,
    },
    userModel: {
      type: String,
      required: true,
      enum: ['Customer', 'Vendor', 'DeliveryPartner', 'FleetManager'],
    },
    totalBalance: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative'],
    },
    pendingBalance: {
      type: Number,
      default: 0,
    },
    totalEarned: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  },
);

deliGoBalanceSchema.index({ userObjectId: 1, userModel: 1 });

export const DeliGoBalance = model<TDeliGoBalance>(
  'DeliGoBalance',
  deliGoBalanceSchema,
);
