export const businessCategoryMessages = {
  ALREADY_EXISTS: {
    en: 'This business category already exists.',
    pt: 'Esta categoria de negócio já existe.',
  },
  INVALID_BUSINESS_CATEGORY_NAME: {
    en: 'Please provide a valid business category name.',
    pt: 'Por favor, forneça um nome de categoria de negócio válido.',
  },
  ICON_IS_REQUIRED: {
    en: 'An icon image is required for this category.',
    pt: 'Um ícone é obrigatório para esta categoria.',
  },
  BUSINESS_CATEGORY_NOT_FOUND: {
    en: 'The requested business category could not be found.',
    pt: 'A categoria de negócio solicitada não pôde ser encontrada.',
  },
  ALREADY_ACTIVE: {
    en: 'This business category is already active.',
    pt: 'Esta categoria de negócio já está ativa.',
  },
  ALREADY_INACTIVE: {
    en: 'This business category is already inactive.',
    pt: 'Esta categoria de negócio já está inativa.',
  },
  ALREADY_DELETED: {
    en: 'This business category has already been removed.',
    pt: 'Esta categoria de negócio já foi removida.',
  },
  ACTIVE_CANNOT_DELETE: {
    en: 'An active category cannot be deleted. Please deactivate it first.',
    pt: 'Uma categoria ativa não pode ser excluída. Por favor, desative-a primeiro.',
  },
  SOFT_DELETE_FIRST: {
    en: 'This item must be deactivated before performing a permanent deletion.',
    pt: 'Este item deve ser desativado antes de realizar a exclusão permanente.',
  },
  BUSINESS_CATEGORY_CREATE_SUCCESS: {
    en: 'Business category created successfully.',
    pt: 'Categoria de negócio criada com sucesso.',
  },
  BUSINESS_CATEGORY_UPDATE_SUCCESS: {
    en: 'Business category details updated successfully.',
    pt: 'Detalhes da categoria de negócio atualizados com sucesso.',
  },
  SOFT_DELETE_SUCCESS: {
    en: 'Business category removed successfully.',
    pt: 'Categoria de negócio removida com sucesso.',
  },
  PERMANENT_DELETE_SUCCESS: {
    en: 'Business category permanently purged from the system.',
    pt: 'Categoria de negócio eliminada permanentemente do sistema.',
  },
} as const;
