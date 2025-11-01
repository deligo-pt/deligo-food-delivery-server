/* eslint-disable no-useless-escape */
import { Schema, model } from 'mongoose';
import { TAgent } from './agent.interface';

const agentSchema = new Schema<TAgent>(
  {
    agentId: {
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
    companyDetails: {
      companyName: { type: String, default: '' },
      companyLicenseNumber: { type: String, default: '' },
    },
    companyLocation: {
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
      idProof: { type: String, default: '' },
      companyLicense: { type: String, default: '' },
      profilePhoto: { type: String, default: '' },
    },
    operationalData: {
      noOfDrivers: { type: Number, default: null },
    },
  },
  {
    timestamps: true,
    virtuals: true,
  }
);

export const Agent = model<TAgent>('Agent', agentSchema);
