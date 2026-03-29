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
      .default('GENERAL'),
    // Adding referenceId validation for orders or other linked entities
    referenceOrderId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Order ID format')
      .optional(),
    targetUserObjectId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Object ID')
      .optional(),
    targetUserId: z.string().optional(),
    targetUserModel: z
      .enum(['Customer', 'Vendor', 'Admin', 'DeliveryPartner', 'FleetManager'])
      .optional(),
  }),
});

export const SupportValidation = { sendMessageSchema };
