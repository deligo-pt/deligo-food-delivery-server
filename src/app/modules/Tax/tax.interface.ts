import mongoose from 'mongoose';

export type TTax = {
  _id: mongoose.Types.ObjectId;
  taxName: string; // Sage Name: "IVA Normal", "IVA Intermédio"
  taxCode: 'NOR' | 'INT' | 'RED' | 'ISE'; // Sage Code: "NOR", "INT", "RED"
  taxRate: 6 | 13 | 23 | 0; // 23, 13, 6
  countryID: string; // "PRT"
  TaxRegionID?: string;
  taxGroupID: string; // "IVA"
  description: string;
  taxExemptionCode?: string;
  taxExemptionReason?: string;
  isActive: boolean;
  isDeleted: boolean;
};
