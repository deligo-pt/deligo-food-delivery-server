export const addonMessages = {
  VENDOR_NOT_APPROVED: {
    en: 'Your vendor account is not approved yet.',
    pt: 'Sua conta de fornecedor ainda não está aprovada.',
  },
  GROUP_ALREADY_EXISTS: {
    en: 'An addon group with this title already exists.',
    pt: 'Um grupo de adicionais com este título já existe.',
  },
  TAX_RECORDS_NOT_FOUND: {
    en: 'One or more assigned tax records were not found.',
    pt: 'Um ou mais registros de impostos atribuídos não foram encontrados.',
  },
  CREATE_SUCCESS: {
    en: 'Addon group created successfully.',
    pt: 'Grupo de adicionais criado com sucesso.',
  },
  TAX_RECORDS_INVALID: {
    en: 'One or more tax records are invalid or deleted.',
    pt: 'Um ou mais registros de impostos são inválidos ou foram excluídos.',
  },
  GROUP_NOT_FOUND: {
    en: 'Addon group not found.',
    pt: 'Grupo de adicionais não encontrado.',
  },
  UPDATE_NOT_FOUND_OR_UNAUTHORIZED: {
    en: 'Addon group not found or you do not have permission to modify it.',
    pt: 'Grupo de adicionais não encontrado ou você não tem permissão para modificá-lo.',
  },
  UPDATE_SUCCESS: {
    en: 'Addon group updated successfully.',
    pt: 'Grupo de adicionais atualizado com sucesso.',
  },
  TAX_ID_INVALID: {
    en: 'The provided Tax ID is invalid.',
    pt: 'O ID de imposto fornecido é inválido.',
  },
  OPTION_ALREADY_EXISTS: {
    en: 'An option with this name already exists in this group.',
    pt: 'Uma opção com este nome já existe neste grupo.',
  },
  ADD_OPTION_SUCCESS: {
    en: 'Option added to addon group successfully.',
    pt: 'Opção adicionada ao grupo de adicionais com sucesso.',
  },
  GROUP_OR_OPTION_NOT_FOUND: {
    en: 'Addon group or option not found.',
    pt: 'Grupo de adicionais ou opção não encontrado.',
  },
  OPTION_NOT_FOUND: {
    en: 'Option not found.',
    pt: 'Opção não encontrada.',
  },
  TOGGLE_OPTION_SUCCESS: {
    en: (vars: { status: string }) =>
      `Option status updated to ${vars.status}.`,
    pt: (vars: { status: string }) =>
      `Status da opção atualizado para ${vars.status === 'active' ? 'ativo' : 'inativo'}.`,
  },
  DELETE_OPTION_NOT_FOUND_OR_UNAUTHORIZED: {
    en: 'Addon group not found or the option does not exist in this group.',
    pt: 'Grupo de adicionais não encontrado ou a opção não existe neste grupo.',
  },
  DELETE_OPTION_SUCCESS: {
    en: 'Option deleted from addon group successfully.',
    pt: 'Opção excluída do grupo de adicionais com sucesso.',
  },
  FETCH_ALL_SUCCESS: {
    en: 'Addon groups fetched successfully.',
    pt: 'Grupos de adicionais recuperados com sucesso.',
  },
  FETCH_SINGLE_SUCCESS: {
    en: 'Addon group fetched successfully.',
    pt: 'Grupo de adicionais recuperado com sucesso.',
  },
  DELETE_NOT_FOUND_OR_UNAUTHORIZED: {
    en: 'Addon group not found, already deleted, or unauthorized.',
    pt: 'Grupo de adicionais não encontrado, já excluído ou não autorizado.',
  },
  DELETE_SUCCESS: {
    en: 'Addon group deleted successfully.',
    pt: 'Grupo de adicionais excluído com sucesso.',
  },
  PRICE_NEGATIVE: {
    en: 'Price cannot be negative.',
    pt: 'O preço não pode ser negativo.',
  },
  PRICE_REQUIRED: {
    en: 'Price is required.',
    pt: 'O preço é obrigatório.',
  },
  TAX_REQUIRED: {
    en: 'Tax ID is required for each option.',
    pt: 'O ID do imposto é obrigatório para cada opção.',
  },
  MIN_SELECTABLE_NEGATIVE: {
    en: 'Minimum selection cannot be negative.',
    pt: 'A seleção mínima não pode ser negativa.',
  },
  MAX_SELECTABLE_MIN: {
    en: 'Maximum selection must be at least 1.',
    pt: 'A seleção máxima deve ser pelo menos 1.',
  },
  OPTIONS_MIN: {
    en: 'At least one option must be provided in the group.',
    pt: 'Pelo menos uma opção deve ser fornecida no grupo.',
  },
  MIN_GREATER_THAN_MAX: {
    en: 'Minimum selectable options cannot be greater than maximum selectable options.',
    pt: 'O mínimo de opções selecionáveis não pode ser maior que o máximo de opções selecionáveis.',
  },
  MAX_EXCEEDS_OPTIONS: {
    en: 'Maximum selectable options cannot exceed the total number of available options.',
    pt: 'O máximo de opções selecionáveis não pode exceder o número total de opções disponíveis.',
  },
  OPTION_SKU_REQUIRED: {
    en: 'Option SKU is required.',
    pt: 'O SKU da opção é obrigatório.',
  },
} as const;
