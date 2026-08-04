export const orderMessages = {
  PAYMENT_FAILED_TRY_AGAIN: {
    en: 'Payment failed. Please check your details and try again.',
    pt: 'O pagamento falhou. Verifique seus dados e tente novamente.',
  },
  ORDER_REORDER_SUCCESS: {
    en: 'Order items added to cart successfully.',
    pt: 'Os itens do pedido foram adicionados ao carrinho com sucesso.',
  },
  NOT_APPROVED_ACCEPT_REJECT_ORDERS: {
    en: (vars: { status: string }) =>
      `Access denied. Your account status is currently ${vars.status.toLowerCase()}.`,
    pt: (vars: { status: string }) =>
      `Acesso negado. O status atual da sua conta é ${vars.status.toLowerCase()}.`,
  },
  NOT_ALLOWED_TO_CHANGE_ORDER_STATUS: {
    en: (vars: { status: string }) =>
      `You are not authorized to change this order status to ${vars.status.toUpperCase()}.`,
    pt: (vars: { status: string }) =>
      `Você não tem permissão para alterar o status deste pedido para ${vars.status.toUpperCase()}.`,
  },
  ONLY_PAID_ORDER_CAN_ACCEPT_REJECT: {
    en: 'Only paid orders can be accepted or rejected.',
    pt: 'Apenas pedidos pagos podem ser aceitos ou rejeitados.',
  },
  ORDER_ALREADY_IN_STATUS: {
    en: (vars: { status: string }) =>
      `This order is already marked as ${vars.status.toUpperCase()}.`,
    pt: (vars: { status: string }) =>
      `Este pedido já está marcado como ${vars.status.toUpperCase()}.`,
  },
  // ---------------------------------------------------------
  // NEW ADDED MESSAGES FOR VENDOR STATUS FLOW
  // ---------------------------------------------------------
  CANNOT_ACCEPT_ORDER_FROM_CURRENT_STATUS: {
    en: (vars: { currentStatus: string }) =>
      `Cannot accept order from its current status (${vars.currentStatus.toUpperCase()}).`,
    pt: (vars: { currentStatus: string }) =>
      `Não é possível aceitar o pedido no status atual (${vars.currentStatus.toUpperCase()}).`,
  },
  CANNOT_REJECT_ACCEPTED_ORDER_USE_CANCEL_INSTEAD: {
    en: 'Cannot reject an order once it has been accepted. Please cancel it instead.',
    pt: 'Não é possível rejeitar um pedido depois de aceito. Por favor, cancele-o.',
  },
  CANNOT_CANCEL_ORDER_RIDER_ALREADY_ASSIGNED: {
    en: 'Cannot cancel this order because a delivery rider has already been assigned.',
    pt: 'Não é possível cancelar este pedido porque um entregador já foi atribuído.',
  },

  // ---------------------------------------------------------
  ORDER_MUST_BE_PENDING_TO_ACCEPT: {
    en: (vars: { currentStatus: string }) =>
      `Order must be PENDING to be accepted. Current status is ${vars.currentStatus.toUpperCase()}.`,
    pt: (vars: { currentStatus: string }) =>
      `O pedido deve estar PENDENTE (PENDING) para ser aceito. O status atual é ${vars.currentStatus.toUpperCase()}.`,
  },
  ORDER_MUST_BE_ASSIGNED_BEFORE_PREPARING: {
    en: 'Order must be assigned to a delivery partner before it can be prepared.',
    pt: 'O pedido deve ser atribuído a um parceiro de entrega antes de ser preparado.',
  },
  ORDER_MUST_BE_PREPARING_BEFORE_READY_FOR_PICKUP: {
    en: 'Order must be in preparation before marking it ready for pickup.',
    pt: 'O pedido deve estar em preparação antes de ser marcado como pronto para entrega.',
  },
  ORDER_CANNOT_BE_CANCELED_OR_REJECTED_AT_STAGE: {
    en: 'This order cannot be canceled or rejected at this stage.',
    pt: 'Este pedido não pode ser cancelado ou rejeitado nesta etapa.',
  },
  STOCK_CHECK_FAILED: {
    en: 'One or more items in this order are currently out of stock.',
    pt: 'Um ou mais itens deste pedido estão esgotados no momento.',
  },
  CANCEL_REASON_REQUIRED: {
    en: 'Please provide a reason for canceling the order.',
    pt: 'Por favor, forneça um motivo para o cancelamento do pedido.',
  },
  REJECT_REASON_REQUIRED: {
    en: 'Please provide a reason for rejecting the order.',
    pt: 'Por favor, forneça um motivo para rejeitar o pedido.',
  },
  ORDER_STATUS_UPDATED_SUCCESS_DYNAMIC: {
    en: (vars: { status: string }) =>
      `Order status updated to ${vars.status.toUpperCase()} successfully.`,
    pt: (vars: { status: string }) =>
      `Status do pedido atualizado para ${vars.status.toUpperCase()} com sucesso.`,
  },
  NOT_APPROVED_WITH_STATUS: {
    en: (vars: { status?: string }) =>
      `Access denied. Your profile status is currently ${vars.status ? vars.status.toUpperCase() : 'UNAPPROVED'}.`,
    pt: (vars: { status?: string }) =>
      `Acesso negado. O status do seu perfil é atualmente ${vars.status ? vars.status.toUpperCase() : 'NÃO APROVADO'}.`,
  },
  VENDOR_LOCATION_NOT_SET: {
    en: 'Restaurant location coordinates are not set.',
    pt: 'As coordenadas de localização do restaurante não foram definidas.',
  },
  ORDER_ALREADY_DISPATCHED_TO_PARTNERS: {
    en: (vars: { count: number }) =>
      `This order has already been sent to ${vars.count} nearby delivery partners.`,
    pt: (vars: { count: number }) =>
      `Este pedido já foi enviado para ${vars.count} parceiros de entrega próximos.`,
  },
  ORDER_NOT_FOUND_OR_NOT_ACCEPTED: {
    en: 'Order not found or has not been accepted by the restaurant yet.',
    pt: 'Pedido não encontrado ou ainda não foi aceito pelo restaurante.',
  },
  NO_PARTNER_FOUND: {
    en: 'No available delivery partners found nearby.',
    pt: 'Nenhum parceiro de entrega disponível foi encontrado nas proximidades.',
  },
  ORDER_DISPATCHED_TO_PARTNERS: {
    en: (vars: { count: number }) =>
      `Order successfully sent to ${vars.count} available delivery partners.`,
    pt: (vars: { count: number }) =>
      `Pedido enviado com sucesso para ${vars.count} parceiros de entrega disponíveis.`,
  },
  PARTNER_ALREADY_HAS_ACTIVE_ORDER: {
    en: 'You already have an ongoing active delivery order.',
    pt: 'Você já possui um pedido de entrega ativo em andamento.',
  },
  NOT_IN_POOL: {
    en: 'This order is no longer available in your request list.',
    pt: 'Este pedido não está mais disponível na sua lista de solicitações.',
  },
  ORDER_ALREADY_CLAIMED_OR_EXPIRED: {
    en: 'This request has expired or was already accepted by another rider.',
    pt: 'Esta solicitação expirou ou já foi aceita por outro entregador.',
  },
  ORDER_REQUEST_EXPIRED: {
    en: 'The order request window has timed out.',
    pt: 'A janela de solicitação do pedido expirou.',
  },
  ORDER_REJECTED: {
    en: 'Order rejected successfully.',
    pt: 'Pedido rejeitado com sucesso.',
  },
  ORDER_ACCEPTED: {
    en: 'Order accepted successfully.',
    pt: 'Pedido aceito com sucesso.',
  },
  CANNOT_CHANGE_STATUS_TO: {
    en: (vars: { status: string }) =>
      `Invalid update. Cannot change order status to ${vars.status.toUpperCase()}.`,
    pt: (vars: { status: string }) =>
      `Atualização inválida. Não é possível alterar o status do pedido para ${vars.status.toUpperCase()}.`,
  },
  REASON_REQUIRED: {
    en: 'Please provide a reason for the cancellation.',
    pt: 'Por favor, forneça um motivo para o cancelamento.',
  },
  DELIVERY_PROOF_IMAGE_REQUIRED: {
    en: 'Please upload a valid photo proof to complete the delivery.',
    pt: 'Por favor, envie uma foto de comprovativo para concluir a entrega.',
  },
  ORDER_STATUS_ALREADY: {
    en: (vars: { status: string }) =>
      `The order is already in ${vars.status.toUpperCase()} status.`,
    pt: (vars: { status: string }) =>
      `O pedido já está no status ${vars.status.toUpperCase()}.`,
  },
  ORDER_MUST_BE_IN_TO_TRANSITION: {
    en: (vars: { requiredStatus: string; targetStatus: string }) =>
      `Order must be in ${vars.requiredStatus.toUpperCase()} before transitioning to ${vars.targetStatus.toUpperCase()}.`,
    pt: (vars: { requiredStatus: string; targetStatus: string }) =>
      `O pedido deve estar em ${vars.requiredStatus.toUpperCase()} antes de passar para ${vars.targetStatus.toUpperCase()}.`,
  },
  DELIVERY_PARTNER_NOT_FOUND_FOR_ORDER: {
    en: 'No delivery partner is currently linked to this order.',
    pt: 'Nenhum parceiro de entrega está vinculado a este pedido no momento.',
  },
  NOT_APPROVED_TO_VIEW_ORDERS: {
    en: (vars: { status: string }) =>
      `Access denied. Your account status (${vars.status.toLowerCase()}) restricts viewing orders.`,
    pt: (vars: { status: string }) =>
      `Acesso negado. O status da sua conta (${vars.status.toLowerCase()}) restringe a visualização de pedidos.`,
  },
  INVALID_USER_ROLE: {
    en: 'Unrecognized or invalid user role.',
    pt: 'Função de usuário inválida ou não reconhecida.',
  },
  NOT_APPROVED_TO_VIEW_ORDER: {
    en: (vars: { status: string }) =>
      `Access denied. Your account status (${vars.status.toLowerCase()}) restricts viewing this order.`,
    pt: (vars: { status: string }) =>
      `Acesso negado. O status da sua conta (${vars.status.toLowerCase()}) restringe a visualização deste pedido.`,
  },
  NO_DISPATCH_ORDERS_FOUND_FOR_PARTNER: {
    en: 'No available delivery requests found matching your profile.',
    pt: 'Nenhuma solicitação de entrega disponível encontrada para o seu perfil.',
  },
  NO_ORDER_FOUND_FOR_PARTNER: {
    en: 'No active delivery order is currently linked to your account.',
    pt: 'Nenhum pedido de entrega ativo está vinculado à sua conta no momento.',
  },
  ONLY_PAID_ORDER_CAN_BE_CANCELED: {
    en: 'Only paid orders can be canceled.',
    pt: 'Apenas pedidos pagos podem ser cancelados.',
  },
  ORDER_CANCELED_BY_CUSTOMER_SUCCESS: {
    en: 'Your order has been canceled successfully.',
    pt: 'O seu pedido foi cancelado com sucesso.',
  },
} as const;
