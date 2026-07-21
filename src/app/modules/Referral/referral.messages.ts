export const referralMessages = {
  // --- Validation & Business Logic Errors ---
  INVALID_USER_ROLE: {
    en: 'Invalid user role selected.',
    pt: 'Função de usuário inválida selecionada.',
  },
  INVALID_REFERRAL_CODE: {
    en: 'Please enter a valid referral code.',
    pt: 'Por favor, insira um código de recomendação válido.',
  },
  REFERRAL_ALREADY_PROCESSED_OR_NOT_FOUND: {
    en: 'This referral has already been processed or could not be found.',
    pt: 'Esta recomendação já foi processada ou não pôde ser encontrada.',
  },
  ORDER_DATA_MISSING: {
    en: 'Order details are missing. Cannot process referral.',
    pt: 'Os detalhes do pedido estão ausentes. Não é possível processar a recomendação.',
  },
  MIN_ORDER_CONDITION_FAILED_LOG: {
    en: (vars: { total: number; min: number }) =>
      `Minimum amount check failed: ${vars.total} is less than required ${vars.min}.`,
    pt: (vars: { total: number; min: number }) =>
      `Verificação de valor mínimo falhou: ${vars.total} é menor do que o necessário ${vars.min}.`,
  },
  MILESTONE_REACHED_MIN_ORDER_NOT_MET: {
    en: 'Milestone reached, but the minimum order amount was not met.',
    pt: 'Marco atingido, mas o valor mínimo do pedido não foi atingido.',
  },
  MIN_ORDER_AMOUNT_NOT_MET: {
    en: 'Minimum order amount requirements not met.',
    pt: 'Os requisitos de valor mínimo do pedido não foram atingidos.',
  },

  // --- Dynamic Remarks & Logs ---
  REFERRAL_BONUS_REMARK: {
    en: (vars: { level: number; rewardValue: number }) =>
      `Unlocked Level ${vars.level}: Received ${vars.rewardValue} credit reward.`,
    pt: (vars: { level: number; rewardValue: number }) =>
      `Nível ${vars.level} Desbloqueado: Recebeu ${vars.rewardValue} de crédito de recompensa.`,
  },
  REFERRAL_MILESTONE_COUPON_REMARK: {
    en: (vars: { level: number }) =>
      `Earned from your ${vars.level}th referral milestone.`,
    pt: (vars: { level: number }) =>
      `Ganho a partir do ${vars.level}º marco de recomendação.`,
  },
  REFERRAL_DISTRIBUTION_ERROR_LOG: {
    en: 'Referral bonus distribution failed:',
    pt: 'Falha na distribuição do bônus de recomendação:',
  },

  // --- Success & Defaults ---
  REFERRAL_STATS_RETRIEVED_SUCCESS: {
    en: 'Referral statistics and history loaded successfully.',
    pt: 'Estatísticas e histórico de recomendações carregados com sucesso.',
  },
  DEFAULT_REFERRAL_CODE: {
    en: 'N/A',
    pt: 'N/D',
  },
  DEFAULT_REFERRAL_FRIEND_NAME: {
    en: 'DeliGo User',
    pt: 'Usuário DeliGo',
  },
} as const;
