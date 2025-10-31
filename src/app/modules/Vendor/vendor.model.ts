/* eslint-disable no-useless-escape */
import { Schema, model } from 'mongoose';
import { TVendor } from './vendor.interface';

const vendorSchema = new Schema<TVendor>(
  {
    vendorId: {
      type: String,
      required: true,
      unique: true,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    businessDetails: {
      businessName: { type: String, default: '' },
      businessType: { type: String, default: '' },
      businessLicenseNumber: { type: String, default: '' },
      NIF: { type: String, default: '' },
      noOfBranch: { type: Number, default: null },
      openingHours: { type: String, default: '' },
      closingHours: { type: String, default: '' },
      closingDays: { type: [String], default: [] },
    },
    businessLocation: {
      streetAddress: { type: String, default: '' },
      streetNumber: { type: String, default: '' },
      city: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    bankDetails: {
      bankName: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      iban: { type: String, default: '' },
      swiftCode: { type: String, default: '' },
    },
    documents: {
      businessLicenseDoc: { type: String, default: '' },
      taxDoc: { type: String, default: '' },
      idProof: { type: String, default: '' },
      storePhoto: { type: String, default: '' },
      menuUpload: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
    virtuals: true,
  }
);

export const Vendor = model<TVendor>('Vendor', vendorSchema);
