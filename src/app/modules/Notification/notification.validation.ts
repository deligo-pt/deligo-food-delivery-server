import { z } from 'zod';
import { notificationTypes } from './notification.model';

const deleteMultipleNotificationsValidationSchema = z.object({
  body: z.object({
    notificationIds: z
      .array(z.string())
      .min(1, 'At least one notification ID is required'),
  }),
});

const sendBroadcastNotificationValidationSchema = z.object({
  body: z.object({
    communicationType: z.enum(['EMAIL', 'PUSH', 'BOTH'], {
      required_error: 'Communication type is required (EMAIL, PUSH, or BOTH)',
    }),
    targetAudience: z
      .array(z.string(), {
        required_error: 'Target audience is required',
      })
      .nonempty('At least one target audience must be selected'),

    customUserIds: z.array(z.string()).optional(),

    title: z
      .string({
        required_error: 'Notification title is required',
      })
      .min(1, 'Title cannot be empty')
      .max(100, 'Title is too long'),

    body: z
      .string({
        required_error: 'Message body is required',
      })
      .min(1, 'Message body cannot be empty')
      .max(1000, 'Message is too long'),

    data: z.record(z.string()).optional(),

    type: z.enum(notificationTypes as [string, ...string[]]).optional(),
  }),
});

export const NotificationValidation = {
  deleteMultipleNotificationsValidationSchema,
  sendBroadcastNotificationValidationSchema,
};
