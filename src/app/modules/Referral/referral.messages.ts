export const referralMessages = {
  INVALID_USER_ROLE: {
    en: 'Invalid user role',
    pt: 'Função de usuário inválida',
  },
  INVALID_REFERRAL_CODE: {
    en: 'Please enter a valid referral code.',
    pt: 'Por favor, insira um código de recomendação válido.',
  },
  REFERRAL_ALREADY_PROCESSED_OR_NOT_FOUND: {
    en: 'Referral already processed or not found',
    pt: 'Recomendação já processada ou não encontrada',
  },
  ORDER_DATA_MISSING: {
    en: 'Order data missing',
    pt: 'Dados do pedido em falta',
  },
  MIN_ORDER_CONDITION_FAILED_LOG: {
    en: (vars: { total: number; min: number }) =>
      `Condition failed: EUR ${vars.total} < EUR ${vars.min}`,
    pt: (vars: { total: number; min: number }) =>
      `Condição falhou: EUR ${vars.total} < EUR ${vars.min}`,
  },
  MILESTONE_REACHED_MIN_ORDER_NOT_MET: {
    en: 'Milestone reached but min order amount not met',
    pt: 'Marco atingido, mas o valor mínimo do pedido não foi cumprido',
  },
  MIN_ORDER_AMOUNT_NOT_MET: {
    en: 'Min order amount not met',
    pt: 'Valor mínimo do pedido não cumprido',
  },
  REFERRAL_BONUS_REMARK: {
    en: (vars: { level: number; rewardValue: number }) =>
      `Unlocked Level ${vars.level}: Received EUR ${vars.rewardValue} Credit`,
    pt: (vars: { level: number; rewardValue: number }) =>
      `Nível ${vars.level} Desbloqueado: Recebeu EUR ${vars.rewardValue} de Crédito`,
  },
  REFERRAL_MILESTONE_COUPON_REMARK: {
    en: (vars: { level: number }) =>
      `Earned from ${vars.level}th referral milestone`,
    pt: (vars: { level: number }) =>
      `Ganho a partir do ${vars.level}º marco de recomendação`,
  },
  REFERRAL_DISTRIBUTION_ERROR_LOG: {
    en: 'Referral distribution error:',
    pt: 'Erro na distribuição de recomendação:',
  },
  REFERRAL_STATS_RETRIEVED_SUCCESS: {
    en: 'Referral statistics and history retrieved successfully.',
    pt: 'Estatísticas e histórico de recomendações recuperados com sucesso.',
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
