export const notificationMessages = {
  NOTIFICATION_NOT_FOUND: {
    en: 'Notification record could not be found.',
    pt: 'O registro de notificação não pôde ser encontrado.',
  },
  UNAUTHORIZED_ACTION: {
    en: 'Access denied. You lack the necessary security privileges to perform this action.',
    pt: 'Acesso negado. Você não possui os privilégios de segurança necessários para realizar esta ação.',
  },
  MARKED_AS_READ_SUCCESS: {
    en: 'Notification status updated to read successfully.',
    pt: 'Status da notificação atualizado para lido com sucesso.',
  },
  MARK_ALL_AS_READ_SUCCESS: {
    en: 'All system notifications marked as read successfully.',
    pt: 'Todas as notificações do sistema foram marcadas como lidas com sucesso.',
  },
  NOTIFICATIONS_RETRIEVED_SUCCESS: {
    en: 'User notifications log loaded successfully.',
    pt: 'Log de notificações do usuário carregado com sucesso.',
  },
  ALL_NOTIFICATIONS_RETRIEVED_SUCCESS: {
    en: 'Global notifications matrix history loaded successfully.',
    pt: 'Histórico global da matriz de notificações carregado com sucesso.',
  },
  NOTIFICATION_NOT_FOUND_OR_ACCESS_DENIED: {
    en: 'The requested notification does not exist or you lack sufficient access permissions.',
    pt: 'A notificação solicitada não existe ou você não possui permissões de acesso suficientes.',
  },
  NOTIFICATION_DELETED_SUCCESS: {
    en: 'Notification instance removed from main view successfully.',
    pt: 'Instância de notificação removida da visualização principal com sucesso.',
  },
  NO_NOTIFICATIONS_SELECTED: {
    en: 'Operation aborted. No notification records were selected.',
    pt: 'Operação abortada. Nenhum registro de notificação foi selecionado.',
  },
  NOTIFICATIONS_DELETED_COUNT_SUCCESS: {
    en: (vars: { count: number }) =>
      `${vars.count} notifications removed from active view successfully.`,
    pt: (vars: { count: number }) =>
      `${vars.count} notificações removidas da visualização ativa com sucesso.`,
  },
  ONLY_SUPER_ADMIN_PERMANENT_DELETE: {
    en: 'Access denied. Permanent data deletion operations are restricted to Super Administrators only.',
    pt: 'Acesso negado. Operações de exclusão permanente de dados são restritas apenas a Super Administradores.',
  },
  MUST_SOFT_DELETE_BEFORE_PERMANENT: {
    en: 'Data policy violation. Notification must undergo soft deletion before execution of a permanent purge.',
    pt: 'Violação de política de dados. A notificação deve passar por exclusão lógica antes da execução de uma eliminação permanente.',
  },
  NOTIFICATION_PERMANENT_DELETE_SUCCESS: {
    en: 'Notification record permanently purged from storage architecture.',
    pt: 'Registro de notificação eliminado permanentemente da arquitetura de armazenamento.',
  },
  SELECTED_MUST_BE_SOFT_DELETED_FIRST: {
    en: 'The chosen notifications must be soft deleted before they can be permanently purged.',
    pt: 'As notificações escolhidas devem passar por exclusão lógica antes de poderem ser eliminadas permanentemente.',
  },
  NOTIFICATIONS_PERMANENT_DELETED_COUNT_SUCCESS: {
    en: (vars: { count: number }) =>
      `${vars.count} notifications permanently purged from storage arrays successfully.`,
    pt: (vars: { count: number }) =>
      `${vars.count} notificações eliminadas permanentemente das matrizes de armazenamento com sucesso.`,
  },
  NO_SOFT_DELETED_FOUND_FOR_PERMANENT: {
    en: 'Search complete. No soft-deleted notification instances found eligible for permanent deletion.',
    pt: 'Busca concluída. Nenhuma instância de notificação excluída logicamente foi encontrada elegível para exclusão permanente.',
  },
  BROADCAST_PROCESSING_STARTED: {
    en: 'Mass broadcast dispatch sequence initialized successfully.',
    pt: 'Sequência de envio de transmissão em massa inicializada com sucesso.',
  },
} as const;
