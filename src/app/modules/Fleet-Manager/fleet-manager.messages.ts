export const fleetManagerMessages = {
  FLEET_MANAGER_NOT_FOUND_DOT: {
    en: 'The requested fleet manager profile could not be found.',
    pt: 'O perfil do gestor de frota solicitado não pôde ser encontrado.',
  },
  FLEET_MANAGER_PROFILE_NOT_FOUND_DOT: {
    en: 'Fleet manager operational profile details not found.',
    pt: 'Os detalhes do perfil operacional do gestor de frota não foram encontrados.',
  },
  UPDATE_UNAUTHORIZED: {
    en: 'You do not have permission to update this fleet manager account.',
    pt: 'Você não tem permissão para atualizar esta conta de gestor de frota.',
  },
  EMAIL_VERIFICATION_REQUIRED: {
    en: 'Please complete email address verification before updating your profile.',
    pt: 'Por favor, conclua a verificação do endereço de e-mail antes de atualizar seu perfil.',
  },
  GEO_ACCURACY_MAX_100: {
    en: 'Geographic tracking data accuracy divergence must not exceed 100 meters.',
    pt: 'A divergência de precisão dos dados de rastreamento geográfico não deve exceder 100 metros.',
  },
  UPDATE_LOCKED_CONTACT_SUPPORT: {
    en: 'Profile updates are currently locked for this account. Please contact support.',
    pt: 'As atualizações de perfil estão bloqueadas para esta conta no momento. Por favor, entre em contato com o suporte.',
  },
  UPDATE_FAILED: {
    en: 'An error occurred. Failed to execute fleet manager profile update.',
    pt: 'Ocorreu um erro. Falha ao executar a atualização do perfil do gestor de frota.',
  },
  UPDATE_SUCCESS: {
    en: 'Fleet manager profile updated successfully.',
    pt: 'Perfil do gestor de frota atualizado com sucesso.',
  },
  FLEET_MANAGER_NOT_FOUND: {
    en: 'The specified fleet manager account could not be located.',
    pt: 'A conta de gestor de frota especificada não pôde ser localizada.',
  },
  ACTION_UNAUTHORIZED: {
    en: 'Access denied. You lack the sufficient system privileges to perform this action.',
    pt: 'Acesso negado. Você não possui os privilégios de sistema suficientes para realizar esta ação.',
  },
  DOC_LIMIT_EXCEEDED_TEMPLATE: {
    en: (vars: {
      docImageTitle: string;
      previousCount: number;
      incomingCount: number;
    }) =>
      `A maximum of 3 images is allowed for ${vars.docImageTitle}. You currently have ${vars.previousCount} and are attempting to append ${vars.incomingCount}.`,
    pt: (vars: {
      docImageTitle: string;
      previousCount: number;
      incomingCount: number;
    }) =>
      `É permitido um máximo de 3 imagens para ${vars.docImageTitle}. Você possui atualmente ${vars.previousCount} e está tentando anexar mais ${vars.incomingCount}.`,
  },
  DOC_IMAGE_UPDATED_SUCCESS: {
    en: 'Verification document repository updated successfully.',
    pt: 'Repositório de documentos de verificação atualizado com sucesso.',
  },
  PROFILE_LOCKED_CONTACT_SUPPORT: {
    en: 'Profile configuration is locked. Please contact our system support for assistance.',
    pt: 'A configuração do perfil está bloqueada. Por favor, entre em contato com o suporte do sistema para obter assistência.',
  },
  IMAGE_NOT_FOUND_IN_CATEGORY: {
    en: 'The specified image record could not be found within this document category.',
    pt: 'O registro de imagem especificado não pôde ser encontrado dentro desta categoria de documento.',
  },
  DOC_IMAGE_DELETED_SUCCESS: {
    en: 'Document image file purged from repository successfully.',
    pt: 'Arquivo de imagem do documento excluído do repositório com sucesso.',
  },
  FLEET_MANAGERS_RETRIEVED_SUCCESS: {
    en: 'Fleet manager registry catalog retrieved successfully.',
    pt: 'Catálogo de registros de gestores de frota recuperado com sucesso.',
  },
  ACCESS_FLEET_MANAGER_UNAUTHORIZED_BANG: {
    en: 'Access denied. You are not authorized to inspect this fleet manager file.',
    pt: 'Acesso negado. Você não está autorizado a inspecionar este arquivo de gestor de frota.',
  },
  FLEET_MANAGER_NOT_FOUND_BANG: {
    en: 'Fleet manager organizational profile could not be located.',
    pt: 'O perfil organizacional do gestor de frota não pôde ser localizado.',
  },
  FLEET_MANAGER_RETRIEVED_SUCCESS: {
    en: 'Fleet manager historical statement loaded successfully.',
    pt: 'Extrato histórico do gestor de frota carregado com sucesso.',
  },
} as const;
