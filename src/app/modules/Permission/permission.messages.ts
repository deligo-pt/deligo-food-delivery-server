export const permissionMessages = {
  PERMISSION_ACTION_PREVIOUSLY_DELETED: {
    en: 'This permission action code was previously deleted. Please restore it instead of creating a duplicate.',
    pt: 'Este código de ação de permissão foi excluído anteriormente. Por favor, restaure-o em vez de criar um duplicado.',
  },
  PERMISSION_ACTION_ALREADY_ACTIVE: {
    en: 'This permission action code already exists and is active.',
    pt: 'Este código de ação de permissão já existe e está ativo.',
  },
  PERMISSION_CREATED_SUCCESS: {
    en: 'Permission created successfully.',
    pt: 'Permissão criada com sucesso.',
  },
  TARGET_SYSTEM_PERMISSION_NOT_FOUND: {
    en: 'The requested system permission could not be found.',
    pt: 'A permissão do sistema solicitada não pôde ser encontrada.',
  },
  SYSTEM_PERMISSION_ACTION_IMMUTABLE: {
    en: 'Core system defined permission action codes cannot be altered.',
    pt: 'Os códigos de ação de permissão definidos pelo núcleo do sistema não podem ser alterados.',
  },
  PERMISSION_ACTION_ALREADY_REGISTERED_IN_MODULE: {
    en: (vars: { action: string }) =>
      `Permission action code '${vars.action}' is already registered in another module.`,
    pt: (vars: { action: string }) =>
      `O código de ação de permissão '${vars.action}' já está registrado em outro módulo.`,
  },
  PERMISSION_UPDATED_SUCCESS: {
    en: 'Permission updated successfully.',
    pt: 'Permissão atualizada com sucesso.',
  },
  PERMISSIONS_RETRIEVED_SUCCESS: {
    en: 'Permissions list loaded successfully.',
    pt: 'Lista de permissões carregada com sucesso.',
  },
  PERMISSION_NOT_FOUND: {
    en: 'Permission could not be found.',
    pt: 'Permissão não encontrada.',
  },
  PERMISSION_DETAILS_RETRIEVED_SUCCESS: {
    en: 'Permission details loaded successfully.',
    pt: 'Detalhes da permissão carregados com sucesso.',
  },
  CORE_SYSTEM_PERMISSIONS_CANNOT_BE_DELETED: {
    en: 'Core system permissions are required and cannot be deleted.',
    pt: 'As permissões do núcleo do sistema são obrigatórias e não podem ser excluídas.',
  },
  PERMISSION_SOFT_DELETED_SUCCESS: {
    en: 'Permission removed successfully.',
    pt: 'Permissão removida com sucesso.',
  },
  PERMISSION_IDS_ARRAY_EMPTY: {
    en: 'Please select at least one permission ID.',
    pt: 'Por favor, selecione pelo menos um ID de permissão.',
  },
  INVALID_OR_INACTIVE_PERMISSION_IDS: {
    en: 'One or more provided permission IDs are invalid or inactive.',
    pt: 'Um ou mais IDs de permissão fornecidos são inválidos ou estão inativos.',
  },
  TARGET_ADMIN_NOT_FOUND: {
    en: 'The requested admin account could not be found.',
    pt: 'A conta de administrador solicitada não pôde ser encontrada.',
  },
  NEW_PERMISSIONS_ASSIGNED_SUCCESS: {
    en: 'New permissions assigned to admin successfully.',
    pt: 'Novas permissões atribuídas ao administrador com sucesso.',
  },
  REVOKE_FAILED_MISSING_PERMISSIONS: {
    en: (vars: { missingActions: string }) =>
      `Revoke failed: The admin does not currently have these permission(s): [${vars.missingActions}]`,
    pt: (vars: { missingActions: string }) =>
      `Falha ao revogar: O administrador não possui atualmente estas permissões: [${vars.missingActions}]`,
  },
  SPECIFIED_PERMISSIONS_REVOKED_SUCCESS: {
    en: 'Permissions revoked from admin successfully.',
    pt: 'Permissões especificadas revogadas do administrador com sucesso.',
  },
} as const;
