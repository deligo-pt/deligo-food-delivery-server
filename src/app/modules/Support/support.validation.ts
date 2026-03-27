import { z } from 'zod';

const sendMessageSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'Message cannot be empty'),
    messageType: z
      .enum(['TEXT', 'IMAGE', 'AUDIO', 'LOCATION', 'SYSTEM'])
      .default('TEXT'),
    attachments: z.array(z.string().url()).optional(),
    category: z
      .enum(['ORDER_ISSUE', 'PAYMENT', 'IVA_INVOICE', 'TECHNICAL', 'GENERAL'])
      .optional(),
    // Adding referenceId validation for orders or other linked entities
    referenceId: z.string().optional(),
  }),
});

export const SupportValidation = { sendMessageSchema };
