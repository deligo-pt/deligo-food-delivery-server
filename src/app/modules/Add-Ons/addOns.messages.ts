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
} as const;
