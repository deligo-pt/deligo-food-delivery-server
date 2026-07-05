export const pointsMessages = {
  POINTS_ALREADY_GRANTED_FOR_ORDER: {
    en: 'Points have already been added for this order.',
    pt: 'Os pontos já foram atribuídos para este pedido.',
  },
  ORDER_NOT_FOUND_SPECIFIED: {
    en: 'The specified order could not be found.',
    pt: 'O pedido especificado não foi encontrado.',
  },
  UNAUTHORIZED_ORDER_NOT_BELONG_TO_USER: {
    en: 'Access denied. This order belongs to another profile.',
    pt: 'Acesso negado. Este pedido pertence a outro perfil.',
  },
  UNAUTHORIZED_NOT_ASSIGNED_DELIVERY_PARTNER: {
    en: 'Access denied. You are not the assigned delivery partner for this order.',
    pt: 'Acesso negado. Você não é o parceiro de entrega atribuído a este pedido.',
  },
  POINTS_ONLY_FOR_DELIVERED_ORDER: {
    en: (vars: { status: string }) =>
      `Points can only be earned for DELIVERED orders. Current status: ${vars.status}.`,
    pt: (vars: { status: string }) =>
      `Os pontos só podem ser acumulados para pedidos ENTREGUES. Status atual: ${vars.status}.`,
  },
  POINTS_CANNOT_BE_GRANTED_ORDER_STATUS: {
    en: (vars: { status: string }) =>
      `Points cannot be granted. Order status must be DELIVERED. Current status: ${vars.status}.`,
    pt: (vars: { status: string }) =>
      `Os pontos não podem ser atribuídos. O status do pedido deve ser ENTREGUE. Status atual: ${vars.status}.`,
  },
  GLOBAL_SETTINGS_NOT_RETRIEVED: {
    en: 'Global system configuration settings could not be found.',
    pt: 'Não foi possível recuperar as configurações globais do sistema.',
  },
  ORDER_POINTS_ADDED_SUCCESS: {
    en: 'Order points added successfully!',
    pt: 'Pontos do pedido adicionados com sucesso!',
  },
  DELIVERY_POINTS_ADDED_SUCCESS: {
    en: 'Delivery reward points added successfully!',
    pt: 'Pontos de recompensa de entrega adicionados com sucesso!',
  },
  INSUFFICIENT_POINTS_BALANCE: {
    en: 'Insufficient points balance.',
    pt: 'Saldo de pontos insuficiente.',
  },
  POINTS_FETCHED_SUCCESS: {
    en: 'Points balance loaded successfully.',
    pt: 'Saldo de pontos carregado com sucesso.',
  },
  POINTS_NOT_FOUND: {
    en: 'Points details could not be found.',
    pt: 'Pontos não encontrados.',
  },
  POINTS_LOG_BACKUP_LOGGING_FAILED: {
    en: 'Failed to save points backup history.',
    pt: 'Falha no registro de backup do histórico de pontos.',
  },
  CRITICAL_FAILED_TO_LOG_LOYALTY_ERROR: {
    en: 'System error: Failed to log loyalty details.',
    pt: 'Erro do sistema: Falha ao registrar detalhes de fidelidade.',
  },
  FAILED_PREFIX: {
    en: (vars: { error: string }) => `Failed: ${vars.error}`,
    pt: (vars: { error: string }) => `Falhou: ${vars.error}`,
  },
  ORDER_POINTS_EARNED_DESCRIPTION: {
    en: (vars: { points: number; amount: number }) =>
      `Earned ${vars.points} points for order value of ${vars.amount}`,
    pt: (vars: { points: number; amount: number }) =>
      `Ganhou ${vars.points} pontos pelo valor do pedido de ${vars.amount}`,
  },
  DELIVERY_BONUS_DESCRIPTION: {
    en: (vars: { points: number; orderId: string }) =>
      `Delivery bonus: Received ${vars.points} points for completing order #${vars.orderId}`,
    pt: (vars: { points: number; orderId: string }) =>
      `Bônus de entrega: Recebeu ${vars.points} pontos por concluir o pedido #${vars.orderId}`,
  },
} as const;
