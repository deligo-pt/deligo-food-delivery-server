export const deliveryPartnerMessages = {
  DELIVERY_PARTNER_NOT_FOUND_BANG: {
    en: 'Delivery Partner profile could not be located in our system.',
    pt: 'O perfil do parceiro de entrega não pôde ser localizado em nosso sistema.',
  },
  DELIVERY_PARTNER_PROFILE_NOT_FOUND_BANG: {
    en: 'Delivery Partner operational profile details not found.',
    pt: 'Os detalhes do perfil operacional do parceiro de entrega não foram encontrados.',
  },
  EMAIL_VERIFICATION_REQUIRED: {
    en: 'Please complete email address verification before updating your profile.',
    pt: 'Por favor, conclua a verificação do endereço de e-mail antes de atualizar seu perfil.',
  },
  UPDATE_LOCKED_CONTACT_SUPPORT: {
    en: 'Profile updates are currently locked for this account. Please contact support.',
    pt: 'As atualizações de perfil estão bloqueadas para esta conta no momento. Por favor, entre em contato com o suporte.',
  },
  UPDATE_PROFILE_UNAUTHORIZED: {
    en: 'Access denied. You lack sufficient system privileges to modify this profile.',
    pt: 'Acesso negado. Você não possui privilégios de sistema suficientes para modificar este perfil.',
  },
  UPDATE_PARTNER_UNAUTHORIZED: {
    en: 'Access denied. You do not have permission to modify this Delivery Partner account.',
    pt: 'Acesso negado. Você não tem permissão para modificar esta conta de parceiro de entrega.',
  },
  UPDATE_FAILED: {
    en: 'An error occurred. Failed to execute Delivery Partner profile update.',
    pt: 'Ocorreu um erro. Falha ao executar a atualização do perfil do parceiro de entrega.',
  },
  UPDATED_SUCCESS: {
    en: 'Delivery Partner profile credentials updated successfully.',
    pt: 'Credenciais do perfil do parceiro de entrega atualizadas com sucesso.',
  },
  ONLY_PARTNERS_CAN_UPDATE_LOCATION: {
    en: 'Geographical live location tracking streams are restricted to field delivery partners only.',
    pt: 'O rastreamento de localização geográfica em tempo real é restrito apenas a parceiros de entrega em campo.',
  },
  LIVE_LOCATION_UPDATE_UNAUTHORIZED_BANG: {
    en: 'Access denied. You are not authorized to update real-time telemetry datasets.',
    pt: 'Acesso negado. Você não está autorizado a atualizar conjuntos de dados de telemetria em tempo real.',
  },
  GEO_ACCURACY_TOO_HIGH: {
    en: 'Geographic tracking data accuracy divergence must not exceed 100 meters.',
    pt: 'A divergência de precisão dos dados de rastreamento geográfico não deve exceder 100 metros.',
  },
  DELIVERY_PARTNER_NOT_FOUND: {
    en: 'The specified delivery partner account could not be found.',
    pt: 'A conta de parceiro de entrega especificada não pôde ser encontrada.',
  },
  LIVE_LOCATION_UPDATED_SUCCESS: {
    en: 'Geographical coordinate dataset synchronized successfully.',
    pt: 'Conjunto de dados de coordenadas geográficas sincronizado com sucesso.',
  },
  ONLY_PARTNERS_CAN_CHANGE_STATUS: {
    en: 'Operational logistics status mutations are restricted to delivery partners only.',
    pt: 'Mutações de status de logística operacional são restritas apenas a parceiros de entrega.',
  },
  DELIVERY_PARTNER_NOT_FOUND_LOWER: {
    en: 'Delivery partner records not located.',
    pt: 'Registros do parceiro de entrega não localizados.',
  },
  OFFLINE_ALLOWED_ONLY_FROM_IDLE: {
    en: 'Transition to OFFLINE operational status is restricted to active accounts currently in IDLE state.',
    pt: 'A transição para o status operacional OFFLINE é restrita a contas ativas atualmente em estado ocioso (IDLE).',
  },
  IDLE_ALLOWED_ONLY_FROM_OFFLINE: {
    en: 'Transition to IDLE active dispatch pool is restricted to accounts currently in OFFLINE state.',
    pt: 'A transição para o pool de despacho ativo ocioso (IDLE) é restrita a contas atualmente em estado OFFLINE.',
  },
  STATUS_CHANGE_SUCCESS_TEMPLATE: {
    en: (vars: { fromStatus: string; toStatus: string }) =>
      `Operational assignment status shifted successfully from ${vars.fromStatus} to ${vars.toStatus}.`,
    pt: (vars: { fromStatus: string; toStatus: string }) =>
      `Status de atribuição operacional alterado com sucesso de ${vars.fromStatus} para ${vars.toStatus}.`,
  },
  FLEET_MANAGER_NOT_FOUND: {
    en: 'The associated fleet manager institutional record could not be found.',
    pt: 'O registro institucional do gestor de frota associado não pôde ser encontrado.',
  },
  DOC_UPLOAD_UNAUTHORIZED_BANG: {
    en: 'Access denied. You lack authorization clearance to update corporate document storage repositories.',
    pt: 'Acesso negado. Você não possui autorização para atualizar os repositórios de armazenamento de documentos corporativos.',
  },
  DOC_IMAGE_UPDATED_SUCCESS: {
    en: 'Verification document file repository updated successfully.',
    pt: 'Repositório de arquivos de documentos de verificação atualizado com sucesso.',
  },
  DELIVERY_PARTNERS_RETRIEVED_SUCCESS: {
    en: 'Logistics network directory catalog retrieved successfully.',
    pt: 'Catálogo do diretório da rede de logística recuperado com sucesso.',
  },
  ACCESS_DELIVERY_PARTNER_UNAUTHORIZED: {
    en: 'Access denied. You lack the sufficient infrastructure role required to inspect this partner file.',
    pt: 'Acesso negado. Você não possui a função de infraestrutura necessária para inspecionar este arquivo de parceiro.',
  },
  DELIVERY_PARTNER_RETRIEVED_SUCCESS: {
    en: 'Delivery partner historical statement loaded successfully.',
    pt: 'Extrato histórico do parceiro de entrega carregado com sucesso.',
  },
} as const;
