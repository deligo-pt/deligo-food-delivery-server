export const paymentMessages = {
  SUMMARY_NOT_FOUND: {
    en: 'The requested transactional checkout summary record could not be found.',
    pt: 'O registro de resumo de checkout transacional solicitado não pôde ser encontrado.',
  },
  CHECKOUT_SUMMARY_ALREADY_CONVERTED: {
    en: 'This checkout summary instance has already been processed and converted into a permanent order.',
    pt: 'Este resumo de checkout já foi processado e convertido em um pedido permanente.',
  },
  PAYMENT_ALREADY_IN_PROCESS: {
    en: 'A payment settlement process is already actively running for this checkout milestone.',
    pt: 'Um processo de liquidação de pagamento já está ativamente em execução para este checkout.',
  },
  PAYMENT_ALREADY_COMPLETED: {
    en: 'This checkout invoice ledger transaction has already been fully processed and settled.',
    pt: 'Esta transação do livro de faturas de checkout já foi totalmente processada e liquidada.',
  },
  REDUNIQ_API_URL_NOT_CONFIGURED: {
    en: 'The REDUNIQ payment gateway API gateway integration link is not configured.',
    pt: 'O link de integração do gateway de API da plataforma de pagamento REDUNIQ não está configurado.',
  },
  PAYMENT_INITIATION_FAILED_BY_GATEWAY: {
    en: 'The financial service provider gateway rejected the payment initiation handshake request.',
    pt: 'O gateway do provedor de serviços financeiros rejeitou a solicitação de inicialização de pagamento.',
  },
  REDUNIQ_PAYMENT_SESSION_CREATED: {
    en: 'REDUNIQ secure gateway checkout ledger session token initiated successfully.',
    pt: 'Token de sessão de checkout do gateway seguro REDUNIQ inicializado com sucesso.',
  },
  PAYMENT_GATEWAY_TEMP_UNAVAILABLE_502: {
    en: 'Payment Gateway is temporarily unavailable (502 Bad Gateway). Please try again shortly.',
    pt: 'O Gateway de Pagamento está temporariamente indisponível (502 Bad Gateway). Por favor, tente novamente em breve.',
  },
  GATEWAY_ERROR: {
    en: 'An upstream infrastructure error was encountered on the financial service provider node.',
    pt: 'Um erro de infraestrutura upstream foi encontrado no nó do provedor de serviços financeiros.',
  },
  PAYMENT_PROCESSING_FAILED: {
    en: 'An unhandled exception occurred during the transaction ledger balance settlement pipeline.',
    pt: 'Ocorreu uma exceção não tratada durante o fluxo de liquidação de saldo do livro de transações.',
  },
  NOT_AUTHORIZED_TO_VIEW: {
    en: 'Access denied. You lack sufficient system privileges to inspect this transaction dataset.',
    pt: 'Acesso negado. Você não possui privilégios de sistema suficientes para inspecionar este conjunto de dados transacionais.',
  },
  PAYMENT_STATUS_RESET_SUCCESS: {
    en: 'The active payment session state variable has been reset successfully.',
    pt: 'A variável de estado da sessão de pagamento ativa foi redefinida com sucesso.',
  },
  ORDER_DETAILS_EMPTY: {
    en: 'Transaction blueprint validation failed. Order ledger items payload cannot be empty.',
    pt: 'A validação do plano de transação falhou. O payload de itens do livro de pedidos não pode estar vazio.',
  },
  VENDOR_NOT_FOUND: {
    en: 'The requested commercial vendor profile could not be located.',
    pt: 'O perfil do fornecedor comercial solicitado não pôde ser localizado.',
  },
  INGREDIENT_NOT_FOUND: {
    en: (vars: { ingredientId: string }) =>
      `Ingredient master entry linked with ID ${vars.ingredientId} could not be located.`,
    pt: (vars: { ingredientId: string }) =>
      `A entrada mestre do ingrediente vinculada ao ID ${vars.ingredientId} não pôde ser localizada.`,
  },
  STOCK_NOT_AVAILABLE: {
    en: (vars: { name: string; stock: number }) =>
      `Inventory constraint matched. Insufficient stock for ${vars.name}. Available balance: ${vars.stock}.`,
    pt: (vars: { name: string; stock: number }) =>
      `Restrição de inventário atingida. Estoque insuficiente para ${vars.name}. Saldo disponível: ${vars.stock}.`,
  },
  MINIMUM_ORDER_QUANTITY_REQUIRED: {
    en: (vars: { name: string; minOrder: number }) =>
      `Procurement constraint limit validation failed. Minimum supply order allocation for ${vars.name} is ${vars.minOrder} units.`,
    pt: (vars: { name: string; minOrder: number }) =>
      `A validação do limite de restrição de aquisição falhou. A alocação mínima de pedido de fornecimento para ${vars.name} é de ${vars.minOrder} unidades.`,
  },
  PAYMENT_TOKEN_NOT_RECEIVED: {
    en: 'Handshake timeout. The unique checkout session state verification token was not dispatched by REDUNIQ.',
    pt: 'Timeout de handshake. O token exclusivo de verificação de estado da sessão de checkout não foi enviado pela REDUNIQ.',
  },
  INGREDIENT_REDUNIQ_PAYMENT_SESSION_CREATED: {
    en: 'Ingredient supply procurement secure checkout ledger session token initiated successfully.',
    pt: 'Token de sessão de checkout seguro para aquisição de suprimento de ingredientes inicializado com sucesso.',
  },
  REDUNIQ_PAYMENT_INITIATION_FAILED: {
    en: 'Failed to complete transaction ledger token acquisition request from REDUNIQ infrastructure endpoints.',
    pt: 'Falha ao concluir a solicitação de aquisição de token do livro de transações nos endpoints da infraestrutura REDUNIQ.',
  },
  TRANSACTION_FAILED: {
    en: 'Financial clearinghouse transaction declined or failed during the settlement flow.',
    pt: 'A transação da câmara de compensação financeira foi recusada ou falhou durante o fluxo de liquidação.',
  },
} as const;
