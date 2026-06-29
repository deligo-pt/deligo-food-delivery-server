export const zoneMessages = {
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
      `Zone overlap detected. The new boundary intersects with existing zone: ${vars.zoneName} (${vars.zoneId}).`,
    pt: (vars: { zoneName: string; zoneId: string }) =>
      `Sobreposição de zonas detetada. O novo limite intersecta-se com a zona existente: ${vars.zoneName} (${vars.zoneId}).`,
  },
  ZONE_CREATED_SUCCESS: {
    en: 'Zone created successfully',
    pt: 'Zona criada com sucesso',
  },
  ZONE_NOT_FOUND: {
    en: 'Zone not found.',
    pt: 'Zona não encontrada.',
  },
  ZONE_FOUND_SUCCESS: {
    en: 'Zone found successfully',
    pt: 'Zona encontrada com sucesso',
  },
  ZONES_RETRIEVED_SUCCESS: {
    en: 'Zones retrieved successfully',
    pt: 'Zonas recuperadas com sucesso',
  },
  ZONE_RETRIEVED_SUCCESS: {
    en: 'Zone retrieved successfully',
    pt: 'Zona recuperada com sucesso',
  },
  ZONE_WITH_ID_NOT_FOUND: {
    en: (vars: { zoneId: string }) =>
      `Zone with ID '${vars.zoneId}' not found.`,
    pt: (vars: { zoneId: string }) =>
      `Zona com o ID '${vars.zoneId}' não encontrada.`,
  },
  ZONE_UPDATE_OVERLAP_FAILED: {
    en: (vars: { zoneName: string; zoneId: string }) =>
      `Zone update failed. New boundary intersects with existing zone: ${vars.zoneName} (${vars.zoneId}).`,
    pt: (vars: { zoneName: string; zoneId: string }) =>
      `Falha ao atualizar a zona. O novo limite intersecta-se com a zona existente: ${vars.zoneName} (${vars.zoneId}).`,
  },
  FAILED_TO_UPDATE_ZONE: {
    en: (vars: { zoneId: string }) => `Failed to update zone ${vars.zoneId}.`,
    pt: (vars: { zoneId: string }) =>
      `Falha ao atualizar a zona ${vars.zoneId}.`,
  },
  ZONE_UPDATED_SUCCESS: {
    en: 'Zone updated successfully',
    pt: 'Zona atualizada com sucesso',
  },
  ZONE_WITH_ID_NOT_FOUND_FOR_STATUS_UPDATE: {
    en: (vars: { zoneId: string }) =>
      `Zone with ID '${vars.zoneId}' not found for status update.`,
    pt: (vars: { zoneId: string }) =>
      `Zona com o ID '${vars.zoneId}' não encontrada para atualização de status.`,
  },
  ZONE_ALREADY_IN_STATUS: {
    en: (vars: { zoneId: string; isOperational: boolean }) =>
      `Zone with ID '${vars.zoneId}' is already ${vars.isOperational ? 'active' : 'inactive'}.`,
    pt: (vars: { zoneId: string; isOperational: boolean }) =>
      `A zona com o ID '${vars.zoneId}' já se encontra ${vars.isOperational ? 'ativa' : 'inativa'}.`,
  },
  ZONE_STATUS_TOGGLED: {
    en: (vars: { zoneId: string; isOperational: boolean }) =>
      `Zone with ID '${vars.zoneId}' has been ${vars.isOperational ? 'activated' : 'deactivated'}.`,
    pt: (vars: { zoneId: string; isOperational: boolean }) =>
      `A zona com o ID '${vars.zoneId}' foi ${vars.isOperational ? 'ativada' : 'desativada'}.`,
  },
  ZONE_WITH_ID_NOT_FOUND_FOR_DELETION: {
    en: (vars: { zoneId: string }) =>
      `Zone with ID '${vars.zoneId}' not found for deletion.`,
    pt: (vars: { zoneId: string }) =>
      `Zona com o ID '${vars.zoneId}' não encontrada para eliminação.`,
  },
  ZONE_ACTIVE_CANNOT_DELETE_DEACTIVATE_FIRST: {
    en: (vars: { zoneId: string }) =>
      `Zone with ID '${vars.zoneId}' is active. Cannot delete an active zone. Please deactivate it first.`,
    pt: (vars: { zoneId: string }) =>
      `A zona com o ID '${vars.zoneId}' está ativa. Não é possível eliminar uma zona ativa. Por favor, desative-a primeiro.`,
  },
  ZONE_DELETED_SUCCESS: {
    en: (vars: { zoneId: string }) =>
      `Zone with ID '${vars.zoneId}' has been deleted.`,
    pt: (vars: { zoneId: string }) =>
      `A zona com o ID '${vars.zoneId}' foi eliminada.`,
  },
  ZONE_NOT_SOFT_DELETED_SOFT_DELETE_FIRST: {
    en: (vars: { zoneId: string }) =>
      `Zone with ID '${vars.zoneId}' is not soft deleted. Please soft delete it first before permanent deletion.`,
    pt: (vars: { zoneId: string }) =>
      `A zona com o ID '${vars.zoneId}' não foi excluída logicamente. Por favor, realize a exclusão lógica primeiro antes da eliminação permanente.`,
  },
  ZONE_PERMANENTLY_DELETED_SUCCESS: {
    en: (vars: { zoneId: string }) =>
      `Zone with ID '${vars.zoneId}' has been permanently deleted.`,
    pt: (vars: { zoneId: string }) =>
      `A zona com o ID '${vars.zoneId}' foi eliminada permanentemente.`,
  },
} as const;
