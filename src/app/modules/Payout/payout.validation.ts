import z from 'zod';

const InitiateSettlementValidationSchema = z.object({
  body: z
    .object({
      targetUserId: z.string({ required_error: 'Target user ID is required.' }),
    })
    .strict(),
});

const RejectPayoutValidationSchema = z.object({
  body: z
    .object({
      reason: z.string({ required_error: 'Reason is required.' }),
    })
    .strict(),
});

const FinalizeSettlementValidationSchema = z.object({
  body: z
    .object({
      bankReferenceId: z.string().min(1, 'Bank Reference ID is required.'),
      remarks: z.string().optional(),
    })
    .strict(),
});

export const PayoutValidation = {
  InitiateSettlementValidationSchema,
  RejectPayoutValidationSchema,
  FinalizeSettlementValidationSchema,
};
