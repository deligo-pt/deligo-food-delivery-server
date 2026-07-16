import mongoose from 'mongoose';

export type TWallet = {
  walletId: string;
  userId: mongoose.Types.ObjectId | string;
  userModel:
    | 'Admin'
    | 'Customer'
    | 'Vendor'
    | 'FleetManager'
    | 'DeliveryPartner';
  lastSettlementDate?: Date;

  // ==========================================================
  // ৪টি ইউনিভার্সাল লেজার কলাম (মিনিমালিস্ট কোর)
  // ==========================================================
  currentBalance: number; // CURRENT WITHDRAWABLE / PAYABLE / REFUND BALANCE
  lifetimeEarnings: number; // CUMULATIVE GROSS REVENUE / INFLOW
  currentTaxLiability: number; // TAX CURRENTLY PENDING FOR AT DECLARATION
  lifetimeTaxProcessed: number; // CUMULATIVE TAX PROCESSED SO FAR

  createdAt: Date;
  updatedAt: Date;
};
