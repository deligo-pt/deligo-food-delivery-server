export const sosMessages = {
  // --- Unique Emergency & GPS Errors ---
  COULD_NOT_DETERMINE_CURRENT_LOCATION_ENABLE_GPS: {
    en: 'Could not determine your current location. Please check your device GPS settings.',
    pt: 'Não foi possível determinar a sua localização atual. Verifique as configurações de GPS do dispositivo.',
  },
  FAILED_TO_TRIGGER_SOS: {
    en: 'Failed to trigger SOS alert. Please try again immediately.',
    pt: 'Falha ao acionar o alerta de SOS. Por favor, tente novamente imediatamente.',
  },
  EMERGENCY_SOS_TRIGGERED: {
    en: 'Emergency SOS Triggered!',
    pt: 'SOS de Emergência Acionado!',
  },
  SOS_TRIGGERED_SUCCESS_HELP_ON_WAY: {
    en: 'SOS alert sent successfully. Help is on the way!',
    pt: 'Alerta de SOS enviado com sucesso. A ajuda está a caminho!',
  },
  RESOLVED_SOS_CANNOT_BE_CHANGED: {
    en: 'This emergency alert has already been resolved and cannot be modified.',
    pt: 'Este alerta de emergência já foi resolvido e não pode ser modificado.',
  },
  SOS_ALREADY_IN_STATUS: {
    en: (vars: { status: string }) =>
      `SOS alert is already marked as ${vars.status.toLowerCase()}.`,
    pt: (vars: { status: string }) =>
      `O SOS já está marcado como ${vars.status.toLowerCase()}.`,
  },

  // --- Unique Lifecycle Success Messages ---
  SOS_STATUS_UPDATED_SUCCESS: {
    en: 'SOS alert status updated successfully.',
    pt: 'Status do SOS atualizado com sucesso.',
  },

  // --- Global Mappings Block (To be handled by globalCommonMessages) ---
  SOS_ALERT_NOT_FOUND: {
    en: 'SOS alert not found.',
    pt: 'Alerta de SOS não encontrado.',
  },
  NEARBY_SOS_ALERTS_RETRIEVED_SUCCESS: {
    en: 'SOS alerts loaded successfully.',
    pt: 'Alertas de SOS carregados com sucesso.',
  },
  SOS_ALERTS_RETRIEVED_SUCCESS: {
    en: 'SOS alerts loaded successfully.',
    pt: 'Alertas de SOS carregados com sucesso.',
  },
  SOS_ALERT_NOT_FOUND_SINGLE: {
    en: 'SOS alert not found.',
    pt: 'Alerta de SOS não encontrado.',
  },
  NOT_AUTHORIZED_TO_VIEW_SOS_ALERT: {
    en: 'Access denied.',
    pt: 'Acesso negado.',
  },
  SOS_ALERT_RETRIEVED_SUCCESS: {
    en: 'SOS alert loaded successfully.',
    pt: 'Alerta de SOS carregado com sucesso.',
  },
  NOT_APPROVED_TO_VIEW_SOS_STATS_WITH_STATUS: {
    en: 'Access denied.',
    pt: 'Acesso negado.',
  },
  SOS_STATS_RETRIEVED_SUCCESS: {
    en: 'SOS metrics loaded successfully.',
    pt: 'Métricas de SOS carregadas com sucesso.',
  },
} as const;
