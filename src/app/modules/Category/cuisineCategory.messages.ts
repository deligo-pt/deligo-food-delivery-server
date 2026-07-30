export const cuisineCategoryMessages = {
  ALREADY_EXISTS: {
    en: 'This cuisine already exists. Please choose a different name.',
    pt: 'Esta culinária já existe. Por favor, escolha um nome diferente.',
  },
  IMAGE_REQUIRED: {
    en: 'An image file is required for this cuisine.',
    pt: 'Uma imagem é obrigatória para esta culinária.',
  },
  CUISINE_NOT_FOUND: {
    en: 'The requested cuisine could not be found.',
    pt: 'A culinária solicitada não pôde ser encontrada.',
  },
  ALREADY_ACTIVE: {
    en: 'This cuisine is already active.',
    pt: 'Esta culinária já está ativa.',
  },
  ALREADY_INACTIVE: {
    en: 'This cuisine is already inactive.',
    pt: 'Esta culinária já está inativa.',
  },
  ALREADY_SOFT_DELETED: {
    en: 'This cuisine has already been deactivated.',
    pt: 'Esta culinária já foi desativada.',
  },
  CANNOT_DELETE_ACTIVE: {
    en: 'An active cuisine cannot be deleted. Please deactivate it first.',
    pt: 'Não é possível excluir uma culinária ativa. Por favor, desative-a primeiro.',
  },
  SOFT_DELETE_FIRST: {
    en: 'This item must be deactivated before performing a permanent deletion.',
    pt: 'Este item deve ser desativado antes de realizar a exclusão permanente.',
  },
  CUISINE_CREATE_SUCCESS: {
    en: 'Cuisine created successfully.',
    pt: 'Culinária criada com sucesso.',
  },
  CUISINE_UPDATE_SUCCESS: {
    en: 'Cuisine details updated successfully.',
    pt: 'Detalhes da culinária atualizados com sucesso.',
  },

  SOFT_DELETE_SUCCESS: {
    en: 'Cuisine removed successfully.',
    pt: 'Culinária removida com sucesso.',
  },
  PERMANENT_DELETE_SUCCESS: {
    en: 'Cuisine permanently purged from the system.',
    pt: 'Culinária eliminada permanentemente do sistema.',
  },
} as const;
