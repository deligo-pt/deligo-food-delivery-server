export const taxMessages = {
  // --- Unique Taxation & Exemption Compliance Errors ---
  TAX_CODE_OR_RATE_ALREADY_EXISTS_IN_COUNTRY: {
    en: (vars: { taxCode: string; taxRate: number; countryID: string }) =>
      `A tax with code '${vars.taxCode}' or rate '${vars.taxRate}%' already exists in ${vars.countryID}.`,
    pt: (vars: { taxCode: string; taxRate: number; countryID: string }) =>
      `Já existe um imposto com o código '${vars.taxCode}' ou taxa de '${vars.taxRate}%' em ${vars.countryID}.`,
  },
  TAX_CONFIGURATION_NAME_ALREADY_EXISTS: {
    en: 'A tax configuration with this name already exists.',
    pt: 'Já existe uma configuração de imposto com este nome.',
  },
  TAX_RATE_ZERO_REQUIRES_EXEMPTION_COMPLIANCE: {
    en: 'Tax rate 0 requires a valid Tax Exemption Code and Localized Reason for Portugal compliance.',
    pt: 'A taxa de imposto 0 exige um Código de Isenção de Imposto válido e um Motivo Localizado para conformidade com Portugal.',
  },
  TAX_CONFLICT_CODE_OR_RATE_EXISTS: {
    en: 'Conflict: Another tax with this code or rate already exists.',
    pt: 'Conflito: Já existe outro imposto com este código ou taxa.',
  },
  TAX_RATE_ZERO_REQUIRES_EXEMPTION: {
    en: 'Tax rate 0 requires a valid Tax Exemption Code and Localized Reason.',
    pt: 'A taxa de imposto 0 exige um Código de Isenção de Imposto válido e um Motivo Localizado.',
  },
  ACTIVE_TAX_CANNOT_BE_DELETED_DEACTIVATE_FIRST: {
    en: 'Active tax cannot be deleted. Please deactivate it first.',
    pt: 'Um imposto ativo não pode ser excluído. Por favor, desative-o primeiro.',
  },

  // --- Unique Lifecycle Success Messages ---
  TAX_CREATED_SUCCESS: {
    en: 'Tax configuration created successfully.',
    pt: 'Imposto criado com sucesso.',
  },
  TAX_UPDATED_SUCCESS: {
    en: 'Tax configuration updated successfully.',
    pt: 'Imposto atualizado com sucesso.',
  },
  TAX_SOFT_DELETED_SUCCESS: {
    en: 'Tax configuration removed successfully.',
    pt: 'Imposto excluído logicamente com sucesso.',
  },
  TAX_PERMANENTLY_DELETED_SUCCESS: {
    en: 'Tax permanently deleted from the system.',
    pt: 'Imposto excluído permanentemente com sucesso.',
  },

  // --- Global Mappings Block (To be handled by globalCommonMessages) ---
  TAX_RECORD_NOT_FOUND_WITH_EXCLAMATION: {
    en: 'Tax record not found.',
    pt: 'Registro de imposto não encontrado.',
  },
  TAXES_RETRIEVED_SUCCESS: {
    en: 'Taxes loaded successfully.',
    pt: 'Impostos recuperados com sucesso.',
  },
  TAX_RECORD_NOT_FOUND: {
    en: 'Tax record not found.',
    pt: 'Registro de imposto não encontrado.',
  },
  TAX_RETRIEVED_SUCCESS: {
    en: 'Tax details loaded successfully.',
    pt: 'Imposto recuperado com sucesso.',
  },
  TAX_NOT_SOFT_DELETED_SOFT_DELETE_FIRST: {
    en: 'Deactivation required first.',
    pt: 'Desativação necessária primeiro.',
  },
} as const;
