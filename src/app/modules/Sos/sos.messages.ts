export const sosMessages = {
  // --- Unique Emergency & GPS Errors ---
  COULD_NOT_DETERMINE_CURRENT_LOCATION_ENABLE_GPS: {
    en: 'Could not determine your current location. Please check your device GPS settings.',
    pt: 'Não foi possível determinar a sua localização atual. Verifique as configurações de GPS do dispositivo.',
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
} as const;
