export const globalSettingMessages = {
  NOT_APPROVED_STATUS_TEMPLATE: {
    en: (vars: { status: string }) =>
      `Access denied. Your current account status is ${vars.status.toLowerCase()}.`,
    pt: (vars: { status: string }) =>
      `Acesso negado. O status atual da sua conta é ${vars.status.toLowerCase()}.`,
  },
  SETTINGS_ALREADY_EXIST_UPDATE_INSTEAD: {
    en: 'Global configuration parameters already exist. Please update the existing record.',
    pt: 'As configurações globais já existem. Por favor, atualize o registro existente.',
  },
  PLATFORM_COMMISSION_RANGE_INVALID: {
    en: 'Platform commission rate must be a value between 0% and 100%.',
    pt: 'A taxa de comissão da plataforma deve ser um valor entre 0% e 100%.',
  },
  MAX_DISCOUNT_RANGE_INVALID: {
    en: 'Maximum campaign discount percentage must be between 0% and 100%.',
    pt: 'O percentual máximo de desconto da campanha deve estar entre 0% e 100%.',
  },
  DELIVERY_PARTNER_COMMISSION_RANGE_INVALID: {
    en: 'Delivery partner commission rate must be configured between 0% and 100%.',
    pt: 'A taxa de comissão do parceiro de entrega deve ser configurada entre 0% e 100%.',
  },
  SETTINGS_CREATED_SUCCESS: {
    en: 'Global platform settings initialized successfully.',
    pt: 'Configurações globais da plataforma inicializadas com sucesso.',
  },
  ONLY_ADMIN_CAN_UPDATE: {
    en: 'Access denied. Global configuration updates are restricted to administrators.',
    pt: 'Acesso negado. As alterações de configurações globais são restritas a administradores.',
  },
  SETTINGS_NOT_FOUND_CREATE_FIRST: {
    en: 'Global settings not found. Please initialize settings first.',
    pt: 'Configurações globais não encontradas. Por favor, inicialize as configurações primeiro.',
  },
  PAYOUT_DAYS_REQUIRED_FOR_AUTOGENERATE: {
    en: 'Please specify at least one payout day when auto-generation is active.',
    pt: 'Por favor, especifique pelo menos um dia de pagamento quando a geração automática estiver ativa.',
  },
  FREE_DELIVERY_NEGATIVE_INVALID: {
    en: 'Free delivery order threshold amount cannot be negative.',
    pt: 'O valor mínimo de pedido para entrega gratuita não pode ser negativo.',
  },
  MAINTENANCE_DEFAULT_MESSAGE: {
    en: 'The system is currently undergoing scheduled maintenance. Please check back shortly.',
    pt: 'O sistema está passando por uma manutenção programada. Por favor, tente novamente em breve.',
  },
  SETTINGS_UPDATED_SUCCESS: {
    en: 'Global platform settings updated successfully.',
    pt: 'Configurações globais da plataforma atualizadas com sucesso.',
  },
  ONLY_ADMIN_CAN_ACCESS: {
    en: 'Access denied. Global settings view is restricted to administrators.',
    pt: 'Acesso negado. A visualização das configurações globais é restrita a administradores.',
  },
  SETTINGS_NOT_FOUND: {
    en: 'Global configuration settings could not be found.',
    pt: 'Configurações globais de configuração não puderam ser encontradas.',
  },
} as const;
