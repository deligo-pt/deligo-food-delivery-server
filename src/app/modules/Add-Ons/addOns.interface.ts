import mongoose from 'mongoose';

export type TAddonOption = {
  name: string;
  price: number;
  tax: mongoose.Types.ObjectId;
  isActive: boolean;
};

export type TAddonGroup = {
  _id?: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  title: string;
  minSelectable: number;
  maxSelectable: number;
  options: TAddonOption[];
  isActive: boolean;
  isDeleted: boolean;
};
