export const customerMessages = {
  ACCESS_DENIED_ACCOUNT_STATUS: {
    en: (vars: { status: string }) =>
      `Access denied. Your account is currently ${vars.status.toLowerCase()}. Please contact support.`,
    pt: (vars: { status: string }) =>
      `Acesso negado. Sua conta está atualmente ${vars.status.toLowerCase()}. Entre em contato com o suporte.`,
  },
  ACCOUNT_NOT_FOUND: {
    en: 'Account not found. Please verify your user ID.',
    pt: 'Conta não encontrada. Por favor, verifique seu ID de usuário.',
  },
  OTP_VERIFICATION_REQUIRED: {
    en: 'Please complete the OTP verification to continue.',
    pt: 'Por favor, conclua a verificação de OTP para continuar.',
  },
  PROFILE_DETAILS_NOT_FOUND: {
    en: 'Profile details not found. Please complete your profile setup.',
    pt: 'Detalhes do perfil não encontrados. Por favor, conclua a configuração do seu perfil.',
  },
  UPDATE_PROFILE_FORBIDDEN: {
    en: 'You do not have permission to update this profile.',
    pt: 'Você não tem permissão para atualizar este perfil.',
  },
  CUSTOMER_UPDATED_SUCCESS: {
    en: 'Profile updated successfully.',
    pt: 'Perfil atualizado com sucesso.',
  },
  LOCATION_UPDATE_STATUS_BLOCKED: {
    en: (vars: { status: string }) =>
      `Location updates are unavailable for your current account status (${vars.status.toLowerCase()}).`,
    pt: (vars: { status: string }) =>
      `As atualizações de localização estão indisponíveis para o status atual da sua conta (${vars.status.toLowerCase()}).`,
  },
  LOCATION_UPDATE_UNAUTHORIZED: {
    en: 'You are not authorized to update the location for this account.',
    pt: 'Você não está autorizado a atualizar a localização para esta conta.',
  },
  LOW_LOCATION_ACCURACY: {
    en: "Low location accuracy detected. Please check your device's GPS settings and try again.",
    pt: 'Baixa precisão de localização detectada. Verifique o GPS do seu dispositivo e tente novamente.',
  },
  CUSTOMER_PROFILE_NOT_FOUND: {
    en: 'Customer profile could not be found.',
    pt: 'Perfil do cliente não pôde ser encontrado.',
  },
  LOCATION_UPDATE_FAILED: {
    en: "We couldn't update your location. Please try again.",
    pt: 'Não foi possível atualizar sua localização. Por favor, tente novamente.',
  },
  LIVE_LOCATION_UPDATED_SUCCESS: {
    en: 'Location and primary delivery address updated successfully!',
    pt: 'Localização e endereço de entrega principal atualizados com sucesso!',
  },
  DELIVERY_ADDRESS_FIELDS_REQUIRED: {
    en: 'Please fill in all required address fields to ensure accurate delivery.',
    pt: 'Por favor, preencha todos os campos obrigatórios do endereço para garantir uma entrega precisa.',
  },
  ONLY_CUSTOMER_CAN_ADD_ADDRESS: {
    en: 'Only customer accounts can add delivery addresses.',
    pt: 'Apenas contas de clientes podem adicionar endereços de entrega.',
  },
  CUSTOMER_PROFILE_SETUP_REQUIRED: {
    en: 'Profile setup incomplete. Please fully configure your account.',
    pt: 'Configuração do perfil incompleta. Por favor, configure totalmente sua conta.',
  },
  ADDRESS_LIMIT_REACHED: {
    en: 'You have reached the maximum limit of 5 saved addresses. Please remove an old one first.',
    pt: 'Você atingiu o limite máximo de 5 endereços salvos. Remova um endereço antigo primeiro.',
  },
  ADDRESS_ALREADY_EXISTS: {
    en: 'This address is already in your saved list.',
    pt: 'Este endereço já está na sua lista de salvos.',
  },
  DELIVERY_ADDRESS_ADDED_SUCCESS: {
    en: 'Delivery address added successfully!',
    pt: 'Endreço de entrega adicionado com sucesso!',
  },
  UPDATE_ADDRESS_NOT_FOUND_OR_FORBIDDEN: {
    en: 'Address not found or you do not have permission to modify it.',
    pt: 'Endereço não encontrado ou você não tem permissão para modificá-lo.',
  },
  REQUESTED_ADDRESS_NOT_FOUND: {
    en: 'The requested delivery address could not be found.',
    pt: 'O endereço de entrega solicitado não pôde ser encontrado.',
  },
  PRIMARY_ADDRESS_TYPE_IMMUTABLE: {
    en: 'The primary address type cannot be modified.',
    pt: 'O tipo de endereço principal não pode ser modificado.',
  },
  CANNOT_SET_PRIMARY_MANUALLY: {
    en: 'You cannot manually set an address type to primary.',
    pt: 'Você não pode definir manualmente um tipo de endereço como principal.',
  },
  ADDRESS_COORDINATES_DUPLICATE: {
    en: 'An address with these coordinates is already saved.',
    pt: 'Um endereço com estas coordenadas já está salvo.',
  },
  DELIVERY_ADDRESS_UPDATED_SUCCESS: {
    en: 'Delivery address updated successfully.',
    pt: 'Endereço de entrega atualizado com sucesso.',
  },
  PROFILE_NOT_FOUND_LOGIN_AGAIN: {
    en: 'Profile not found. Please try logging in again.',
    pt: 'Perfil não encontrado. Por favor, tente fazer login novamente.',
  },
  ACTIVATE_ADDRESS_NOT_FOUND: {
    en: 'The delivery address you are trying to activate could not be found.',
    pt: 'O endereço de entrega que você está tentando ativar não pôde ser encontrado.',
  },
  DELIVERY_ADDRESS_CHANGED_SUCCESS: {
    en: 'Active delivery address changed successfully.',
    pt: 'Endereço de entrega ativo alterado com sucesso.',
  },
  PROFILE_NOT_FOUND_TRY_AGAIN: {
    en: 'Profile not found. Please try again.',
    pt: 'Perfil não encontrado. Por favor, tente novamente.',
  },
  DELETE_ADDRESS_NOT_FOUND: {
    en: 'The address you are trying to delete does not exist.',
    pt: 'O endereço que você está tentando excluir não existe.',
  },
  CANNOT_DELETE_ACTIVE_ADDRESS: {
    en: 'You cannot delete your active address. Please set another address as active first.',
    pt: 'Você não pode excluir seu endereço ativo. Por favor, defina outro endereço como ativo primeiro.',
  },
  CANNOT_DELETE_PRIMARY_ADDRESS: {
    en: 'Your primary address is required and cannot be deleted.',
    pt: 'Seu endereço principal é obrigatório e não pode ser excluído.',
  },
  DELIVERY_ADDRESS_DELETED_SUCCESS: {
    en: 'Delivery address deleted successfully.',
    pt: 'Endereço de entrega excluído com sucesso.',
  },
  VIEW_CUSTOMER_LIST_FORBIDDEN: {
    en: (vars: { status: string }) =>
      `Access denied. Your account status (${vars.status.toLowerCase()}) restricts viewing customer lists.`,
    pt: (vars: { status: string }) =>
      `Acesso negado. O status da sua conta (${vars.status.toLowerCase()}) restringe a visualização de listas de clientes.`,
  },
  CUSTOMERS_RETRIEVED_SUCCESS: {
    en: 'Customer list loaded successfully.',
    pt: 'Lista de clientes carregada com sucesso.',
  },
  VIEW_CUSTOMER_INFO_FORBIDDEN: {
    en: (vars: { status: string }) =>
      `Access denied. Your account status (${vars.status.toLowerCase()}) restricts viewing this information.`,
    pt: (vars: { status: string }) =>
      `Acesso negado. O status da sua conta (${vars.status.toLowerCase()}) restringe a visualização desta informação.`,
  },
  VIEW_CUSTOMER_DETAILS_FORBIDDEN: {
    en: "You do not have permission to view this customer's details.",
    pt: 'Você não tem permissão para visualizar os detalhes deste cliente.',
  },
  REQUESTED_CUSTOMER_NOT_FOUND: {
    en: 'The requested customer profile could not be found.',
    pt: 'O perfil do cliente solicitado não pôde ser encontrado.',
  },
  CUSTOMER_RETRIEVED_SUCCESS: {
    en: 'Customer profile loaded successfully.',
    pt: 'Perfil do cliente carregado com sucesso.',
  },
} as const;
