export const restrictedItemsMessages = {
  // --- Unique Validation & Logic Errors ---
  ITEM_ALREADY_RESTRICTED: {
    en: 'This item is already in the restricted list.',
    pt: 'Este item já está na lista de restritos.',
  },
  RESTRICTED_ITEMS_NOT_FOUND: {
    en: 'Restricted items could not be found.',
    pt: 'Itens restritos não encontrados.',
  },
  RESTRICTED_ITEM_NOT_FOUND: {
    en: 'The requested restricted item could not be found.',
    pt: 'Item restrito não encontrado.',
  },

  // --- Unique Lifecycle Success Messages ---
  ITEM_ADDED_TO_RESTRICTED_LIST_SUCCESS: {
    en: 'Item added to restricted list successfully.',
    pt: 'Item adicionado à lista de restritos com sucesso.',
  },
  ITEM_UPDATED_SUCCESS: {
    en: 'Restricted item updated successfully.',
    pt: 'Item atualizado com sucesso.',
  },
  ITEM_DELETED_SUCCESS: {
    en: 'Item removed from restricted list successfully.',
    pt: 'Item removido da lista de restritos com sucesso.',
  },
  ITEM_PERMANENTLY_DELETED_SUCCESS: {
    en: 'Item permanently deleted from the system.',
    pt: 'Item excluído permanentemente com sucesso.',
  },

  // --- Global Mappings Block (To be handled by globalCommonMessages) ---
  ITEMS_RETRIEVED_SUCCESS: {
    en: 'Items loaded successfully.',
    pt: 'Itens carregados com sucesso.',
  },
  ITEM_RETRIEVED_SUCCESS: {
    en: 'Item details loaded successfully.',
    pt: 'Item carregado com sucesso.',
  },
} as const;
