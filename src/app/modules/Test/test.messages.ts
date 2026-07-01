export const testMessages = {
  FCM_TOKEN_REQUIRED: {
    en: 'FCM Token is required',
    pt: 'O token FCM é obrigatório',
  },
  FCM_FAILED: {
    en: (vars: { error: string }) => `FCM Failed: ${vars.error}`,
    pt: (vars: { error: string }) => `Falha no FCM: ${vars.error}`,
  },
  NOTIFICATION_SENT_SUCCESS: {
    en: 'Notification sent successfully',
    pt: 'Notificação enviada com sucesso',
  },
} as const;
