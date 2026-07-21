export const testMessages = {
  // --- Unique FCM & Notification Test Messages ---
  FCM_TOKEN_REQUIRED: {
    en: 'FCM verification token is required.',
    pt: 'O token de verificação FCM é obrigatório.',
  },
  FCM_FAILED: {
    en: (vars: { error: string }) =>
      `Push notification test failed: ${vars.error}`,
    pt: (vars: { error: string }) =>
      `Falha no teste de notificação push: ${vars.error}`,
  },
  NOTIFICATION_SENT_SUCCESS: {
    en: 'Test push notification sent successfully.',
    pt: 'Notificação push de teste enviada com sucesso.',
  },
} as const;
