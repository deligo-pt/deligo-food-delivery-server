import { z } from 'zod';

export const contactValidation = z.object({
  body: z
    .object({
      name: z.string().trim().min(3, 'Name must be at least 3 characters'),

      sender: z
        .string()
        .trim()
        .email('Sender must be a valid email address')
        .toLowerCase(),

      message: z
        .string()
        .min(10, 'Message must be at least 10 characters')
        .max(1000, 'Message must be at most 1000 characters'),
    })
    .strict(),
});
