export const cartMessages = {
  // --- Service Success Messages ---
  ADD_TO_CART_SUCCESS: {
    en: 'Item added to your cart!',
    pt: 'Item adicionado ao seu carrinho!',
  },
  TOGGLE_ITEM_ACTIVE_SUCCESS: {
    en: 'Item activated successfully.',
    pt: 'Item ativado com sucesso.',
  },
  TOGGLE_ITEM_DEACTIVE_SUCCESS: {
    en: 'Item deactivated successfully.',
    pt: 'Item desativado com sucesso.',
  },
  QUANTITY_UPDATE_SUCCESS: {
    en: 'Cart quantity updated.',
    pt: 'Quantidade do carrinho atualizada.',
  },
  ADDON_QUANTITY_UPDATE_SUCCESS: {
    en: 'Addon quantity updated.',
    pt: 'Quantidade do adicional atualizada.',
  },
  REMOVE_ITEMS_SUCCESS: {
    en: 'Item removed from your cart.',
    pt: 'Item removido do seu carrinho.',
  },
  CLEAR_CART_SUCCESS: {
    en: 'Your cart has been cleared.',
    pt: 'Seu carrinho foi limpo.',
  },

  // --- Service Error Messages ---
  CUSTOMER_ONLY_ACTION: {
    en: 'Please log in as a customer to perform this action.',
    pt: 'Por favor, faça login como cliente para realizar esta ação.',
  },
  ACCOUNT_UNAPPROVED: {
    en: 'Your account is under review. You can order once approved.',
    pt: 'Sua conta está em análise. Você poderá fazer pedidos assim que for aprovada.',
  },
  NO_ITEMS_PROVIDED: {
    en: 'No items selected.',
    pt: 'Nenhum item selecionado.',
  },
  QUANTITY_REQUIRED_FOR_NEW_ITEM: {
    en: 'Quantity is required when adding a new item to cart.',
    pt: 'A quantidade e obrigatoria ao adicionar um novo item ao carrinho.',
  },
  PRODUCT_NOT_FOUND: {
    en: 'This item could not be found.',
    pt: 'Este item não pôde ser encontrado.',
  },
  STORE_CLOSED_OR_UNAPPROVED: {
    en: 'This restaurant is temporarily unavailable.',
    pt: 'Este restaurante está temporariamente indisponível.',
  },
  TAX_RECORD_NOT_FOUND: {
    en: 'Tax profile configuration missing.',
    pt: 'Configuração do perfil de impostos ausente.',
  },
  TAX_RECORD_INVALID: {
    en: 'Invalid tax profile data.',
    pt: 'Dados de perfil de impostos inválidos.',
  },
  VARIATION_REQUIRED: {
    en: 'Please select an option or size to proceed.',
    pt: 'Por favor, selecione uma opção ou tamanho para prosseguir.',
  },
  INVALID_VARIATION_SKU: {
    en: 'The selected item variation is invalid.',
    pt: 'A variação do item selecionado é inválida.',
  },
  VARIATIONS_NOT_SUPPORTED: {
    en: 'This item does not have multiple options.',
    pt: 'Este item não possui múltiplas opções.',
  },
  INSUFFICIENT_STOCK_WITH_QUANTITY: {
    en: (vars: { quantity: number }) =>
      `Not enough stock available. You already have ${vars.quantity} in your cart.`,
    pt: (vars: { quantity: number }) =>
      `Estoque insuficiente. Você já possui ${vars.quantity} no carrinho.`,
  },
  CART_NOT_FOUND: {
    en: 'Your cart could not be found.',
    pt: 'Seu carrinho não pôde ser encontrado.',
  },
  VENDOR_ID_REQUIRED_FOR_BULK: {
    en: 'Vendor ID is required for bulk toggle.',
    pt: 'O ID do fornecedor é necessário para alternância em massa.',
  },
  NO_ITEMS_FOUND_FOR_THIS_VENDOR: {
    en: 'No items found for this restaurant in your cart.',
    pt: 'Nenhum item encontrado para este restaurante no seu carrinho.',
  },
  PRODUCT_NOT_IN_CART: {
    en: 'This item is not in your cart.',
    pt: 'Este item não está no seu carrinho.',
  },
  PRODUCT_UNAVAILABLE: {
    en: 'This item is no longer available.',
    pt: 'Este item não está mais disponível.',
  },
  MULTIPLE_VENDORS_DENIED: {
    en: 'You can only order from one restaurant at a time. Please clear your cart first.',
    pt: 'Você só pode fazer pedidos de um restaurante por vez. Por favor, limpe seu carrinho primeiro.',
  },
  DECREMENT_UNDER_MINIMUM: {
    en: 'Quantity cannot be less than 1. Remove the item instead.',
    pt: 'A quantidade não pode ser menor que 1. Se desejar, remova o item.',
  },
  ADDON_UNAVAILABLE: {
    en: 'This extra addon is currently unavailable.',
    pt: 'Este adicional extra está indisponível no momento.',
  },
  ADDON_NOT_IN_CART: {
    en: 'This addon is not in your cart.',
    pt: 'Este adicional não está no seu carrinho.',
  },
  ADDON_LIMIT_REACHED: {
    en: (vars: { max: number; group: string }) =>
      `You can select a maximum of ${vars.max} items for ${vars.group}.`,
    pt: (vars: { max: number; group: string }) =>
      `Você pode selecionar no máximo ${vars.max} itens para ${vars.group}.`,
  },
  REMOVE_ITEMS_NOT_FOUND: {
    en: 'The selected items were not found in your cart.',
    pt: 'Os itens selecionados não foram encontrados no seu carrinho.',
  },
  CART_EMPTY: {
    en: 'Your cart is empty.',
    pt: 'Seu carrinho está vazio.',
  },
  CUSTOMER_ID_REQUIRED: {
    en: 'Customer identification is required.',
    pt: 'A identificação do cliente é obrigatória.',
  },
  CART_UPDATE_RESTRICTED: {
    en: (vars: { status: string }) =>
      `Cart updates restricted. Your account status is: ${vars.status}`,
    pt: (vars: { status: string }) =>
      `Atualizações do carrinho restritas. O status da sua conta é: ${vars.status}`,
  },
  CART_VIEW_RESTRICTED: {
    en: (vars: { status: string }) =>
      `Access denied. Your account status is: ${vars.status}`,
    pt: (vars: { status: string }) =>
      `Acesso negado. O status da sua conta é: ${vars.status}`,
  },
} as const;
