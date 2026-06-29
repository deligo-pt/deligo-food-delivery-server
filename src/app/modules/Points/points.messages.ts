export const pointsMessages = {
  POINTS_ALREADY_GRANTED_FOR_ORDER: {
    en: 'Points already granted for this order',
    pt: 'Os pontos já foram atribuídos para este pedido',
  },
  ORDER_NOT_FOUND: {
    en: 'Order not found.',
    pt: 'Pedido não encontrado.',
  },
  ORDER_NOT_FOUND_SPECIFIED: {
    en: 'The specified order was not found.',
    pt: 'O pedido especificado não foi encontrado.',
  },
  UNAUTHORIZED_ORDER_NOT_BELONG_TO_USER: {
    en: 'Unauthorized: This order does not belong to the specified user.',
    pt: 'Não autorizado: Este pedido não pertence ao usuário especificado.',
  },
  UNAUTHORIZED_NOT_ASSIGNED_DELIVERY_PARTNER: {
    en: 'Unauthorized: You are not the assigned delivery partner for this order.',
    pt: 'Não autorizado: Você não é o parceiro de entrega atribuído a este pedido.',
  },
  POINTS_ONLY_FOR_DELIVERED_ORDER: {
    en: (vars: { status: string }) =>
      `Points can only be earned for DELIVERED orders. Current status: ${vars.status}`,
    pt: (vars: { status: string }) =>
      `Os pontos só podem ser acumulados para pedidos ENTREGUES. Status atual: ${vars.status}`,
  },
  POINTS_CANNOT_BE_GRANTED_ORDER_STATUS: {
    en: (vars: { status: string }) =>
      `Points cannot be granted. Order status is ${vars.status}, but it must be DELIVERED.`,
    pt: (vars: { status: string }) =>
      `Os pontos não podem ser atribuídos. O status do pedido é ${vars.status}, mas deve ser ENTREGUE.`,
  },
  GLOBAL_SETTINGS_NOT_RETRIEVED: {
    en: 'Global settings could not be retrieved.',
    pt: 'Não foi possível recuperar as configurações globais.',
  },
  ORDER_POINTS_ADDED_SUCCESS: {
    en: 'Order points added successfully',
    pt: 'Pontos do pedido adicionados com sucesso',
  },
  DELIVERY_POINTS_ADDED_SUCCESS: {
    en: 'Delivery points added successfully',
    pt: 'Pontos de entrega adicionados com sucesso',
  },
  INSUFFICIENT_POINTS_BALANCE: {
    en: 'Insufficient points balance. Transaction declined to prevent negative balance.',
    pt: 'Saldo de pontos insuficiente. Transação recusada para evitar saldo negativo.',
  },
  POINTS_FETCHED_SUCCESS: {
    en: 'Points fetched successfully',
    pt: 'Pontos recuperados com sucesso',
  },
  POINTS_NOT_FOUND: {
    en: 'Points not found',
    pt: 'Pontos não encontrados',
  },
  POINTS_LOG_BACKUP_LOGGING_FAILED: {
    en: 'PointsLog backup logging failed:',
    pt: 'Falha no registro de backup do histórico de pontos:',
  },
  CRITICAL_FAILED_TO_LOG_LOYALTY_ERROR: {
    en: 'Critical: Failed to log loyalty error to database:',
    pt: 'Crítico: Falha ao registrar erro de fidelidade no banco de dados:',
  },
  FAILED_PREFIX: {
    en: (vars: { error: string }) => `FAILED: ${vars.error}`,
    pt: (vars: { error: string }) => `FALHOU: ${vars.error}`,
  },
  ORDER_POINTS_EARNED_DESCRIPTION: {
    en: (vars: { points: number; amount: number }) =>
      `Earned ${vars.points} points for order €${vars.amount}`,
    pt: (vars: { points: number; amount: number }) =>
      `Ganhou ${vars.points} pontos pelo pedido de €${vars.amount}`,
  },
  DELIVERY_BONUS_DESCRIPTION: {
    en: (vars: { points: number; orderId: string }) =>
      `Delivery bonus: Received ${vars.points} points for completing order #${vars.orderId}`,
    pt: (vars: { points: number; orderId: string }) =>
      `Bônus de entrega: Recebeu ${vars.points} pontos por concluir o pedido #${vars.orderId}`,
  },
} as const;
