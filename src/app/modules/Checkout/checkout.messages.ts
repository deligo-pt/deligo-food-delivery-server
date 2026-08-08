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
} as const;
