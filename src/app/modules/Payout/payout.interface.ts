import mongoose from 'mongoose';

export type TPayout = {
  userId: mongoose.Types.ObjectId;
  userModel: 'Vendor' | 'DeliveryPartner' | 'FleetManager';

  senderId: mongoose.Types.ObjectId;
  senderModel: 'Admin' | 'FleetManager';

  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';
  paymentMethod: 'BANK_TRANSFER' | 'MOBILE_BANKING' | 'CASH';
  bankDetails?: {
    bankName: string;
    accountHolderName: string;
    iban?: string;
    swiftCode?: string;
  };
  bankReferenceId?: string;
  payoutProof?: string;
  remarks?: string;
};
