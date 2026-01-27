import { model, Schema } from 'mongoose';
import { TSos } from './sos.interface';
import { USER_ROLE } from '../../constant/user.constant';

const sosSchema = new Schema<TSos>(
  {
    userId: {
      id: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'userId.model',
      },
      model: {
        type: String,
        enum: ['Vendor', 'FleetManager', 'DeliveryPartner'],
        required: true,
      },
      role: {
        type: String,
        enum: Object.values(USER_ROLE),
        required: true,
      },
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLE),
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INVESTIGATING', 'RESOLVED', 'FALSE_ALARM'],
      default: 'ACTIVE',
    },
    userNote: {
      type: String,
      trim: true,
      maxlength: [200, 'Note cannot exceed 200 characters'],
    },
    issueTags: [
      {
        type: String,
        enum: [
          'Accident',
          'Medical Emergency',
          'Fire',
          'Crime',
          'Natural Disaster',
          'Other',
        ],
      },
    ],
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    deviceSnapshot: {
      batteryLevel: { type: Number },
      deviceModel: { type: String },
      osVersion: { type: String },
      appVersion: { type: String },
      networkType: { type: String },
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  },
);

sosSchema.index({ location: '2dsphere' });

export const SosModel = model<TSos>('Sos', sosSchema);
