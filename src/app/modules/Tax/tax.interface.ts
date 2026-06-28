import mongoose from 'mongoose';
import { TLocalizedText } from '../../constant/GlobalInterface/language.interface';

export type TTax = {
  _id: mongoose.Types.ObjectId;
  taxName: TLocalizedText;
  description: TLocalizedText;
  taxCode: 'NOR' | 'INT' | 'RED' | 'ISE';
  taxRate: 6 | 13 | 23 | 0; // 23, 13, 6
  countryID: string; // "PRT"
  TaxRegionID?: string;
  taxGroupID: string; // "IVA"
  taxExemptionCode?: string;
  taxExemptionReason?: TLocalizedText;
  isActive: boolean;
  isDeleted: boolean;
};
