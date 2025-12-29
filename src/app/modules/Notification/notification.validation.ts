import { z } from 'zod';

const deleteMultipleNotificationsValidationSchema = z.object({
  body: z.object({
    notificationIds: z
      .array(z.string())
      .min(1, 'At least one notification ID is required'),
  }),
});

export const NotificationValidation = {
  deleteMultipleNotificationsValidationSchema,
};
