export const addonMessages = {
  VENDOR_NOT_APPROVED: {
    en: 'Your merchant account is under review. You can manage addons once approved.',
    pt: 'Sua conta de fornecedor está em análise. Você poderá gerenciar adicionais assim que for aprovada.',
  },
  GROUP_ALREADY_EXISTS: {
    en: 'An addon group with this title already exists. Please use a different name.',
    pt: 'Um grupo de adicionais com este título já existe. Por favor, use um nome diferente.',
  },
  TAX_RECORDS_NOT_FOUND: {
    en: 'One or more assigned tax profiles could not be found.',
    pt: 'Um ou mais perfis de impostos atribuídos não foram encontrados.',
  },
  CREATE_SUCCESS: {
    en: 'Addon group created successfully.',
    pt: 'Grupo de adicionais criado com sucesso.',
  },
  TAX_RECORDS_INVALID: {
    en: 'The selected tax profiles are invalid or have been removed.',
    pt: 'Os perfis de impostos selecionados são inválidos ou foram removidos.',
  },
  GROUP_NOT_FOUND: {
    en: 'The requested addon group could not be found.',
    pt: 'O grupo de adicionais solicitado não pôde ser encontrado.',
  },
  UPDATE_NOT_FOUND_OR_UNAUTHORIZED: {
    en: 'Addon group not found or you do not have permission to modify it.',
    pt: 'Grupo de adicionais não encontrado ou você não tem permissão para modificá-lo.',
  },
  ADDON_GROUP_UPDATE_SUCCESS: {
    en: 'Addon group details updated successfully.',
    pt: 'Detalhes do grupo de adicionais atualizados com sucesso.',
  },
  TAX_ID_INVALID: {
    en: 'The provided Tax ID is invalid. Please verify and try again.',
    pt: 'O ID de imposto fornecido é inválido. Verifique e tente novamente.',
  },
  OPTION_ALREADY_EXISTS: {
    en: 'This option name is already taken within this group.',
    pt: 'Este nome de opção já está em uso neste grupo.',
  },
  ADD_OPTION_SUCCESS: {
    en: 'New option added to the addon group successfully.',
    pt: 'Nova opção adicionada ao grupo de adicionais com sucesso.',
  },
  GROUP_OR_OPTION_NOT_FOUND: {
    en: 'The addon group or the selected option could not be found.',
    pt: 'O grupo de adicionais ou a opção selecionada não pôde ser encontrado.',
  },
  OPTION_NOT_FOUND: {
    en: 'The selected option could not be found.',
    pt: 'A opção selecionada não pôde ser encontrada.',
  },
  TOGGLE_OPTION_SUCCESS: {
    en: (vars: { status: string }) =>
      `Option status updated to ${vars.status} successfully.`,
    pt: (vars: { status: string }) =>
      `Status da opção atualizado para ${vars.status === 'active' ? 'ativo' : 'inativo'} com sucesso.`,
  },
  DELETE_OPTION_NOT_FOUND_OR_UNAUTHORIZED: {
    en: 'Could not remove option. The group or option might not exist.',
    pt: 'Não foi possível remover a opção. O grupo ou a opção podem não existir.',
  },
  DELETE_OPTION_SUCCESS: {
    en: 'Option removed from the addon group successfully.',
    pt: 'Opção removida do grupo de adicionais com sucesso.',
  },
  DELETE_NOT_FOUND_OR_UNAUTHORIZED: {
    en: 'Action denied or the addon group has already been deleted.',
    pt: 'Ação negada ou o grupo de adicionais já foi excluído.',
  },
  DELETE_SUCCESS: {
    en: 'Addon group deleted successfully.',
    pt: 'Grupo de adicionais excluído com sucesso.',
  },
} as const;
