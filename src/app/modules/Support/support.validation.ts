import { z } from 'zod';

const sendMessageSchema = z.object({
  body: z.object({
    room: z
      .string({ required_error: 'Room is required' })
      .min(1, 'Room must be at least 1 character long'),
    message: z
      .string({ required_error: 'Message is required' })
      .min(1, 'Message must be at least 1 character long'),
    attachments: z.array(z.string()).optional(),
  }),
});

const readMessageSchema = z.object({
  body: z.object({
    room: z.string(),
  }),
});

export const SupportValidation = {
  sendMessageSchema,
  readMessageSchema,
};
