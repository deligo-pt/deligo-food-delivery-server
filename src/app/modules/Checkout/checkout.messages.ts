export const checkoutMessages = {
  CHECKOUT_CART_EMPTY: {
    en: 'Your cart is empty. Please add items before proceeding to checkout.',
    pt: 'Seu carrinho está vazio. Por favor, adicione itens antes de prosseguir para o checkout.',
  },
  NO_ACTIVE_CART_ITEMS: {
    en: 'Please select at least one active item to checkout.',
    pt: 'Por favor, selecione pelo menos um item ativo para o checkout.',
  },
  DIRECT_CHECKOUT_SINGLE_ITEM_ONLY: {
    en: 'Direct checkout is restricted to a single item only.',
    pt: 'O checkout direto é restrito a apenas um único item.',
  },
  PRODUCTS_NOT_FOUND: {
    en: 'One or more items in your cart are no longer available.',
    pt: 'Um ou mais itens no seu carrinho não estão mais disponíveis.',
  },
  VENDOR_CLOSED: {
    en: 'This restaurant is currently closed and not accepting orders.',
    pt: 'Este restaurante está fechado no momento e não está aceitando pedidos.',
  },
  NO_ACTIVE_DELIVERY_ADDRESS: {
    en: 'Please add a delivery address to complete your order.',
    pt: 'Por favor, adicione um endereço de entrega para concluir seu pedido.',
  },
  DELIVERY_ADDRESS_INCOMPLETE: {
    en: 'Your delivery address is incomplete. Please update your address details.',
    pt: 'Seu endereço de entrega está incompleto. Por favor, atualize os detalhes do seu endereço.',
  },
  VENDOR_LOCATION_NOT_FOUND: {
    en: 'Could not calculate delivery route. Restaurant location is missing.',
    pt: 'Não foi possível calcular a rota de entrega. A localização do restaurante está ausente.',
  },
  ORDER_VIEW_APPROVAL_REQUIRED: {
    en: (vars: { status: string }) =>
      `Access denied. Your account status is currently ${vars.status.toLowerCase()}.`,
    pt: (vars: { status: string }) =>
      `Acesso negado. O status atual da sua conta é ${vars.status.toLowerCase()}.`,
  },
  CHECKOUT_SUMMARY_ALREADY_CONVERTED: {
    en: 'This checkout has already been processed into an order.',
    pt: 'Este checkout já foi processado em um pedido.',
  },
  VARIATION_SKU_REQUIRED: {
    en: 'A variation SKU is required for this item.',
    pt: 'Um SKU de variação é necessário para este item.',
  },
  PAYOUT_SPLIT_RECONCILIATION_MISMATCH: {
    en: 'Unable to calculate this order. Please try again or contact support.',
    pt: 'Não foi possível calcular este pedido. Por favor, tente novamente ou contacte o suporte.',
  },

  // ---------------------------------------------------------
  // SELF-PICKUP TIME
  // ---------------------------------------------------------
  PICKUP_TIME_REQUIRED: {
    en: 'Please choose a pickup time for your order.',
    pt: 'Por favor, escolha um horário de retirada para o seu pedido.',
  },
  INVALID_PICKUP_TIME: {
    en: 'The pickup time provided is not a valid date/time.',
    pt: 'O horário de retirada fornecido não é uma data/hora válida.',
  },
  PICKUP_TIME_MUST_BE_TODAY: {
    en: 'Pickup time must be later today — scheduling for another day is not supported yet.',
    pt: 'O horário de retirada deve ser ainda hoje — agendar para outro dia ainda não é suportado.',
  },
  PICKUP_TIME_MUST_BE_IN_FUTURE: {
    en: 'Pickup time must be later than the current time.',
    pt: 'O horário de retirada deve ser posterior ao horário atual.',
  },
  VENDOR_CLOSED_ON_PICKUP_DAY: {
    en: 'This restaurant is closed today and cannot accept a pickup time.',
    pt: 'Este restaurante está fechado hoje e não pode aceitar um horário de retirada.',
  },
  PICKUP_TIME_OUTSIDE_STORE_HOURS: {
    en: (vars: { openingHours: string; closingHours: string }) =>
      `Pickup time must be between ${vars.openingHours} and ${vars.closingHours} (the restaurant's store hours).`,
    pt: (vars: { openingHours: string; closingHours: string }) =>
      `O horário de retirada deve ser entre ${vars.openingHours} e ${vars.closingHours} (horário de funcionamento do restaurante).`,
  },
} as const;
