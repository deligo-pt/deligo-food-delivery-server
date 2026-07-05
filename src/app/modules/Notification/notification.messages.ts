export const notificationMessages = {
  NOTIFICATION_NOT_FOUND: {
    en: 'The requested notification could not be found.',
    pt: 'A notificação solicitada não pôde ser encontrada.',
  },
  UNAUTHORIZED_ACTION: {
    en: 'Access denied. You do not have permission to perform this action.',
    pt: 'Acesso negado. Você não tem permissão para realizar esta ação.',
  },
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
  NOTIFICATION_DELETED_SUCCESS: {
    en: 'Notification removed successfully.',
    pt: 'Notificação removida com sucesso.',
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
  ONLY_SUPER_ADMIN_PERMANENT_DELETE: {
    en: 'Access denied. Permanent deletion is restricted to Super Admins only.',
    pt: 'Acesso negado. A exclusão permanente é restrita apenas a Super Administradores.',
  },
  MUST_SOFT_DELETE_BEFORE_PERMANENT: {
    en: 'This item must be deactivated before it can be permanently deleted.',
    pt: 'Este item deve ser desativado antes de poder ser excluído permanentemente.',
  },
  NOTIFICATION_PERMANENT_DELETE_SUCCESS: {
    en: 'Notification permanently deleted from the system.',
    pt: 'Notificação excluída permanentemente do sistema.',
  },
  SELECTED_MUST_BE_SOFT_DELETED_FIRST: {
    en: 'The selected notifications must be deactivated before permanent deletion.',
    pt: 'As notificações selecionadas devem ser desativadas antes da exclusão permanente.',
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
