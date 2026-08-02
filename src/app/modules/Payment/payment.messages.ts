export const paymentMessages = {
  PAYMENT_ALREADY_IN_PROCESS: {
    en: 'A payment process is already active for this checkout. Please wait.',
    pt: 'Um processo de pagamento já está ativo para este checkout. Por favor, aguarde.',
  },
  PAYMENT_ALREADY_COMPLETED: {
    en: 'This payment has already been fully processed and completed.',
    pt: 'Este pagamento já foi totalmente processado e concluído.',
  },
  REDUNIQ_API_URL_NOT_CONFIGURED: {
    en: 'Payment gateway configuration missing.',
    pt: 'Configuração do gateway de pagamento ausente.',
  },
  PAYMENT_INITIATION_FAILED_BY_GATEWAY: {
    en: 'The payment gateway rejected the request. Please try again.',
    pt: 'O gateway de pagamento rejeitou a solicitação. Por favor, tente novamente.',
  },
  REDUNIQ_PAYMENT_SESSION_CREATED: {
    en: 'Payment session initiated successfully.',
    pt: 'Sessão de pagamento inicializada com sucesso.',
  },
  PAYMENT_GATEWAY_TEMP_UNAVAILABLE_502: {
    en: 'Payment Gateway is temporarily unavailable. Please try again shortly.',
    pt: 'O Gateway de Pagamento está temporariamente indisponível. Por favor, tente novamente em breve.',
  },
  GATEWAY_ERROR: {
    en: 'A network error occurred on the payment provider side. Please try again.',
    pt: 'Ocorreu um erro de rede do provedor de pagamento. Tente novamente.',
  },
  PAYMENT_PROCESSING_FAILED: {
    en: 'Payment processing failed. Please check your card or balance and try again.',
    pt: 'Falha no processamento do pagamento. Verifique seu cartão ou saldo e tente novamente.',
  },
  PAYMENT_ALREADY_REFUNDED: {
    en: 'This payment has already been refunded.',
    pt: 'Este pagamento já foi reembolsado.',
  },
  PAYMENT_CANNOT_BE_REFUNDED: {
    en: 'This payment cannot be refunded because it is not in a paid state.',
    pt: 'Este pagamento não pode ser reembolsado porque não está em um estado pago.',
  },
  ORDER_NOT_ELIGIBLE_FOR_REFUND: {
    en: 'Only rejected or canceled orders are eligible for refund.',
    pt: 'Apenas pedidos rejeitados ou cancelados são elegíveis para reembolso.',
  },
  REFUND_NOT_APPLICABLE_FOR_ORDER: {
    en: 'This order is not eligible for a refund (the customer canceled after the vendor had already accepted the order).',
    pt: 'Este pedido não é elegível para reembolso (o cliente cancelou depois de o fornecedor já ter aceitado o pedido).',
  },
  TRANSACTION_ID_NOT_FOUND: {
    en: 'The original transaction reference is missing and refund cannot be processed.',
    pt: 'A referência original da transação está ausente e o reembolso não pode ser processado.',
  },
  REFUND_FAILED_BY_GATEWAY: {
    en: 'The payment gateway failed to process the refund. Please try again later.',
    pt: 'O gateway de pagamento não conseguiu processar o reembolso. Por favor, tente novamente mais tarde.',
  },
  REDUNIQ_PAYMENT_REFUNDED: {
    en: 'Payment refunded successfully.',
    pt: 'Pagamento reembolsado com sucesso.',
  },
  NOT_AUTHORIZED_TO_VIEW: {
    en: 'Access denied. You do not have permission to view this transaction data.',
    pt: 'Acesso negado. Você não tem permissão para visualizar estes dados de transação.',
  },
  PAYMENT_STATUS_RESET_SUCCESS: {
    en: 'Payment session state has been reset successfully.',
    pt: 'O estado da sessão de pagamento foi redefinido com sucesso.',
  },
  ORDER_DETAILS_EMPTY: {
    en: 'Order validation failed. Your cart cannot be empty.',
    pt: 'A validação do pedido falhou. Seu carrinho não pode estar vazio.',
  },
  INGREDIENT_NOT_FOUND: {
    en: 'The requested ingredient could not be found.',
    pt: 'O ingrediente solicitado não pôde ser localizado.',
  },
  STOCK_NOT_AVAILABLE: {
    en: (vars: { name: string; stock: number }) =>
      `Insufficient stock for ${vars.name}. Available details: ${vars.stock}.`,
    pt: (vars: { name: string; stock: number }) =>
      `Estoque insuficiente para ${vars.name}. Saldo disponível: ${vars.stock}.`,
  },
  MINIMUM_ORDER_QUANTITY_REQUIRED: {
    en: (vars: { name: string; minOrder: number }) =>
      `The minimum required order quantity for ${vars.name} is ${vars.minOrder} units.`,
    pt: (vars: { name: string; minOrder: number }) =>
      `A quantidade mínima de pedido exigida para ${vars.name} é de ${vars.minOrder} unidades.`,
  },
  PAYMENT_TOKEN_NOT_RECEIVED: {
    en: 'Payment session timed out. Please try processing your payment again.',
    pt: 'Sessão de pagamento expirada. Por favor, tente processar seu pagamento novamente.',
  },
  INGREDIENT_REDUNIQ_PAYMENT_SESSION_CREATED: {
    en: 'Ingredient supply secure payment session initiated successfully.',
    pt: 'Sessão de pagamento seguro para suprimento de ingredientes inicializada com sucesso.',
  },
  REDUNIQ_PAYMENT_INITIATION_FAILED: {
    en: 'Failed to initiate payment with REDUNIQ. Please try again.',
    pt: 'Falha ao iniciar o pagamento com a REDUNIQ. Por favor, tente novamente.',
  },
  TRANSACTION_FAILED: {
    en: 'The transaction was declined or failed during processing.',
    pt: 'A transação foi recusada ou falhou durante o processamento.',
  },
  SAVED_TOKEN_PAYMENT_FAILED: {
    en: 'Payment with your saved card was declined. Please try again or use a different method.',
    pt: 'O pagamento com o seu cartão guardado foi recusado. Tente novamente ou use outro método.',
  },
  NOTIFICATION_RECEIVED: {
    en: 'Notification received.',
    pt: 'Notificação recebida.',
  },
} as const;
