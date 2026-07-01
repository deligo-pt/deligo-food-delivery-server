export const payoutMessages = {
  TARGET_USER_NOT_FOUND: {
    en: 'Target user not found',
    pt: 'Usuário de destino não encontrado',
  },
  FLEET_MANAGER_ONLY_SETTLE_DELIVERY_PARTNERS: {
    en: 'Fleet Managers can only settle with Delivery Partners.',
    pt: 'Os gestores de frota apenas podem efetuar liquidações com parceiros de entrega.',
  },
  ONLY_OWN_DELIVERY_PARTNERS_SETTLEMENT: {
    en: 'You can only initiate settlement for your own delivery partners.',
    pt: 'Apenas pode iniciar a liquidação para os seus próprios parceiros de entrega.',
  },
  BANK_DETAILS_INCOMPLETE_TITLE: {
    en: 'Bank Details Incomplete',
    pt: 'Dados Bancários Incompletos',
  },
  BANK_DETAILS_INCOMPLETE_BODY: {
    en: 'Settlement could not be initiated because your bank details are missing. Please update them.',
    pt: 'A liquidação não pôde ser iniciada porque faltam os seus dados bancários. Por favor, atualize-os.',
  },
  CANNOT_INITIATE_SETTLEMENT_INCOMPLETE_BANK_DETAILS: {
    en: 'Cannot initiate settlement. Delivery partner has incomplete bank details.',
    pt: 'Não é possível iniciar a liquidação. O parceiro de entrega tem dados bancários incompletos.',
  },
  NO_UNPAID_EARNINGS_TO_SETTLE: {
    en: 'No unpaid earnings to settle.',
    pt: 'Não existem ganhos não pagos para liquidar.',
  },
  PAYOUT_INITIATED_TITLE: {
    en: 'Payout initiated',
    pt: 'Pagamento iniciado',
  },
  PAYOUT_INITIATED_BODY: {
    en: 'Payout initiated successfully',
    pt: 'Pagamento iniciado com sucesso',
  },
  SETTLEMENT_INITIATED_SUCCESS: {
    en: 'Settlement initiated successfully',
    pt: 'Liquidação iniciada com sucesso',
  },
  INVALID_PAYOUT_SESSION_OR_ALREADY_PAID: {
    en: 'Invalid payout session or already paid.',
    pt: 'Sessão de pagamento inválida ou já paga.',
  },
  PAYOUT_PROOF_MANDATORY: {
    en: 'Payout proof image is mandatory.',
    pt: 'A imagem do comprovativo de pagamento é obrigatória.',
  },
  WEEKLY_SETTLEMENT_COMPLETED: {
    en: 'Weekly settlement completed',
    pt: 'Liquidação semanal concluída',
  },
  SETTLEMENT_COMPLETED_TITLE: {
    en: 'Settlement completed',
    pt: 'Liquidação concluída',
  },
  SETTLEMENT_COMPLETED_BODY: {
    en: (vars: { amount: number }) =>
      `Your settlement of €${vars.amount} has been processed successfully.`,
    pt: (vars: { amount: number }) =>
      `A sua liquidação no valor de €${vars.amount} foi processada com sucesso.`,
  },
  SETTLEMENT_COMPLETED_SUCCESS: {
    en: 'Settlement completed successfully.',
    pt: 'Liquidação concluída com sucesso.',
  },
  PAYOUTS_FETCHED_SUCCESS: {
    en: 'Payouts fetched successfully',
    pt: 'Pagamentos recuperados com sucesso',
  },
  PAYOUT_RECORD_NOT_FOUND: {
    en: 'Payout record not found.',
    pt: 'Registo de pagamento não encontrado.',
  },
  NO_PERMISSION_TO_VIEW_PAYOUT_DETAIL: {
    en: 'You do not have permission to view this payout detail.',
    pt: 'Não tem permissão para visualizar os detalhes deste pagamento.',
  },
  PAYOUT_FETCHED_SUCCESS: {
    en: 'Payout fetched successfully',
    pt: 'Pagamento recuperado com sucesso',
  },
  GLOBAL_SETTINGS_NOT_FOUND: {
    en: 'Global settings not found',
    pt: 'Configurações globais não encontradas',
  },
  INCOMPLETE_BANK_DETAILS_PT_TITLE: {
    en: 'Dados Bancarios Incompletos',
    pt: 'Dados Bancários Incompletos',
  },
  INCOMPLETE_BANK_DETAILS_PT_BODY: {
    en: (vars: { amount: number }) =>
      `Nao conseguimos iniciar o seu pagamento de EUR ${vars.amount} porque os seus dados bancarios estao incompletos. Por favor, atualize-os para receber os pagamentos.`,
    pt: (vars: { amount: number }) =>
      `Não conseguimos iniciar o seu pagamento de EUR ${vars.amount} porque os seus dados bancários estão incompletos. Por favor, atualize-os para receber os pagamentos.`,
  },
  AUTOMATED_PAYOUT_ERROR: {
    en: 'Automated payout error:',
    pt: 'Erro no pagamento automatizado:',
  },
} as const;
