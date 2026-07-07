export const productMessages = {
  // --- Validation & Business Logic Errors ---
  VENDOR_NOT_APPROVED_TO_ADD_PRODUCTS: {
    en: 'Vendor is not approved to add products.',
    pt: 'O vendedor não está aprovado para adicionar produtos.',
  },
  PRICE_REQUIRED_WHEN_NO_VARIATIONS: {
    en: 'Price is required when no variations are specified.',
    pt: 'O preço é obrigatório quando não há variações.',
  },
  CATEGORY_NOT_FOUND: {
    en: 'The requested product category could not be found.',
    pt: 'A categoria de produto solicitada não pôde ser encontrada.',
  },
  CATEGORY_NOT_UNDER_BUSINESS_TYPE: {
    en: 'This product category does not belong to your business type.',
    pt: 'A categoria de produto não pertence ao seu tipo de negócio.',
  },
  STOCK_MANAGEMENT_NOT_ALLOWED_FOR_RESTAURANTS: {
    en: 'Stock management is not available for restaurant accounts.',
    pt: 'A gestão de estoque não é permitida para Restaurantes.',
  },
  INVALID_ADDON_GROUPS: {
    en: 'One or more selected addon groups are invalid.',
    pt: 'Um ou mais grupos de adicionais são inválidos.',
  },
  TAX_NOT_FOUND: {
    en: 'Tax configuration could not be found.',
    pt: 'Imposto não encontrado.',
  },
  VARIATION_NAMES_REQUIRED_BOTH_LANGUAGES: {
    en: 'Variation names are required in both English and Portuguese.',
    pt: 'Os nomes das variações são obrigatórios tanto em inglês quanto em português.',
  },
  VARIATION_OPTION_LABELS_REQUIRED_BOTH_LANGUAGES: {
    en: 'Variation options must include both English and Portuguese labels.',
    pt: 'As opções de variação devem ter rótulos em inglês e português.',
  },
  OPTION_ALREADY_EXISTS: {
    en: (vars: { label: string }) => `Option '${vars.label}' already exists.`,
    pt: (vars: { label: string }) => `A opção '${vars.label}' já existe.`,
  },
  VARIATION_SKU_ALREADY_IN_USE: {
    en: (vars: { sku: string }) => `SKU ${vars.sku} is already in use.`,
    pt: (vars: { sku: string }) => `O SKU ${vars.sku} já está em uso.`,
  },
  VARIATION_STOCK_NOT_ALLOWED_FOR_RESTAURANTS: {
    en: 'Variation stock quantity is not available for restaurant accounts.',
    pt: 'A quantidade de estoque por variação não é permitida para Restaurantes.',
  },
  VARIATION_GROUP_NOT_FOUND: {
    en: (vars: { name: string }) =>
      `Variation group '${vars.name}' could not be found.`,
    pt: (vars: { name: string }) =>
      `Grupo de variação '${vars.name}' não encontrado.`,
  },
  AT_LEAST_ONE_VARIATION_NAME_TRANSLATION_REQUIRED: {
    en: 'At least one name translation (English or Portuguese) must be provided.',
    pt: 'Pelo menos uma tradução de idioma (inglês ou português) deve ser fornecida.',
  },
  VARIATION_GROUP_ENGLISH_DUPLICATE: {
    en: (vars: { name: string }) =>
      `Another variation group named '${vars.name}' (English) already exists.`,
    pt: (vars: { name: string }) =>
      `Já existe outro grupo de variação chamado '${vars.name}' (Inglês).`,
  },
  VARIATION_GROUP_PORTUGUESE_DUPLICATE: {
    en: (vars: { name: string }) =>
      `Another variation group named '${vars.name}' (Portuguese) already exists.`,
    pt: (vars: { name: string }) =>
      `Já existe outro grupo de variação chamado '${vars.name}' (Português).`,
  },
  AT_LEAST_ONE_OPTION_LABEL_TRANSLATION_REQUIRED: {
    en: 'At least one option label translation (English or Portuguese) must be provided.',
    pt: 'Pelo menos uma tradução do rótulo da opção (inglês ou português) deve ser fornecida.',
  },
  VARIATION_OPTION_NOT_FOUND_IN_GROUP: {
    en: (vars: { label: string; group: string }) =>
      `Option '${vars.label}' not found in variation group '${vars.group}'.`,
    pt: (vars: { label: string; group: string }) =>
      `A opção '${vars.label}' não foi encontrada no grupo de variação '${vars.group}'.`,
  },
  OPTION_LABEL_ENGLISH_DUPLICATE_IN_GROUP: {
    en: (vars: { label: string }) =>
      `An option with label '${vars.label}' (English) already exists in this group.`,
    pt: (vars: { label: string }) =>
      `Uma opção com o rótulo '${vars.label}' (Inglês) já existe neste grupo.`,
  },
  OPTION_LABEL_PORTUGUESE_DUPLICATE_IN_GROUP: {
    en: (vars: { label: string }) =>
      `An option with label '${vars.label}' (Portuguese) already exists in this group.`,
    pt: (vars: { label: string }) =>
      `Uma opção com o rótulo '${vars.label}' (Português) já existe neste grupo.`,
  },
  NO_VARIATIONS_FOUND_TO_REMOVE: {
    en: 'No variations were found to remove.',
    pt: 'Nenhuma variação encontrada para remover.',
  },
  OPTION_NOT_FOUND_IN_VARIATION: {
    en: (vars: { label: string; name: string }) =>
      `Option '${vars.label}' not found in '${vars.name}'.`,
    pt: (vars: { label: string; name: string }) =>
      `A opção '${vars.label}' não foi encontrada em '${vars.name}'.`,
  },
  PRODUCT_HAS_NO_VARIATIONS_FOR_SKU_UPDATE: {
    en: 'This product has no variations. Cannot update using variation SKU.',
    pt: 'Este produto não possui variações. Não é possível atualizar usando variationSku.',
  },
  VARIATION_SKU_REQUIRED_FOR_PRODUCT: {
    en: 'Variation SKU is required for this product.',
    pt: 'O SKU da variação é obrigatório para este produto.',
  },
  INSUFFICIENT_STOCK_WITH_AVAILABLE: {
    en: (vars: { available: number }) =>
      `Insufficient stock. Available units: ${vars.available}.`,
    pt: (vars: { available: number }) =>
      `Estoque insuficiente. Disponível: ${vars.available}.`,
  },
  VARIATION_SKU_NOT_FOUND: {
    en: 'Variation SKU could not be found.',
    pt: 'SKU da variação não encontrado.',
  },
  INSUFFICIENT_STOCK: {
    en: 'Insufficient stock available.',
    pt: 'Estoque insuficiente.',
  },
  PRODUCT_ALREADY_IN_STATUS: {
    en: (vars: { status: string }) =>
      `Product is already ${vars.status.toLowerCase()}.`,
    pt: (vars: { status: string }) =>
      `O produto já está ${vars.status.toLowerCase()}.`,
  },
  REMARKS_REQUIRED_WHEN_REJECTING: {
    en: 'Remarks are required when rejecting a product.',
    pt: 'Observações são obrigatórias ao rejeitar um produto.',
  },
  IMAGES_DO_NOT_BELONG_TO_PRODUCT: {
    en: 'The selected images do not belong to this product.',
    pt: 'As seguintes imagens não pertencem a este produto.',
  },
  AT_LEAST_ONE_IMAGE_MUST_REMAIN: {
    en: 'A product must have at least one image. You cannot delete all images.',
    pt: 'Um produto deve ter pelo menos uma imagem restante. Você não pode excluir todas as imagens.',
  },
  CANNOT_DELETE_PRODUCT_WITH_ACTIVE_ORDER: {
    en: 'Cannot delete product. This item is currently tied to an active order.',
    pt: 'Não é possível excluir o produto. Este produto está atualmente vinculado a um pedido ativo em andamento.',
  },

  // --- Unique Lifecycle Success Messages ---
  PRODUCT_CREATED_SUCCESS: {
    en: 'Product created successfully.',
    pt: 'Produto criado com sucesso.',
  },
  PRODUCT_UPDATED_SUCCESS: {
    en: 'Product updated successfully.',
    pt: 'Produto atualizado com sucesso.',
  },
  PRODUCT_VARIATIONS_UPDATED_SUCCESS: {
    en: 'Product variations updated successfully.',
    pt: 'Variações do produto atualizadas com sucesso.',
  },
  PRODUCT_VARIATIONS_RENAMED_SUCCESS: {
    en: 'Product variations renamed successfully.',
    pt: 'Variações do produto renomeadas com sucesso.',
  },
  PRODUCT_VARIATIONS_REMOVED_SUCCESS: {
    en: 'Product variations removed successfully.',
    pt: 'Variações do produto removidas com sucesso.',
  },
  INVENTORY_AND_PRICING_UPDATED_SUCCESS: {
    en: 'Inventory and pricing updated successfully.',
    pt: 'Inventário e preços atualizados com sucesso.',
  },
  PRODUCT_APPROVAL_UPDATED_SUCCESS: {
    en: (vars: { status: string }) =>
      `Product has been ${vars.status.toLowerCase()} successfully.`,
    pt: (vars: { status: string }) =>
      `O produto foi ${vars.status.toLowerCase()} com sucesso.`,
  },
  PRODUCT_IMAGES_DELETED_SUCCESS: {
    en: 'Product images deleted successfully.',
    pt: 'Imagens do produto excluídas com sucesso.',
  },
  PRODUCT_SOFT_DELETED_SUCCESS: {
    en: (vars: { productName: string }) =>
      `${vars.productName} has been deleted successfully.`,
    pt: (vars: { productName: string }) =>
      `${vars.productName} foi excluído com sucesso.`,
  },
  PRODUCT_PERMANENTLY_DELETED_SUCCESS: {
    en: (vars: { productName: string }) =>
      `${vars.productName} has been permanently deleted.`,
    pt: (vars: { productName: string }) =>
      `${vars.productName} foi excluído permanentemente.`,
  },
  DEFAULT_PRODUCT_NAME: {
    en: 'Product',
    pt: 'Produto',
  },

  // --- Global Mappings Block (To be replaced by globalCommonMessages) ---
  NOT_AUTHORIZED_TO_UPDATE_ACCOUNT_STATUS: {
    en: 'Access denied.',
    pt: 'Acesso negado.',
  },
  PRODUCT_NOT_FOUND: {
    en: 'Product not found.',
    pt: 'Produto não encontrado.',
  },
  ACCOUNT_NOT_APPROVED: {
    en: 'Access denied. Account not approved.',
    pt: 'Acesso negado. Conta não aprovada.',
  },
  NOT_AUTHORIZED_TO_UPDATE_PRODUCT: {
    en: 'Access denied.',
    pt: 'Acesso negado.',
  },
  NOT_APPROVED_TO_DELETE_PRODUCT_IMAGES: {
    en: 'Access denied.',
    pt: 'Acesso negado.',
  },
  ONLY_OWN_PRODUCT_IMAGES_CAN_BE_DELETED: {
    en: 'Access denied.',
    pt: 'Acesso negado.',
  },
  NOT_APPROVED_TO_VIEW_PRODUCTS: { en: 'Access denied.', pt: 'Acesso negado.' },
  PRODUCTS_RETRIEVED_SUCCESS: {
    en: 'Products loaded successfully.',
    pt: 'Produtos carregados com sucesso.',
  },
  UNAUTHORIZED_ROLE_ACCESS: { en: 'Access denied.', pt: 'Acesso negado.' },
  PRODUCT_RETRIEVED_SUCCESS: {
    en: 'Product loaded successfully.',
    pt: 'Produto carregado com sucesso.',
  },
  NOT_APPROVED_TO_DELETE_PRODUCT: {
    en: 'Access denied.',
    pt: 'Acesso negado.',
  },
  NOT_AUTHORIZED_TO_DELETE_PRODUCT: {
    en: 'Access denied.',
    pt: 'Acesso negado.',
  },
  PRODUCT_ALREADY_DELETED: {
    en: 'Product already deleted.',
    pt: 'Produto já excluído.',
  },
  NOT_APPROVED_TO_PERMANENTLY_DELETE_PRODUCT: {
    en: 'Access denied.',
    pt: 'Acesso negado.',
  },
  ONLY_ADMINS_CAN_PERMANENTLY_DELETE_PRODUCTS: {
    en: 'Access denied.',
    pt: 'Acesso negado.',
  },
  PRODUCT_SOFT_DELETE_REQUIRED_BEFORE_PERMANENT_DELETE: {
    en: 'Deactivation required first.',
    pt: 'Desativação necessária primeiro.',
  },
} as const;
