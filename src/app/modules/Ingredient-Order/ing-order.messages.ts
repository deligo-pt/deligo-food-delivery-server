export const ingredientOrderMessages = {
  INGREDIENT_ORDER_NOT_FOUND: {
    en: 'Ingredient purchase order record could not be found.',
    pt: 'O registro do pedido de compra de ingredientes não pôde ser encontrado.',
  },
  UNAUTHORIZED_COMPLETE_ORDER: {
    en: 'Access denied. You do not possess the required credentials to complete this order.',
    pt: 'Acesso negado. Você não possui as credenciais necessárias para concluir este pedido.',
  },
  ORDER_ALREADY_PAID_CONFIRMED: {
    en: 'This transaction has already been fully settled, and the order is confirmed.',
    pt: 'Esta transação já foi totalmente liquidada e o pedido está confirmado.',
  },
  PAYMENT_VERIFICATION_FAILED: {
    en: 'Payment verification failed. The transaction state was not processed as successful.',
    pt: 'Falha na verificação do pagamento. O estado da transação não foi processado como bem-sucedido.',
  },
  INGREDIENT_ORDER_CONFIRMED_SUCCESS: {
    en: 'Ingredient supply order has been confirmed and verified successfully.',
    pt: 'O pedido de fornecimento de ingredientes foi confirmado e verificado com sucesso.',
  },
  FAILED_CONFIRM_ORDER: {
    en: 'An infrastructure error occurred. Failed to confirm the specified order.',
    pt: 'Ocorreu um erro de infraestrutura. Falha ao confirmar o pedido especificado.',
  },
  VENDOR_NOT_FOUND: {
    en: 'The requested commercial vendor profile could not be located.',
    pt: 'O perfil do fornecedor comercial solicitado não pôde ser localizado.',
  },
  INGREDIENT_ORDERS_RETRIEVED_SUCCESS: {
    en: 'Ingredient supply order histories retrieved successfully.',
    pt: 'Históricos de pedidos de fornecimento de ingredientes recuperados com sucesso.',
  },
  ALL_INGREDIENT_ORDERS_RETRIEVED_SUCCESS: {
    en: 'Global network ingredient statement logs retrieved successfully.',
    pt: 'Logs globais de extratos de ingredientes da rede recuperados com sucesso.',
  },
  ORDER_DETAILS_RETRIEVED_SUCCESS: {
    en: 'Detailed itemized order statements and metric breakdown retrieved successfully.',
    pt: 'Extratos detalhados do pedido e detalhamento de métricas recuperados com sucesso.',
  },
  UNAUTHORIZED_UPDATE_ORDER_STATUS: {
    en: 'Access denied. Your system identity lacks permissions to mutate this order status.',
    pt: 'Acesso negado. Sua identidade de sistema não possui permissões para alterar o status deste pedido.',
  },
  ORDER_NOT_FOUND: {
    en: 'The specified transaction order code could not be found.',
    pt: 'O código do pedido de transação especificado não pôde ser encontrado.',
  },
  CANNOT_UPDATE_UNPAID_ORDER: {
    en: 'Status transition restricted. Cannot alter the dispatch state of an unpaid order.',
    pt: 'Transição de status restrita. Não é possível alterar o estado de despacho de um pedido não pago.',
  },
  ORDER_ALREADY_MARKED: {
    en: (vars: { status: string }) =>
      `Action redundant. This transaction is already designated as ${vars.status.toLowerCase()}.`,
    pt: (vars: { status: string }) =>
      `Ação redundante. Esta transação já está designada como ${vars.status.toLowerCase()}.`,
  },
  ORDER_MUST_BE_SHIPPED_BEFORE_DELIVERED: {
    en: 'Logistics violation. Order must transition to SHIPPED status before being marked as DELIVERED.',
    pt: 'Violação de logística. O pedido deve passar para o status ENVIADO (SHIPPED) antes de ser marcado como ENTREGUE (DELIVERED).',
  },
  CANNOT_CHANGE_TO_SHIPPED_AFTER_DELIVERED: {
    en: 'Logistics violation. State mutation to SHIPPED is invalid once an order is marked as DELIVERED.',
    pt: 'Violação de logística. A alteração de estado para ENVIADO (SHIPPED) é inválida após o pedido ter sido marcado como ENTREGUE (DELIVERED).',
  },
  ORDER_STATUS_UPDATED: {
    en: (vars: { status: string }) =>
      `Logistics lifecycle status modified to ${vars.status.toLowerCase()} successfully.`,
    pt: (vars: { status: string }) =>
      `Status do ciclo de vida logístico alterado para ${vars.status.toLowerCase()} com sucesso.`,
  },
} as const;
