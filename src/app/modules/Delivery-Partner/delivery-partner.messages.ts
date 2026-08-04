export const deliveryPartnerMessages = {
  DELIVERY_PARTNER_PROFILE_NOT_FOUND_BANG: {
    en: 'Operational profile details not found.',
    pt: 'Os detalhes do perfil operacional não foram encontrados.',
  },
  ONLY_PARTNERS_CAN_UPDATE_LOCATION: {
    en: 'Location tracking is restricted to active delivery partners only.',
    pt: 'O rastreamento de localização é restrito apenas a parceiros de entrega ativos.',
  },
  ONLY_PARTNERS_CAN_CHANGE_STATUS: {
    en: 'Status updates are restricted to delivery partners only.',
    pt: 'As atualizações de status são restritas apenas a parceiros de entrega.',
  },
  DELIVERY_PARTNER_NOT_FOUND_LOWER: {
    en: 'Delivery partner records not found.',
    pt: 'Registros do parceiro de entrega não encontrados.',
  },
  OFFLINE_ALLOWED_ONLY_FROM_IDLE: {
    en: 'You can only go OFFLINE if your current status is IDLE.',
    pt: 'Você só pode ficar OFFLINE se o seu status atual for ocioso (IDLE).',
  },
  IDLE_ALLOWED_ONLY_FROM_OFFLINE: {
    en: 'You can only go ONLINE (IDLE) if your current status is OFFLINE.',
    pt: 'Você só pode ficar ONLINE (IDLE) se o seu status atual for OFFLINE.',
  },
  STATUS_CHANGE_SUCCESS_TEMPLATE: {
    en: (vars: { fromStatus: string; toStatus: string }) =>
      `Status changed successfully from ${vars.fromStatus} to ${vars.toStatus}.`,
    pt: (vars: { fromStatus: string; toStatus: string }) =>
      `Status alterado com sucesso de ${vars.fromStatus} para ${vars.toStatus}.`,
  },

  DELIVERY_PARTNER_ALREADY_APPROVED: {
    en: 'This delivery partner is already approved and cannot be reassigned through this flow.',
    pt: 'Este parceiro de entrega já foi aprovado e não pode ser reatribuído por este fluxo.',
  },
  FLEET_MANAGER_NOT_APPROVED: {
    en: 'Only approved fleet managers can be assigned.',
    pt: 'Apenas gestores de frota aprovados podem ser atribuídos.',
  },
  DELIVERY_PARTNER_ALREADY_ASSIGNED_TO_FLEET_MANAGER: {
    en: 'This delivery partner is already assigned under a fleet manager.',
    pt: 'Este parceiro de entrega já está atribuído a um gestor de frota.',
  },
} as const;
