export const cartMessages = {
  // --- Service Success Messages ---
  ADD_TO_CART_SUCCESS: {
    en: 'Product added to cart successfully.',
    pt: 'Produto adicionado ao carrinho com sucesso.',
  },
  TOGGLE_ITEM_ACTIVE_SUCCESS: {
    en: 'Product activated successfully.',
    pt: 'Produto ativado com sucesso.',
  },
  TOGGLE_ITEM_DEACTIVE_SUCCESS: {
    en: 'Product deactivated successfully.',
    pt: 'Produto desativado com sucesso.',
  },
  QUANTITY_UPDATE_SUCCESS: {
    en: 'Product quantity updated successfully.',
    pt: 'Quantidade do produto atualizada com sucesso.',
  },
  ADDON_QUANTITY_UPDATE_SUCCESS: {
    en: 'Product addon quantity updated successfully.',
    pt: 'Quantidade do adicional do produto atualizada com sucesso.',
  },
  REMOVE_ITEMS_SUCCESS: {
    en: 'Cart updated: Item(s) removed successfully.',
    pt: 'Carrinho atualizado: Item(ns) removido(s) com sucesso.',
  },
  CLEAR_CART_SUCCESS: {
    en: 'Cart cleared successfully.',
    pt: 'Carrinho limpo com sucesso.',
  },
  FETCH_ALL_SUCCESS: {
    en: 'Carts fetched successfully.',
    pt: 'Carrinhos recuperados com sucesso.',
  },
  FETCH_SINGLE_SUCCESS: {
    en: 'Cart fetched successfully.',
    pt: 'Carrinho recuperado com sucesso.',
  },

  // --- Service Error Messages ---
  CUSTOMER_ONLY_ACTION: {
    en: 'Only customers are allowed to perform this action.',
    pt: 'Apenas clientes têm permissão para realizar esta ação.',
  },
  ACCOUNT_UNAPPROVED: {
    en: 'Your account is not approved yet.',
    pt: 'Sua conta ainda não está aprovada.',
  },
  NO_ITEMS_PROVIDED: {
    en: 'No items provided.',
    pt: 'Nenhum item fornecido.',
  },
  PRODUCT_NOT_FOUND: {
    en: 'Product not found.',
    pt: 'Produto não encontrado.',
  },
  STORE_CLOSED_OR_UNAPPROVED: {
    en: 'This merchant partner is currently unavailable or unapproved.',
    pt: 'Este parceiro comercial está indisponível ou não aprovado no momento.',
  },
  TAX_RECORD_NOT_FOUND: {
    en: 'One or more assigned tax records were not found.',
    pt: 'Um ou mais registros de impostos atribuídos não foram encontrados.',
  },
  TAX_RECORD_INVALID: {
    en: 'One or more tax records are invalid or deleted.',
    pt: 'Um ou mais registros de impostos são inválidos ou foram excluídos.',
  },
  VARIATION_REQUIRED: {
    en: 'This product has multiple variations. Please select a variation to proceed.',
    pt: 'Este produto possui múltiplas variações. Por favor, selecione uma variação para prosseguir.',
  },
  INVALID_VARIATION_SKU: {
    en: 'Invalid variation SKU.',
    pt: 'SKU de variação inválido.',
  },
  VARIATIONS_NOT_SUPPORTED: {
    en: 'This product does not support variations. Please clear selection.',
    pt: 'Este produto não suporta variações. Por favor, limpe a seleção.',
  },
  INSUFFICIENT_STOCK: {
    en: 'Insufficient stock availability for this item.',
    pt: 'Disponibilidade de estoque insuficiente para este item.',
  },
  INSUFFICIENT_STOCK_WITH_QUANTITY: {
    en: (vars: { quantity: number }) =>
      `Insufficient stock. You already have ${vars.quantity} in cart.`,
    pt: (vars: { quantity: number }) =>
      `Estoque insuficiente. Você já possui ${vars.quantity} no carrinho.`,
  },
  CART_NOT_FOUND: {
    en: 'Cart not found.',
    pt: 'Carrinho não encontrado.',
  },
  PRODUCT_NOT_IN_CART: {
    en: 'Product not found in cart.',
    pt: 'Produto não encontrado no carrinho.',
  },
  PRODUCT_UNAVAILABLE: {
    en: 'Product is no longer available.',
    pt: 'O produto não está mais disponível.',
  },
  VENDOR_NOT_FOUND: {
    en: 'Vendor not found.',
    pt: 'Fornecedor não encontrado.',
  },
  MULTIPLE_VENDORS_DENIED: {
    en: 'You can only select items from the same vendor.',
    pt: 'Você só pode selecionar itens do mesmo fornecedor.',
  },
  DECREMENT_UNDER_MINIMUM: {
    en: 'Not allowed to decrement quantity below 1.',
    pt: 'Não é permitido diminuir a quantidade para menos de 1.',
  },
  ADDON_UNAVAILABLE: {
    en: 'Addon is inactive or unavailable.',
    pt: 'O adicional está inativo ou indisponível.',
  },
  ADDON_NOT_IN_CART: {
    en: 'Addon not found in your cart.',
    pt: 'Adicional não encontrado no seu carrinho.',
  },
  ADDON_LIMIT_REACHED: {
    en: (vars: { max: number; group: string }) =>
      `Maximum selection limit of ${vars.max} reached for ${vars.group}.`,
    pt: (vars: { max: number; group: string }) =>
      `Limite máximo de seleção de ${vars.max} atingido para ${vars.group}.`,
  },
  REMOVE_ITEMS_NOT_FOUND: {
    en: 'Selected items were not found in your cart.',
    pt: 'Os itens selecionados não foram encontrados no seu carrinho.',
  },
  CART_EMPTY: {
    en: 'Cart is empty or not found.',
    pt: 'O carrinho está vazio ou não foi encontrado.',
  },
  CUSTOMER_ID_REQUIRED: {
    en: 'Customer id is required.',
    pt: 'O ID do cliente é obrigatório.',
  },
  CART_UPDATE_RESTRICTED: {
    en: (vars: { status: string }) =>
      `You are not approved to update cart. Your account is ${vars.status}`,
    pt: (vars: { status: string }) =>
      `Você não está aprovado para atualizar o carrinho. Sua conta está ${vars.status}`,
  },
  CART_VIEW_RESTRICTED: {
    en: (vars: { status: string }) =>
      `You are not approved to view cart. Your account is ${vars.status}`,
    pt: (vars: { status: string }) =>
      `Você não está aprovado para visualizar o carrinho. Sua conta está ${vars.status}`,
  },

  // --- Zod Validation Messages ---
  VALIDATION_PRODUCT_ID_REQUIRED: {
    en: 'Product ID is required.',
    pt: 'O ID do produto é obrigatório.',
  },
  VALIDATION_QUANTITY_MIN: {
    en: 'Quantity must be at least 1.',
    pt: 'A quantidade deve ser pelo menos 1.',
  },
  VALIDATION_SKU_STRING: {
    en: 'Variation SKU must be a string.',
    pt: 'O SKU de variação deve ser uma string.',
  },
  VALIDATION_ACTION_REQUIRED: {
    en: 'Action is required.',
    pt: 'A ação é obrigatória.',
  },
  VALIDATION_ADDON_SKU_REQUIRED: {
    en: 'Add-on option SKU is required.',
    pt: 'O SKU da opção de adicional é obrigatório.',
  },
  VALIDATION_DELETE_MIN: {
    en: 'At least one item must be provided to delete.',
    pt: 'Pelo menos um item deve ser fornecido para exclusão.',
  },
} as const;
