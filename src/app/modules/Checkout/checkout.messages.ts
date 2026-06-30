export const checkoutMessages = {
  CART_EMPTY: {
    en: 'Your cart is empty. Please add items before proceeding to checkout.',
    pt: 'Seu carrinho está vazio. Por favor, adicione itens antes de prosseguir para o checkout.',
  },
  NO_ACTIVE_CART_ITEMS: {
    en: 'There are no active items selected in your cart for checkout.',
    pt: 'Não há itens ativos selecionados em seu carrinho para o checkout.',
  },
  DIRECT_CHECKOUT_SINGLE_ITEM_ONLY: {
    en: 'Direct checkout option is restricted to a single item purchase only.',
    pt: 'A opção de checkout direto é restrita à compra de apenas um único item.',
  },
  PRODUCTS_NOT_FOUND: {
    en: 'One or more products in your checkout request could not be located.',
    pt: 'Um ou mais produtos em sua solicitação de checkout não puderam ser localizados.',
  },
  PRODUCT_NOT_FOUND: {
    en: 'The requested product could not be located in our system.',
    pt: 'O produto solicitado não pôde ser localizado em nosso sistema.',
  },
  VENDOR_CLOSED: {
    en: 'This store partner is currently closed and not accepting checkout orders.',
    pt: 'Este parceiro comercial está fechado no momento e não está aceitando pedidos de checkout.',
  },
  NO_ACTIVE_DELIVERY_ADDRESS: {
    en: 'No active delivery address associated with your profile was found.',
    pt: 'Nenhum endereço de entrega ativo associado ao seu perfil foi encontrado.',
  },
  DELIVERY_ADDRESS_INCOMPLETE: {
    en: 'Your active delivery address information is incomplete. Please re-save your address details.',
    pt: 'As informações do seu endereço de entrega ativo estão incompletas. Por favor, salve novamente os detalhes do seu endereço.',
  },
  VENDOR_LOCATION_NOT_FOUND: {
    en: 'The geographical location coordinates for this store partner could not be found.',
    pt: 'As coordenadas de localização geográfica deste parceiro comercial não puderam ser encontradas.',
  },
  CHECKOUT_SUCCESS: {
    en: 'Checkout session finalized and processed successfully.',
    pt: 'Sessão de checkout finalizada e processada com sucesso.',
  },
  ORDER_VIEW_APPROVAL_REQUIRED: {
    en: (vars: { status: string }) =>
      `You are not approved to view this order transaction. Your account status is currently ${vars.status.toLowerCase()}.`,
    pt: (vars: { status: string }) =>
      `Você não está aprovado para visualizar esta transação de pedido. O status atual da sua conta é ${vars.status.toLowerCase()}.`,
  },
  CHECKOUT_SUMMARY_NOT_FOUND: {
    en: 'The requested checkout summary record could not be found.',
    pt: 'O registro de resumo de checkout solicitado não pôde ser encontrado.',
  },
  UNAUTHORIZED_TO_VIEW: {
    en: 'Access denied. You lack the sufficient system privileges required to view this resource.',
    pt: 'Acesso negado. Você não possui os privilégios de sistema suficientes necessários para visualizar este recurso.',
  },
  CHECKOUT_SUMMARY_ALREADY_CONVERTED: {
    en: 'This checkout summary instance has already been processed and converted into a permanent order.',
    pt: 'Este resumo de checkout já foi processado e convertido em um pedido permanente.',
  },
  CHECKOUT_SUMMARY_RETRIEVED_SUCCESS: {
    en: 'Checkout session metrics and pricing breakdown summary retrieved successfully.',
    pt: 'Métricas de sessão de checkout e resumo de detalhamento de preços recuperados com sucesso.',
  },
} as const;
