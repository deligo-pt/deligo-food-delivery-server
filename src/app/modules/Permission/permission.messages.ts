export const permissionMessages = {
  PERMISSION_ACTION_PREVIOUSLY_DELETED: {
    en: 'This permission action code was previously deleted. Please restore it instead of creating a duplicate.',
    pt: 'Este código de ação de permissão foi excluído anteriormente. Por favor, restaure-o em vez de criar um duplicado.',
  },
  PERMISSION_ACTION_ALREADY_ACTIVE: {
    en: 'This permission action code already exists and is active!',
    pt: 'Este código de ação de permissão já existe e está ativo!',
  },
  PERMISSION_CREATED_SUCCESS: {
    en: 'Permission created successfully',
    pt: 'Permissão criada com sucesso',
  },
  TARGET_SYSTEM_PERMISSION_NOT_FOUND: {
    en: 'Target system permission not found!',
    pt: 'Permissão do sistema de destino não encontrada!',
  },
  SYSTEM_PERMISSION_ACTION_IMMUTABLE: {
    en: 'Security Alert: Core system defined permission action codes cannot be altered!',
    pt: 'Alerta de Segurança: Os códigos de ação de permissão definidos pelo núcleo do sistema não podem ser alterados!',
  },
  PERMISSION_ACTION_ALREADY_REGISTERED_IN_MODULE: {
    en: (vars: { action: string }) =>
      `Conflict: Permission action code '${vars.action}' is already registered in another module!`,
    pt: (vars: { action: string }) =>
      `Conflito: O código de ação de permissão '${vars.action}' já está registrado em outro módulo!`,
  },
  PERMISSION_UPDATED_SUCCESS: {
    en: 'Permission updated successfully',
    pt: 'Permissão atualizada com sucesso',
  },
  PERMISSIONS_RETRIEVED_SUCCESS: {
    en: 'Permissions retrieved successfully',
    pt: 'Permissões recuperadas com sucesso',
  },
  PERMISSION_NOT_FOUND: {
    en: 'Permission not found!',
    pt: 'Permissão não encontrada!',
  },
  PERMISSION_DETAILS_RETRIEVED_SUCCESS: {
    en: 'Permission details retrieved successfully',
    pt: 'Detalhes da permissão recuperados com sucesso',
  },
  CORE_SYSTEM_PERMISSIONS_CANNOT_BE_DELETED: {
    en: 'Core system permissions cannot be deleted!',
    pt: 'As permissões do núcleo do sistema não podem ser excluídas!',
  },
  PERMISSION_SOFT_DELETED_SUCCESS: {
    en: 'Permission soft-deleted successfully',
    pt: 'Permissão excluída logicamente com sucesso',
  },
  PERMISSION_IDS_ARRAY_EMPTY: {
    en: 'Permission IDs array cannot be empty!',
    pt: 'A matriz de IDs de permissão não pode estar vazia!',
  },
  INVALID_OR_INACTIVE_PERMISSION_IDS: {
    en: 'Security Alert: One or more provided Permission IDs are invalid or inactive!',
    pt: 'Alerta de Segurança: Um ou mais IDs de permissão fornecidos são inválidos ou estão inativos!',
  },
  TARGET_ADMIN_NOT_FOUND: {
    en: 'Target Admin account not found!',
    pt: 'Conta de Administrador de destino não encontrada!',
  },
  NEW_PERMISSIONS_ASSIGNED_SUCCESS: {
    en: 'New permissions assigned to admin successfully',
    pt: 'Novas permissões atribuídas ao administrador com sucesso',
  },
  REVOKE_FAILED_MISSING_PERMISSIONS: {
    en: (vars: { missingActions: string }) =>
      `Revoke failed: The target admin does not currently have these permission(s): [${vars.missingActions}]`,
    pt: (vars: { missingActions: string }) =>
      `Falha ao revogar: O administrador de destino não possui atualmente estas permissões: [${vars.missingActions}]`,
  },
  SPECIFIED_PERMISSIONS_REVOKED_SUCCESS: {
    en: 'Specified permissions revoked from admin successfully',
    pt: 'Permissões especificadas revogadas do administrador com sucesso',
  },
} as const;
