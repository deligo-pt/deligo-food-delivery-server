/* eslint-disable no-useless-escape */
import bcryptjs from 'bcryptjs';
import { Schema, model } from 'mongoose';
import { IVendorModel, TVendor } from './vendor.interface';

const vendorSchema = new Schema<TVendor, IVendorModel>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    businessDetails: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    virtuals: true,
  }
);

vendorSchema.statics.isVendorExistsByEmail = async function (userId: string) {
  return await Vendor.findOne({ userId }).select('+password');
};

vendorSchema.statics.isPasswordMatched = async function (
  plainTextPassword,
  hashedPassword
) {
  return await bcryptjs.compare(plainTextPassword, hashedPassword);
};

vendorSchema.statics.isJWTIssuedBeforePasswordChanged = function (
  passwordChangedTimestamp: number,
  jwtIssuedTimestamp: number
) {
  const passwordChangedTime =
    new Date(passwordChangedTimestamp).getTime() / 1000;
  return passwordChangedTime > jwtIssuedTimestamp;
};

export const Vendor = model<TVendor, IVendorModel>('Vendor', vendorSchema);
