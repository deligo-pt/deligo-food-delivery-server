export const payoutMessages = {
  FLEET_MANAGER_ONLY_SETTLE_DELIVERY_PARTNERS: {
    en: 'Fleet Managers can only initiate settlements with Delivery Partners.',
    pt: 'Os gestores de frota apenas podem efetuar liquidações com parceiros de entrega.',
  },
  ONLY_OWN_DELIVERY_PARTNERS_SETTLEMENT: {
    en: 'You can only initiate settlements for delivery partners assigned to your fleet.',
    pt: 'Apenas pode iniciar a liquidação para os seus próprios parceiros de entrega.',
  },
  BANK_DETAILS_INCOMPLETE_BODY: {
    en: 'Settlement could not be initiated because your bank details are missing. Please update them in your profile.',
    pt: 'A liquidação não pôde ser iniciada porque faltam os seus dados bancários. Por favor, atualize-os no seu perfil.',
  },
  CANNOT_INITIATE_SETTLEMENT_INCOMPLETE_BANK_DETAILS: {
    en: 'Cannot initiate settlement. Delivery partner has incomplete bank details.',
    pt: 'Não é possível iniciar a liquidação. O parceiro de entrega tem dados bancários incompletos.',
  },
  NO_UNPAID_EARNINGS_TO_SETTLE: {
    en: 'There are no unpaid earnings available for settlement.',
    pt: 'Não existem ganhos não pagos para liquidar.',
  },
  PAYOUT_INITIATED_TITLE: {
    en: 'Payout Initiated',
    pt: 'Pagamento Iniciado',
  },
  PAYOUT_INITIATED_BODY: {
    en: 'Your payout request has been successfully initialized.',
    pt: 'O seu pedido de pagamento foi inicializado com sucesso.',
  },
  SETTLEMENT_INITIATED_SUCCESS: {
    en: 'Settlement initiated successfully.',
    pt: 'Liquidação iniciada com sucesso.',
  },
  INVALID_PAYOUT_SESSION_OR_ALREADY_PAID: {
    en: 'Invalid payout session or this balance has already been paid.',
    pt: 'Sessão de pagamento inválida ou este saldo já foi pago.',
  },
  PAYOUT_PROOF_MANDATORY: {
    en: 'A valid payout proof image upload is mandatory.',
    pt: 'A imagem do comprovativo de pagamento é obrigatória.',
  },
  WEEKLY_SETTLEMENT_COMPLETED: {
    en: 'Weekly settlement completed successfully.',
    pt: 'Liquidação semanal concluída com sucesso.',
  },
  SETTLEMENT_COMPLETED_TITLE: {
    en: 'Settlement Completed',
    pt: 'Liquidação Concluída',
  },
  SETTLEMENT_COMPLETED_BODY: {
    en: (vars: { amount: number }) =>
      `Your settlement of ${vars.amount} has been processed successfully.`,
    pt: (vars: { amount: number }) =>
      `A sua liquidação no valor de ${vars.amount} foi processada com sucesso.`,
  },
  SETTLEMENT_COMPLETED_SUCCESS: {
    en: 'Settlement completed successfully.',
    pt: 'Liquidação concluída com sucesso.',
  },
  INCOMPLETE_BANK_DETAILS_PT_BODY: {
    en: (vars: { amount: number }) =>
      `We could not initiate your payout of ${vars.amount} due to incomplete bank details. Please update them to receive your funds.`,
    pt: (vars: { amount: number }) =>
      `Não conseguimos iniciar o seu pagamento de ${vars.amount} porque os seus dados bancários estão incompletos. Por favor, atualize-os para receber os pagamentos.`,
  },
  AUTOMATED_PAYOUT_ERROR: {
    en: 'Automated payout execution failed:',
    pt: 'Falha na execução do pagamento automatizado:',
  },
  INSUFFICIENT_WALLET_BALANCE_FOR_FINALIZATION: {
    en: 'Insufficient wallet balance to finalize this payout.',
    pt: 'Saldo insuficiente na carteira para finalizar este pagamento.',
  },
  SENDER_TREASURY_POOL_INSUFFICIENT_FUNDS: {
    en: 'The treasury pool of the sender does not have sufficient funds to process this payout.',
    pt: 'O fundo do tesouro do remetente não tem fundos suficientes para processar este pagamento.',
  },
  EXISTING_PENDING_PAYOUT_SESSION_ACTIVE: {
    en: 'There is already an existing pending payout session for this user. Please wait for it to be processed before initiating a new one.',
    pt: 'Já existe uma sessão de pagamento pendente para este usuário. Por favor, aguarde que seja processada antes de iniciar uma nova.',
  },
} as const;
