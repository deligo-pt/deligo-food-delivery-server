import mongoose from 'mongoose';
import { TLocalizedText } from '../../constant/GlobalInterface/language.interface';

export type TAddonOption = {
  name: TLocalizedText;
  sku: string;
  price: number;
  tax: mongoose.Types.ObjectId;
  isActive: boolean;
};

export type TAddonGroup = {
  _id?: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  title: TLocalizedText;
  minSelectable: number;
  maxSelectable: number;
  options: TAddonOption[];
  isActive: boolean;
  isDeleted: boolean;
};
