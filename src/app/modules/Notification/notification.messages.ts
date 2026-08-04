export const notificationMessages = {
  MARKED_AS_READ_SUCCESS: {
    en: 'Notification marked as read.',
    pt: 'Notificação marcada como lida.',
  },
  MARK_ALL_AS_READ_SUCCESS: {
    en: 'All notifications marked as read.',
    pt: 'Todas as notificações foram marcadas como lidas.',
  },
  NOTIFICATION_NOT_FOUND_OR_ACCESS_DENIED: {
    en: 'Notification not found or access denied.',
    pt: 'Notificação não encontrada ou acesso negado.',
  },
  NO_NOTIFICATIONS_SELECTED: {
    en: 'Please select at least one notification.',
    pt: 'Por favor, selecione pelo menos uma notificação.',
  },
  NOTIFICATIONS_DELETED_COUNT_SUCCESS: {
    en: (vars: { count: number }) =>
      `${vars.count} notifications removed successfully.`,
    pt: (vars: { count: number }) =>
      `${vars.count} notificações removidas com sucesso.`,
  },
  MUST_SOFT_DELETE_BEFORE_PERMANENT: {
    en: 'This item must be deactivated before it can be permanently deleted.',
    pt: 'Este item deve ser desativado antes de poder ser excluído permanentemente.',
  },
  NOTIFICATIONS_PERMANENT_DELETED_COUNT_SUCCESS: {
    en: (vars: { count: number }) =>
      `${vars.count} ${vars.count === 1 ? 'notification' : 'notifications'} permanently deleted.`,
    pt: (vars: { count: number }) =>
      `${vars.count} ${vars.count === 1 ? 'notificação' : 'notificações'} eliminadas permanentemente.`,
  },
  NO_SOFT_DELETED_FOUND_FOR_PERMANENT: {
    en: 'No deactivated notifications found eligible for permanent deletion.',
    pt: 'Nenhuma notificação desativada foi encontrada elegível para exclusão permanente.',
  },
  BROADCAST_PROCESSING_STARTED: {
    en: 'Broadcast notification dispatch started successfully.',
    pt: 'Envio de notificação de transmissão iniciado com sucesso.',
  },
} as const;
