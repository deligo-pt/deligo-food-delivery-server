export const ingredientsMessages = {
  ONLY_ADMIN_CAN_PERFORM_ACTION: {
    en: 'Access denied. Only system administrators can perform this action.',
    pt: 'Acesso negado. Apenas administradores do sistema podem realizar esta ação.',
  },
  TAX_CONFIGURATION_INVALID_OR_INACTIVE: {
    en: 'The provided Tax configuration ID is invalid, inactive, or does not exist.',
    pt: 'O ID de configuração de imposto fornecido é inválido, inativo ou não existe.',
  },
  INGREDIENT_CREATED_SUCCESS: {
    en: 'Ingredient stock record initialized successfully.',
    pt: 'Registro de estoque do ingrediente inicializado com sucesso.',
  },
  INGREDIENT_NOT_FOUND: {
    en: 'The specified ingredient master record could not be found.',
    pt: 'O registro mestre do ingrediente especificado não pôde ser encontrado.',
  },
  TAX_CONFIGURATION_INVALID_FOR_UPDATE: {
    en: 'The provided Tax configuration ID is invalid or inactive.',
    pt: 'O ID de configuração de imposto fornecido é inválido ou está inativo.',
  },
  INGREDIENT_UPDATED_SUCCESS: {
    en: 'Ingredient data profile updated successfully.',
    pt: 'Perfil de dados do ingrediente atualizado com sucesso.',
  },
  INGREDIENT_DETAILS_RETRIEVED_SUCCESS: {
    en: 'Ingredient specifications and asset data retrieved successfully.',
    pt: 'Especificações do ingrediente e dados de ativos recuperados com sucesso.',
  },
  INGREDIENTS_RETRIEVED_SUCCESS: {
    en: 'Global ingredients catalog index retrieved successfully.',
    pt: 'Índice do catálogo global de ingredientes recuperado com sucesso.',
  },
  INGREDIENT_NOT_FOUND_OR_ALREADY_DELETED: {
    en: 'Ingredient not found or has already been flagged as deleted.',
    pt: 'Ingrediente não encontrado ou já foi marcado como excluído.',
  },
  INGREDIENT_SOFT_DELETED_SUCCESS: {
    en: 'Ingredient record soft deleted successfully.',
    pt: 'Exclusão lógica do registro do ingrediente realizada com sucesso.',
  },
  SOFT_DELETE_REQUIRED_BEFORE_PERMANENT_DELETE: {
    en: 'Data compliance policy requires a soft delete before execution of permanent purge operations.',
    pt: 'A política de conformidade de dados exige uma exclusão lógica antes da execução de operações de eliminação permanente.',
  },
  INGREDIENT_PERMANENTLY_REMOVED_SUCCESS: {
    en: 'Ingredient data record permanently purged from database structures.',
    pt: 'Registro de dados do ingrediente eliminado permanentemente das estruturas do banco de dados.',
  },
} as const;
