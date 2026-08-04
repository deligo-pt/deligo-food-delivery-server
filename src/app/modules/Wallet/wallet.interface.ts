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

  currentBalance: number; // CURRENT WITHDRAWABLE / PAYABLE / REFUND BALANCE
  lockedBalance: number; // RESERVED AGAINST AN IN-FLIGHT (PENDING) PAYOUT — NOT AVAILABLE FOR NEW SETTLEMENT
  lifetimeEarnings: number; // CUMULATIVE GROSS REVENUE / INFLOW
  currentTaxLiability: number; // TAX CURRENTLY PENDING FOR AT DECLARATION
  lifetimeTaxProcessed: number; // CUMULATIVE TAX PROCESSED SO FAR

  createdAt: Date;
  updatedAt: Date;
};
