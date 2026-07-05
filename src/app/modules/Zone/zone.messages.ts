export const zoneMessages = {
  // --- Unique GIS & Geofencing Validation Errors ---
  INVALID_GEOJSON_POLYGON_STRUCTURE: {
    en: 'Invalid GeoJSON Polygon structure provided.',
    pt: 'Estrutura de Polígono GeoJSON inválida fornecida.',
  },
  ZONE_ID_ALREADY_EXISTS: {
    en: (vars: { zoneId: string }) =>
      `Zone ID '${vars.zoneId}' already exists.`,
    pt: (vars: { zoneId: string }) =>
      `O ID de zona '${vars.zoneId}' já existe.`,
  },
  ZONE_OVERLAP_DETECTED: {
    en: (vars: { zoneName: string; zoneId: string }) =>
      `Zone overlap detected. The new boundary intersects with: ${vars.zoneName} (${vars.zoneId}).`,
    pt: (vars: { zoneName: string; zoneId: string }) =>
      `Sobreposição de zonas detectada. O novo limite cruza com a zona: ${vars.zoneName} (${vars.zoneId}).`,
  },
  ZONE_UPDATE_OVERLAP_FAILED: {
    en: (vars: { zoneName: string; zoneId: string }) =>
      `Zone update failed. New boundary intersects with: ${vars.zoneName} (${vars.zoneId}).`,
    pt: (vars: { zoneName: string; zoneId: string }) =>
      `Falha ao atualizar a zona. O novo limite cruza com a zona: ${vars.zoneName} (${vars.zoneId}).`,
  },
  FAILED_TO_UPDATE_ZONE: {
    en: (vars: { zoneId: string }) => `Failed to update zone ${vars.zoneId}.`,
    pt: (vars: { zoneId: string }) =>
      `Falha ao atualizar a zona ${vars.zoneId}.`,
  },
  ZONE_ALREADY_IN_STATUS: {
    en: (vars: { zoneId: string; isOperational: boolean }) =>
      `Zone ${vars.zoneId} is already ${vars.isOperational ? 'active' : 'inactive'}.`,
    pt: (vars: { zoneId: string; isOperational: boolean }) =>
      `A zona ${vars.zoneId} já se encontra ${vars.isOperational ? 'ativa' : 'inativa'}.`,
  },
  ZONE_ACTIVE_CANNOT_DELETE_DEACTIVATE_FIRST: {
    en: (vars: { zoneId: string }) =>
      `Zone ${vars.zoneId} is active. Please deactivate the zone before attempting deletion.`,
    pt: (vars: { zoneId: string }) =>
      `A zona ${vars.zoneId} está ativa. Por favor, desative a zona antes de tentar excluí-la.`,
  },

  // --- Unique Lifecycle Success Messages ---
  ZONE_CREATED_SUCCESS: {
    en: 'Delivery zone created successfully.',
    pt: 'Zona de entrega criada com sucesso.',
  },
  ZONE_UPDATED_SUCCESS: {
    en: 'Delivery zone updated successfully.',
    pt: 'Zona de entrega atualizada com sucesso.',
  },
  ZONE_STATUS_TOGGLED: {
    en: (vars: { zoneId: string; isOperational: boolean }) =>
      `Zone ${vars.zoneId} has been successfully ${vars.isOperational ? 'activated' : 'deactivated'}.`,
    pt: (vars: { zoneId: string; isOperational: boolean }) =>
      `A zona ${vars.zoneId} foi ${vars.isOperational ? 'ativada' : 'desativada'} com sucesso.`,
  },
  ZONE_DELETED_SUCCESS: {
    en: (vars: { zoneId: string }) =>
      `Zone ${vars.zoneId} has been deleted successfully.`,
    pt: (vars: { zoneId: string }) =>
      `A zona ${vars.zoneId} foi excluída com sucesso.`,
  },
  ZONE_PERMANENTLY_DELETED_SUCCESS: {
    en: (vars: { zoneId: string }) =>
      `Zone ${vars.zoneId} has been permanently deleted.`,
    pt: (vars: { zoneId: string }) =>
      `A zona ${vars.zoneId} foi excluída permanentemente.`,
  },

  // --- Global Mappings Block (To be handled by globalCommonMessages) ---
  ZONE_NOT_FOUND: { en: 'Zone not found.', pt: 'Zona não encontrada.' },
  ZONE_FOUND_SUCCESS: {
    en: 'Zone details loaded.',
    pt: 'Zona encontrada com sucesso.',
  },
  ZONES_RETRIEVED_SUCCESS: {
    en: 'Zones loaded successfully.',
    pt: 'Zonas carregadas com sucesso.',
  },
  ZONE_RETRIEVED_SUCCESS: {
    en: 'Zone details loaded.',
    pt: 'Zona carregada com sucesso.',
  },
  ZONE_WITH_ID_NOT_FOUND: { en: 'Zone not found.', pt: 'Zona não encontrada.' },
  ZONE_WITH_ID_NOT_FOUND_FOR_STATUS_UPDATE: {
    en: 'Zone not found.',
    pt: 'Zona não encontrada.',
  },
  ZONE_WITH_ID_NOT_FOUND_FOR_DELETION: {
    en: 'Zone not found.',
    pt: 'Zona não encontrada.',
  },
  ZONE_NOT_SOFT_DELETED_SOFT_DELETE_FIRST: {
    en: 'Deactivation required first.',
    pt: 'Desativação necessária primeiro.',
  },
} as const;
