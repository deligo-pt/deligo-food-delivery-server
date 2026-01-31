import { model, Schema } from 'mongoose';
import { TSponsorship } from './sponsorships.interface';

const sponsorshipSchema = new Schema<TSponsorship>(
  {
    sponsorName: {
      type: String,
      required: [true, 'Sponsor name is required'],
      trim: true,
    },
    sponsorType: {
      type: String,
      enum: {
        values: ['Ads', 'Offer', 'Other'],
        message: '{VALUE} is not a valid sponsor type',
      },
      required: [true, 'Sponsor type is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    bannerImage: {
      type: String,
      required: [true, 'Banner image is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export const Sponsorship = model<TSponsorship>(
  'Sponsorship',
  sponsorshipSchema,
);
