export const orderMessages = {
  CHECKOUT_SUMMARY_NOT_FOUND: {
    en: 'The requested checkout summary record could not be found.',
    pt: 'O registro de resumo de checkout solicitado não pôde ser encontrado.',
  },
  REDUNIQ_API_URL_NOT_CONFIGURED: {
    en: 'The REDUNIQ payment gateway API gateway integration link is not configured.',
    pt: 'O link de integração do gateway de API da plataforma de pagamento REDUNIQ não está configurado.',
  },
  NOT_AUTHORIZED_TO_VIEW: {
    en: 'Access denied. You lack sufficient system privileges to inspect this resource.',
    pt: 'Acesso negado. Você não possui privilégios de sistema suficientes para inspecionar este recurso.',
  },
  CHECKOUT_SUMMARY_ALREADY_CONVERTED: {
    en: 'This checkout summary instance has already been processed and converted into a permanent order.',
    pt: 'Este resumo de checkout já foi processado e convertido em um pedido permanente.',
  },
  VENDOR_NOT_FOUND: {
    en: 'The requested commercial vendor profile could not be located.',
    pt: 'O perfil do fornecedor comercial solicitado não pôde ser localizado.',
  },
  PAYMENT_FAILED_TRY_AGAIN: {
    en: 'Transaction execution failed. Please verify payment criteria and try again.',
    pt: 'A execução da transação falhou. Por favor, verifique os critérios de pagamento e tente novamente.',
  },
  ORDER_CREATED_SUCCESS: {
    en: 'Logistics fulfillment invoice and order initialized successfully.',
    pt: 'Fatura de atendimento logístico e pedido inicializados com sucesso.',
  },
  NOT_AUTHORIZED_ACCEPT_REJECT_ORDERS: {
    en: 'Access denied. Your profile signature is not authorized to accept or reject order files.',
    pt: 'Acesso negado. A assinatura do seu perfil não está autorizada a aceitar ou rejeitar arquivos de pedidos.',
  },
  NOT_APPROVED_ACCEPT_REJECT_ORDERS: {
    en: (vars: { status: string }) =>
      `Access denied. Your current account state (${vars.status.toLowerCase()}) restricts order dispatch lifecycle modification features.`,
    pt: (vars: { status: string }) =>
      `Acesso negado. O estado atual da sua conta (${vars.status.toLowerCase()}) restringe os recursos de modificação do ciclo de vida de despacho de pedidos.`,
  },
  NOT_ALLOWED_TO_CHANGE_ORDER_STATUS: {
    en: (vars: { status: string }) =>
      `State mutation violation. You lack authorization clearance to change this order status to ${vars.status.toUpperCase()}.`,
    pt: (vars: { status: string }) =>
      `Violação de mutação de estado. Você não possui autorização para alterar o status deste pedido para ${vars.status.toUpperCase()}.`,
  },
  ORDER_NOT_FOUND_WITH_DOT: {
    en: 'The specified transaction order code could not be found.',
    pt: 'O código do pedido de transação especificado não pôde ser encontrado.',
  },
  ONLY_PAID_ORDER_CAN_ACCEPT_REJECT: {
    en: 'State mutation restriction. Only fully settled order transactions can be accepted or rejected.',
    pt: 'Restrição de mutação de estado. Apenas transações de pedidos totalmente liquidadas podem ser aceitas ou rejeitadas.',
  },
  ORDER_ALREADY_IN_STATUS: {
    en: (vars: { status: string }) =>
      `Action redundant. This transaction is already designated as ${vars.status.toUpperCase()}.`,
    pt: (vars: { status: string }) =>
      `Ação redundante. Esta transação já está designada como ${vars.status.toUpperCase()}.`,
  },
  ORDER_MUST_BE_PENDING_TO_ACCEPT: {
    en: (vars: { currentStatus: string }) =>
      `State mutation restriction. Order must be in PENDING state to be accepted. Current status is ${vars.currentStatus.toUpperCase()}.`,
    pt: (vars: { currentStatus: string }) =>
      `Restrição de mutação de estado. O pedido deve estar em estado PENDENTE (PENDING) para ser aceito. O status atual é ${vars.currentStatus.toUpperCase()}.`,
  },
  ORDER_MUST_BE_ASSIGNED_BEFORE_PREPARING: {
    en: 'Logistics pipeline violation. Order must be explicitly ASSIGNED to a courier pool before moving to PREPARING state.',
    pt: 'Violação do fluxo logístico. O pedido deve ser explicitamente ATRIBUÍDO (ASSIGNED) a um pool de estafetas antes de passar para o estado EM PREPARAÇÃO (PREPARING).',
  },
  ORDER_MUST_BE_PREPARING_BEFORE_READY_FOR_PICKUP: {
    en: 'Logistics pipeline violation. Order kitchen status must undergo PREPARING lifecycle before becoming READY_FOR_PICKUP.',
    pt: 'Violação do fluxo logístico. O status de cozinha do pedido deve passar pelo ciclo de PREPARAÇÃO (PREPARING) antes de se tornar PRONTO PARA RECOLHA (READY_FOR_PICKUP).',
  },
  ORDER_CANNOT_BE_CANCELED_OR_REJECTED_AT_STAGE: {
    en: 'Transaction immutable. Order lifecycle has progressed beyond the cancellation or rejection clearance milestone.',
    pt: 'Transação imutável. O ciclo de vida do pedido progrediu além do marco de liberação para cancelamento ou rejeição.',
  },
  STOCK_CHECK_FAILED: {
    en: 'Inventory verification failed. One or more menu items are currently exhausted or unavailable.',
    pt: 'A verificação de inventário falhou. Um ou mais itens do menu estão atualmente esgotados ou indisponíveis.',
  },
  CANCEL_REASON_REQUIRED: {
    en: 'Formal transaction cancellation justification reasons are required.',
    pt: 'Justificativas formais para o cancelamento da transação são obrigatórias.',
  },
  REJECT_REASON_REQUIRED: {
    en: 'Formal commercial application rejection justification remarks are required.',
    pt: 'Justificativas formais para a rejeição da solicitação comercial são obrigatórias.',
  },
  ORDER_STATUS_UPDATED_SUCCESS_DYNAMIC: {
    en: (vars: { status: string }) =>
      `Logistics lifecycle status modified to ${vars.status.toUpperCase()} successfully.`,
    pt: (vars: { status: string }) =>
      `Status do ciclo de vida logístico alterado para ${vars.status.toUpperCase()} com sucesso.`,
  },
  NOT_APPROVED_WITH_STATUS: {
    en: (vars: { status?: string }) =>
      `Access denied. Your institutional operational registration profile status is currently ${vars.status ? vars.status.toUpperCase() : 'UNAPPROVED'}.`,
    pt: (vars: { status?: string }) =>
      `Acesso negado. O status do seu perfil de registro operacional institucional é atualmente ${vars.status ? vars.status.toUpperCase() : 'NÃO APROVADO'}.`,
  },
  VENDOR_LOCATION_NOT_SET: {
    en: 'Merchant geographical coordinate datasets have not been set.',
    pt: 'Os conjuntos de dados de coordenadas geográficas do comerciante não foram definidos.',
  },
  ORDER_ALREADY_DISPATCHED_TO_PARTNERS: {
    en: (vars: { count: number }) =>
      `Logistics distribution alert. This task file has already been dispatched to ${vars.count} field dispatch couriers.`,
    pt: (vars: { count: number }) =>
      `Alerta de distribuição logística. Este arquivo de tarefa já foi despachado para ${vars.count} estafetas de campo.`,
  },
  ORDER_NOT_FOUND_OR_NOT_ACCEPTED: {
    en: 'The requested order target assignment could not be found or has not been accepted by the merchant node.',
    pt: 'A atribuição de destino do pedido solicitada não pôde ser encontrada ou não foi aceita pelo nó do comerciante.',
  },
  NO_PARTNER_FOUND: {
    en: 'Search matrix complete. No available field delivery partners matched dispatch allocation constraints.',
    pt: 'Matriz de busca concluída. Nenhum parceiro de entrega de campo disponível correspondeu às restrições de alocação de despacho.',
  },
  ORDER_DISPATCHED_TO_PARTNERS: {
    en: (vars: { count: number }) =>
      `Logistics notification file dispatched broadcast to ${vars.count} available fleet nodes successfully.`,
    pt: (vars: { count: number }) =>
      `Arquivo de notificação logística despachado com sucesso para ${vars.count} nós de frota disponíveis.`,
  },
  PARTNER_NOT_APPROVED: {
    en: 'Access denied. The targeted delivery node holds an unapproved security clearance profile.',
    pt: 'Acesso negado. O nó de entrega de destino possui um perfil de liberação de segurança não aprovado.',
  },
  PARTNER_ALREADY_HAS_ACTIVE_ORDER: {
    en: 'Capacity constraint limit reached. Your active system allocation pipeline already contains an ongoing delivery payload.',
    pt: 'Limite de restrição de capacidade atingido. Seu fluxo de alocação de sistema ativo já contém uma tarefa de entrega em andamento.',
  },
  NOT_IN_POOL: {
    en: 'The specified transaction assignment token does not exist inside your available task allocation pool.',
    pt: 'O token de atribuição de transação especificado não existe dentro do seu pool de alocação de tarefas disponível.',
  },
  ORDER_ALREADY_CLAIMED_OR_EXPIRED: {
    en: 'Logistics allocation timeout. This task payload has already been locked by another dispatch node or has expired.',
    pt: 'Timeout de alocação logística. Esta tarefa já foi bloqueada por outro nó de despacho ou expirou.',
  },
  ORDER_REQUEST_EXPIRED: {
    en: 'The dispatch allocation offer execution window has timed out and expired.',
    pt: 'A janela de execução da oferta de alocação de despacho expirou por timeout.',
  },
  ORDER_REJECTED: {
    en: 'The operational assignment file has been rejected successfully.',
    pt: 'O arquivo de atribuição operacional foi rejeitado com sucesso.',
  },
  ORDER_ACCEPTED: {
    en: 'The operational task payload has been locked and accepted successfully.',
    pt: 'A tarefa operacional foi bloqueada e aceita com sucesso.',
  },
  DELIVERY_PARTNER_NOT_FOUND: {
    en: 'The assigned delivery partner tracking file could not be located in our infrastructure database.',
    pt: 'O arquivo de rastreamento do parceiro de entrega atribuído não pôde ser localizado em nosso banco de dados de infraestrutura.',
  },
  CANNOT_CHANGE_STATUS_TO: {
    en: (vars: { status: string }) =>
      `Logistics policy violation. Invalid lifecycle state mutation path to ${vars.status.toUpperCase()}.`,
    pt: (vars: { status: string }) =>
      `Violação da política logística. Caminho de mutação de estado inválido para o ciclo de vida ${vars.status.toUpperCase()}.`,
  },
  REASON_REQUIRED: {
    en: 'An explanatory text statement detailing the cancellation context is required.',
    pt: 'Uma justificativa por escrito detalhando o contexto do cancelamento é obrigatória.',
  },
  DELIVERY_PROOF_IMAGE_REQUIRED: {
    en: 'A valid execution proof image file upload is mandatory to close this delivery file.',
    pt: 'O upload de um arquivo de imagem válido de comprovativo de execução é obrigatório para encerrar este arquivo de entrega.',
  },
  ORDER_STATUS_ALREADY: {
    en: (vars: { status: string }) =>
      `The current order state milestone is already registered as ${vars.status.toUpperCase()}.`,
    pt: (vars: { status: string }) =>
      `O marco atual do estado do pedido já está registrado como ${vars.status.toUpperCase()}.`,
  },
  ORDER_MUST_BE_IN_TO_TRANSITION: {
    en: (vars: { requiredStatus: string; targetStatus: string }) =>
      `Logistics policy restriction. Order context must reside in ${vars.requiredStatus.toUpperCase()} state to transition into ${vars.targetStatus.toUpperCase()}.`,
    pt: (vars: { requiredStatus: string; targetStatus: string }) =>
      `Restrição de política logística. O contexto do pedido deve residir no estado ${vars.requiredStatus.toUpperCase()} para fazer a transição para ${vars.targetStatus.toUpperCase()}.`,
  },
  DELIVERY_PARTNER_NOT_FOUND_FOR_ORDER: {
    en: 'No validated delivery partner node assignment record was found linked to this order transaction.',
    pt: 'Nenhum registro de atribuição de nó de estafeta validado foi encontrado vinculado a esta transação de pedido.',
  },
  ORDER_STATUS_UPDATED_SUCCESS: {
    en: 'The execution timeline status variable for this order has been updated successfully.',
    pt: 'A variável de status do cronograma de execução para este pedido foi atualizada com sucesso.',
  },
  NOT_APPROVED_TO_VIEW_ORDERS: {
    en: (vars: { status: string }) =>
      `Access denied. Your account state credentials (${vars.status.toLowerCase()}) restrict permissions required to view task registries.`,
    pt: (vars: { status: string }) =>
      `Acesso negado. As credenciais de estado da sua conta (${vars.status.toLowerCase()}) restringem as permissões necessárias para visualizar os registros de tarefas.`,
  },
  INVALID_USER_ROLE: {
    en: 'The provided security identity role profile is invalid or unrecognized by the core infrastructure.',
    pt: 'O perfil de função de identidade de segurança fornecido é inválido ou não reconhecido pela infraestrutura principal.',
  },
  ORDERS_RETRIEVED_SUCCESS: {
    en: 'Logistics network transaction ledger entries retrieved successfully.',
    pt: 'As entradas do livro de transações da rede de logística foram recuperadas com sucesso.',
  },
  NOT_APPROVED_TO_VIEW_ORDER: {
    en: (vars: { status: string }) =>
      `Access denied. Operational profile clearance state (${vars.status.toLowerCase()}) prevents exploration of individual order files.`,
    pt: (vars: { status: string }) =>
      `Acesso negado. O estado de liberação do seu perfil operacional (${vars.status.toLowerCase()}) impede a exploração de arquivos de pedidos individuais.`,
  },
  INVALID_ROLE_OR_PERMISSION_DENIED: {
    en: 'Access denied. Security clearance token verification failed due to an invalid role matrix definition.',
    pt: 'Acesso negado. A verificação do token de liberação de segurança falhou devido a uma definição inválida da matriz de funções.',
  },
  ORDER_NOT_FOUND: {
    en: 'The specified order statement row could not be located.',
    pt: 'A linha de extrato do pedido especificada não pôde ser localizada.',
  },
  ORDER_RETRIEVED_SUCCESS: {
    en: 'Itemized tracking statement dataset loaded successfully.',
    pt: 'O conjunto de dados detalhado do extrato de rastreamento foi carregado com sucesso.',
  },
  NO_DISPATCH_ORDERS_FOUND_FOR_PARTNER: {
    en: 'No eligible broadcast dispatch tasks were found matched with your courier node parameters.',
    pt: 'Nenhuma tarefa de despacho elegível foi encontrada correspondente aos parâmetros do seu nó de estafeta.',
  },
  DELIVERY_PARTNER_DISPATCH_ORDER_FETCHED_SUCCESS: {
    en: 'Courier pool broadcast task ledger segments retrieved successfully.',
    pt: 'Os segmentos do livro de tarefas do pool de estafetas foram recuperados com sucesso.',
  },
  ONLY_DELIVERY_PARTNERS_CAN_ACCESS_CURRENT_ORDER: {
    en: 'Access restricted. Current active delivery statement lookups are restricted to dispatch field agents only.',
    pt: 'Acesso restrito. As consultas de extratos de entrega ativos atuais são restritas apenas a agentes de campo de despacho.',
  },
  NO_ORDER_FOUND_FOR_PARTNER: {
    en: 'No current ongoing operational delivery file is linked to your account node.',
    pt: 'Nenhum arquivo de entrega operacional em andamento está vinculado ao nó da sua conta.',
  },
  DELIVERY_PARTNER_CURRENT_ORDER_FETCHED_SUCCESS: {
    en: 'Active task payload parameters and tracking profile pulled successfully.',
    pt: 'Os parâmetros da tarefa ativa e o perfil de rastreamento foram obtidos com sucesso.',
  },
} as const;
