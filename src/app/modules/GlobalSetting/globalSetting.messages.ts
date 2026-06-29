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
    en: 'Platform commission rate parameters must be assigned a value between 0% and 100%.',
    pt: 'A taxa de comissão da plataforma deve ser um valor entre 0% e 100%.',
  },
  MAX_DISCOUNT_RANGE_INVALID: {
    en: 'Maximum campaign discount percentage boundaries must be between 0% and 100%.',
    pt: 'O percentual máximo de desconto da campanha deve estar entre 0% e 100%.',
  },
  DELIVERY_PARTNER_COMMISSION_RANGE_INVALID: {
    en: 'Delivery partner commission rate fields must be configured between 0% and 100%.',
    pt: 'A taxa de comissão do parceiro de entrega deve ser configurada entre 0% e 100%.',
  },
  SETTINGS_CREATED_SUCCESS: {
    en: 'Global platform configuration entities initialized successfully.',
    pt: 'Configurações globais da plataforma inicializadas com sucesso.',
  },
  ONLY_ADMIN_CAN_UPDATE: {
    en: 'Access denied. Global configuration updates are restricted to platform administrators.',
    pt: 'Acesso negado. As alterações de configurações globais são restritas a administradores do sistema.',
  },
  SETTINGS_NOT_FOUND_CREATE_FIRST: {
    en: 'Global settings configuration profile not found. Please initialize settings first.',
    pt: 'Perfil de configuração global não encontrado. Por favor, inicialize as configurações primeiro.',
  },
  PAYOUT_DAYS_REQUIRED_FOR_AUTOGENERATE: {
    en: 'At least one specific payout execution day must be designated when auto-generation is active.',
    pt: 'Pelo menos um dia de execução de pagamento deve ser designado quando a geração automática estiver ativa.',
  },
  FREE_DELIVERY_NEGATIVE_INVALID: {
    en: 'Free delivery qualification order threshold amount cannot be negative.',
    pt: 'O valor mínimo de pedido para entrega gratuita não pode ser um número negativo.',
  },
  MAINTENANCE_DEFAULT_MESSAGE: {
    en: 'The system is currently undergoing scheduled infrastructure maintenance. Please check back shortly.',
    pt: 'O sistema está passando por uma manutenção programada de infraestrutura. Por favor, tente novamente em breve.',
  },
  SETTINGS_UPDATED_SUCCESS: {
    en: 'Global platform configuration variables updated successfully.',
    pt: 'Variáveis de configuração global da plataforma atualizadas com sucesso.',
  },
  ONLY_ADMIN_CAN_ACCESS: {
    en: 'Access denied. Global system settings inspection is restricted to platform administrators.',
    pt: 'Acesso negado. A inspeção de configurações globais do sistema é restrita a administradores.',
  },
  SETTINGS_NOT_FOUND: {
    en: 'Global operational configuration settings record not found.',
    pt: 'Registro de configurações globais de operação não encontrado.',
  },
  SETTINGS_FETCHED_SUCCESS: {
    en: 'Global operation configuration variables statement loaded successfully.',
    pt: 'Variáveis de configuração global de operação carregadas com sucesso.',
  },
} as const;
