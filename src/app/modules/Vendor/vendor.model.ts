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
    businessDetails: {
      businessName: { type: String, required: true },
      businessType: { type: String, required: true },
      businessLicenseNumber: { type: String, required: true },
      NIF: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      location: {
        address: { type: String, required: true },
        latitude: { type: Number },
        longitude: { type: Number },
      },
      openingHours: { type: String, required: true },
      closingHours: { type: String, required: true },
      closingDays: { type: [String], required: true },
    },
    bankDetails: {
      bankName: { type: String, required: true },
      accountHolderName: { type: String, required: true },
      iban: { type: String, required: true },
      swiftCode: { type: String, required: true },
    },
    documents: {
      businessLicenseDoc: { type: String, required: true },
      taxDoc: { type: String, required: true },
      idProof: { type: String, required: true },
      storePhoto: { type: String, required: true },
      menuUpload: { type: String, required: true },
    },
  },
  {
    timestamps: true,
    virtuals: true,
  }
);

export const Vendor = model<TVendor>('Vendor', vendorSchema);
