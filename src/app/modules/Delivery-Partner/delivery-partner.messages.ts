export const deliveryPartnerMessages = {
  DELIVERY_PARTNER_NOT_FOUND_BANG: {
    en: 'Delivery Partner profile could not be found.',
    pt: 'O perfil do parceiro de entrega não pôde ser encontrado.',
  },
  DELIVERY_PARTNER_PROFILE_NOT_FOUND_BANG: {
    en: 'Operational profile details not found.',
    pt: 'Os detalhes do perfil operacional não foram encontrados.',
  },
  EMAIL_VERIFICATION_REQUIRED: {
    en: 'Please verify your email address before updating your profile.',
    pt: 'Por favor, verifique seu endereço de e-mail antes de atualizar seu perfil.',
  },
  UPDATE_LOCKED_CONTACT_SUPPORT: {
    en: 'Profile updates are locked for this account. Please contact support.',
    pt: 'As atualizações de perfil estão bloqueadas para esta conta. Entre em contato com o suporte.',
  },
  UPDATE_PROFILE_UNAUTHORIZED: {
    en: 'Access denied. You do not have permission to modify this profile.',
    pt: 'Acesso negado. Você não tem permissão para modificar este perfil.',
  },
  UPDATE_PARTNER_UNAUTHORIZED: {
    en: 'Access denied. You do not have permission to modify this account.',
    pt: 'Acesso negado. Você não tem permissão para modificar esta conta.',
  },
  UPDATE_FAILED: {
    en: 'Failed to update profile details. Please try again.',
    pt: 'Falha ao atualizar os detalhes do perfil. Por favor, tente novamente.',
  },
  UPDATED_SUCCESS: {
    en: 'Profile details updated successfully.',
    pt: 'Detalhes do perfil atualizados com sucesso.',
  },
  ONLY_PARTNERS_CAN_UPDATE_LOCATION: {
    en: 'Location tracking is restricted to active delivery partners only.',
    pt: 'O rastreamento de localização é restrito apenas a parceiros de entrega ativos.',
  },
  LIVE_LOCATION_UPDATE_UNAUTHORIZED_BANG: {
    en: 'Access denied. You are not authorized to update real-time location.',
    pt: 'Acesso negado. Você não está autorizado a atualizar a localização em tempo real.',
  },
  GEO_ACCURACY_TOO_HIGH: {
    en: 'Location accuracy must be within 100 meters to proceed.',
    pt: 'A precisão da localização deve ser de até 100 metros para prosseguir.',
  },
  DELIVERY_PARTNER_NOT_FOUND: {
    en: 'The requested delivery partner account could not be found.',
    pt: 'A conta de parceiro de entrega solicitada não pôde ser encontrada.',
  },
  LIVE_LOCATION_UPDATED_SUCCESS: {
    en: 'Live location updated successfully.',
    pt: 'Localização em tempo real atualizada com sucesso.',
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
  FLEET_MANAGER_NOT_FOUND: {
    en: 'The associated fleet manager profile could not be found.',
    pt: 'O perfil do gestor de frota associado não pôde ser encontrado.',
  },
  DOC_UPLOAD_UNAUTHORIZED_BANG: {
    en: 'Access denied. You do not have permission to upload documents.',
    pt: 'Acesso negado. Você não tem permissão para enviar documentos.',
  },
  DOC_IMAGE_UPDATED_SUCCESS: {
    en: 'Verification document uploaded successfully.',
    pt: 'Documento de verificação enviado com sucesso.',
  },

  ACCESS_DELIVERY_PARTNER_UNAUTHORIZED: {
    en: 'Access denied. You do not have permission to view this partner profile.',
    pt: 'Acesso negado. Você não tem permissão para visualizar este perfil de parceiro.',
  },
} as const;
