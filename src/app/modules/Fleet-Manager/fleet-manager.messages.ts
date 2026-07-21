export const fleetManagerMessages = {
  FLEET_MANAGER_NOT_FOUND_DOT: {
    en: 'The requested fleet manager profile could not be found.',
    pt: 'O perfil do gestor de frota solicitado não pôde ser encontrado.',
  },
  FLEET_MANAGER_PROFILE_NOT_FOUND_DOT: {
    en: 'Fleet manager profile details not found.',
    pt: 'Os detalhes do perfil do gestor de frota não foram encontrados.',
  },
  UPDATE_UNAUTHORIZED: {
    en: 'Access denied. You do not have permission to update this account.',
    pt: 'Acesso negado. Você não tem permissão para atualizar esta conta.',
  },
  EMAIL_VERIFICATION_REQUIRED: {
    en: 'Please verify your email address before updating your profile.',
    pt: 'Por favor, verifique seu endereço de e-mail antes de atualizar seu perfil.',
  },
  GEO_ACCURACY_MAX_100: {
    en: 'Location accuracy must be within 100 meters to proceed.',
    pt: 'A precisão da localização deve ser de até 100 meters para prosseguir.',
  },
  UPDATE_LOCKED_CONTACT_SUPPORT: {
    en: 'Profile updates are locked for this account. Please contact support.',
    pt: 'As atualizações de perfil estão bloqueadas para esta conta. Entre em contato com o suporte.',
  },
  UPDATE_FAILED: {
    en: 'Failed to update fleet manager profile. Please try again.',
    pt: 'Falha ao atualizar o perfil do gestor de frota. Por favor, tente novamente.',
  },
  FLEET_MANAGER_UPDATE_SUCCESS: {
    en: 'Fleet manager profile updated successfully.',
    pt: 'Perfil do gestor de frota atualizado com sucesso.',
  },
  FLEET_MANAGER_NOT_FOUND: {
    en: 'The specified fleet manager account could not be found.',
    pt: 'A conta de gestor de frota especificada não pôde ser encontrada.',
  },
  ACTION_UNAUTHORIZED: {
    en: 'Access denied. You do not have permission to perform this action.',
    pt: 'Acesso negado. Você não tem permissão para realizar esta ação.',
  },
  DOC_LIMIT_EXCEEDED_TEMPLATE: {
    en: (vars: {
      docImageTitle: string;
      previousCount: number;
      incomingCount: number;
    }) =>
      `A maximum of 3 images is allowed for ${vars.docImageTitle}. You have ${vars.previousCount} and are trying to add ${vars.incomingCount}.`,
    pt: (vars: {
      docImageTitle: string;
      previousCount: number;
      incomingCount: number;
    }) =>
      `É permitido um máximo de 3 imagens para ${vars.docImageTitle}. Você possui ${vars.previousCount} e está tentando adicionar mais ${vars.incomingCount}.`,
  },
  DOC_IMAGE_UPDATED_SUCCESS: {
    en: 'Verification document uploaded successfully.',
    pt: 'Documento de verificação enviado com sucesso.',
  },
  PROFILE_LOCKED_CONTACT_SUPPORT: {
    en: 'Profile configuration is locked. Please contact support for assistance.',
    pt: 'A configuração do perfil está bloqueada. Por favor, entre em contato com o suporte para obter assistência.',
  },
  IMAGE_NOT_FOUND_IN_CATEGORY: {
    en: 'The requested image could not be found in this category.',
    pt: 'A imagem solicitada não pôde ser encontrada nesta categoria.',
  },
  DOC_IMAGE_DELETED_SUCCESS: {
    en: 'Document image removed successfully.',
    pt: 'Imagem do documento removida com sucesso.',
  },
  ACCESS_FLEET_MANAGER_UNAUTHORIZED_BANG: {
    en: 'Access denied. You do not have permission to view this fleet manager profile.',
    pt: 'Acesso negado. Você não tem permissão para visualizar este perfil de gestor de frota.',
  },
  FLEET_MANAGER_NOT_FOUND_BANG: {
    en: 'Fleet manager profile could not be located.',
    pt: 'O perfil do gestor de frota não pôde ser localizado.',
  },
  LATITUDE_LONGITUDE_REQUIRED: {
    en: 'Both latitude and longitude are required for nearest search.',
    pt: 'Latitude e longitude são obrigatórias para a busca por proximidade.',
  },
  INVALID_LAT_LNG_COORDINATES: {
    en: 'Invalid coordinates. Latitude must be between -90 and 90, and longitude between -180 and 180.',
    pt: 'Coordenadas inválidas. A latitude deve estar entre -90 e 90 e a longitude entre -180 e 180.',
  },
} as const;
