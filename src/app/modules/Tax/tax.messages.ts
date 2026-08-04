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
} as const;
