export const sosMessages = {
  COULD_NOT_DETERMINE_CURRENT_LOCATION_ENABLE_GPS: {
    en: 'Could not determine your current location. Please enable GPS.',
    pt: 'Não foi possível determinar a sua localização atual. Por favor, ative o GPS.',
  },
  FAILED_TO_TRIGGER_SOS: {
    en: 'Failed to trigger SOS',
    pt: 'Falha ao acionar o SOS',
  },
  EMERGENCY_SOS_TRIGGERED: {
    en: 'Emergency SOS Triggered!',
    pt: 'SOS de Emergência Acionado!',
  },
  SOS_TRIGGERED_SUCCESS_HELP_ON_WAY: {
    en: 'SOS triggered successfully. Help is on the way!',
    pt: 'SOS acionado com sucesso. A ajuda está a caminho!',
  },
  SOS_ALERT_NOT_FOUND: {
    en: 'SOS alert not found',
    pt: 'Alerta de SOS não encontrado',
  },
  RESOLVED_SOS_CANNOT_BE_CHANGED: {
    en: 'Resolved SOS cannot be changed',
    pt: 'Um SOS resolvido não pode ser alterado',
  },
  SOS_ALREADY_IN_STATUS: {
    en: (vars: { status: string }) => `SOS is already ${vars.status}`,
    pt: (vars: { status: string }) =>
      `O SOS já está como ${vars.status.toLowerCase()}`,
  },
  SOS_STATUS_UPDATED_SUCCESS: {
    en: 'SOS status updated successfully',
    pt: 'Status do SOS atualizado com sucesso',
  },
  NEARBY_SOS_ALERTS_RETRIEVED_SUCCESS: {
    en: 'Nearby SOS alerts retrieved successfully',
    pt: 'Alertas de SOS próximos recuperados com sucesso',
  },
  SOS_ALERTS_RETRIEVED_SUCCESS: {
    en: 'SOS alerts retrieved successfully',
    pt: 'Alertas de SOS recuperados com sucesso',
  },
  SOS_ALERT_NOT_FOUND_SINGLE: {
    en: 'SOS Alert not found',
    pt: 'Alerta de SOS não encontrado',
  },
  NOT_AUTHORIZED_TO_VIEW_SOS_ALERT: {
    en: 'You are not authorized to view this SOS alert',
    pt: 'Você não tem permissão para visualizar este alerta de SOS',
  },
  SOS_ALERT_RETRIEVED_SUCCESS: {
    en: 'SOS alert retrieved successfully',
    pt: 'Alerta de SOS recuperado com sucesso',
  },
  NOT_APPROVED_TO_VIEW_SOS_STATS_WITH_STATUS: {
    en: (vars: { status: string }) =>
      `You are not approved to view SOS stats. Your account is ${vars.status}`,
    pt: (vars: { status: string }) =>
      `Você não está aprovado para visualizar estatísticas de SOS. Sua conta está ${vars.status.toLowerCase()}`,
  },
  SOS_STATS_RETRIEVED_SUCCESS: {
    en: 'SOS stats retrieved successfully',
    pt: 'Estatísticas de SOS recuperadas com sucesso',
  },
} as const;
