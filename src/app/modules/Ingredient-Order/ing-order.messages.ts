export const ingredientOrderMessages = {
  INGREDIENT_ORDER_NOT_FOUND: {
    en: 'The requested ingredient order could not be found.',
    pt: 'O pedido de ingredientes solicitado não pôde ser encontrado.',
  },
  UNAUTHORIZED_COMPLETE_ORDER: {
    en: 'Access denied. You do not have permission to complete this order.',
    pt: 'Acesso negado. Você não tem permissão para concluir este pedido.',
  },
  ORDER_ALREADY_PAID_CONFIRMED: {
    en: 'This order has already been paid and confirmed.',
    pt: 'Este pedido já foi pago e confirmado.',
  },
  PAYMENT_VERIFICATION_FAILED: {
    en: 'Payment verification failed. Please check your transaction status.',
    pt: 'Falha na verificação do pagamento. Verifique o status da sua transação.',
  },
  INGREDIENT_ORDER_CONFIRMED_SUCCESS: {
    en: 'Ingredient order has been successfully confirmed.',
    pt: 'O pedido de ingredientes foi confirmado com sucesso.',
  },

  INGREDIENT_ORDER_CONFIRMATION_FAILED: {
    en: 'Failed to confirm the order. Please try again.',
    pt: 'Falha ao confirmar o pedido. Tente novamente.',
  },

  FAILED_CONFIRM_ORDER: {
    en: 'Could not confirm the order due to a system error. Please try again.',
    pt: 'Não foi possível confirmar o pedido devido a um erro do sistema. Tente novamente.',
  },
  VENDOR_NOT_FOUND: {
    en: 'The requested merchant profile could not be found.',
    pt: 'O perfil do fornecedor solicitado não pôde ser encontrado.',
  },

  UNAUTHORIZED_UPDATE_ORDER_STATUS: {
    en: 'Access denied. You do not have permission to change this order status.',
    pt: 'Acesso negado. Você não tem permissão para alterar o status deste pedido.',
  },

  CANNOT_UPDATE_UNPAID_ORDER: {
    en: 'Action restricted. Cannot update the status of an unpaid order.',
    pt: 'Ação restrita. Não é possível atualizar o status de um pedido não pago.',
  },
  ORDER_ALREADY_MARKED: {
    en: (vars: { status: string }) =>
      `This order is already marked as ${vars.status.toLowerCase()}.`,
    pt: (vars: { status: string }) =>
      `Este pedido já está marcado como ${vars.status.toLowerCase()}.`,
  },
  ORDER_MUST_BE_SHIPPED_BEFORE_DELIVERED: {
    en: 'Invalid update. Order must be SHIPPED before it can be marked as DELIVERED.',
    pt: 'Atualização inválida. O pedido deve ser ENVIADO (SHIPPED) antes de ser marcado como ENTREGUE (DELIVERED).',
  },
  CANNOT_CHANGE_TO_SHIPPED_AFTER_DELIVERED: {
    en: 'Invalid update. Cannot change status to SHIPPED once the order is DELIVERED.',
    pt: 'Atualização inválida. Não é possível alterar o status para ENVIADO (SHIPPED) após o pedido ter sido ENTREGUE (DELIVERED).',
  },
  ORDER_STATUS_UPDATED: {
    en: (vars: { status: string }) =>
      `Order status updated to ${vars.status.toLowerCase()} successfully.`,
    pt: (vars: { status: string }) =>
      `Status do pedido atualizado para ${vars.status.toLowerCase()} com sucesso.`,
  },
} as const;
