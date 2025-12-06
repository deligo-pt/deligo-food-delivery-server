import { z } from 'zod';

const sendMessageSchema = z.object({
  body: z.object({
    room: z
      .string({ required_error: 'Room is required' })
      .min(1, 'Room must be at least 1 character long'),
    message: z
      .string({ required_error: 'Message is required' })
      .min(1, 'Message must be at least 1 character long'),
    attachments: z
      .array(z.string())
      .max(5, 'Attachments cannot exceed 5 files')
      .optional(),
    replyTo: z.string().optional().nullable(),
  }),
});

const readMessageSchema = z.object({
  params: z.object({
    room: z.string({ required_error: 'Room param is required' }).min(1),
  }),
});

export const SupportValidation = {
  sendMessageSchema,
  readMessageSchema,
};
