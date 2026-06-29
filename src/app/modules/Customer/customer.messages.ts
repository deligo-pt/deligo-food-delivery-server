export const customerMessages = {
  ACCESS_DENIED_ACCOUNT_STATUS: {
    en: (vars: { status: string }) =>
      `Access denied. Your account is currently ${vars.status.toLowerCase()}. Please complete any pending requirements or contact support for assistance.`,
    pt: (vars: { status: string }) =>
      `Acesso negado. Sua conta está atualmente ${vars.status.toLowerCase()}. Por favor, conclua os requisitos pendentes ou entre em contato com o suporte para obter assistência.`,
  },
  ACCOUNT_NOT_FOUND: {
    en: 'Account not found. Please ensure that you have the correct user ID.',
    pt: 'Conta não encontrada. Por favor, certifique-se de que possui o ID de usuário correto.',
  },
  OTP_VERIFICATION_REQUIRED: {
    en: 'Verification required. Please complete the identity verification process by entering your OTP to continue.',
    pt: 'Verificação necessária. Por favor, conclua o processo de verificação de identidade inserindo seu OTP para continuar.',
  },
  PROFILE_DETAILS_NOT_FOUND: {
    en: 'Profile details not found. Please complete your profile setup to proceed.',
    pt: 'Detalhes do perfil não encontrados. Por favor, conclua a configuração do seu perfil para prosseguir.',
  },
  UPDATE_PROFILE_FORBIDDEN: {
    en: "You don't have permission to update this profile. If you believe this is a mistake, please reach out to our support team.",
    pt: 'Você não tem permissão para atualizar este perfil. Se você acredita que isso é um erro, por favor, entre em contato com nossa equipe de suporte.',
  },
  CUSTOMER_UPDATED_SUCCESS: {
    en: 'Customer updated successfully',
    pt: 'Cliente atualizado com sucesso',
  },
  LOCATION_UPDATE_STATUS_BLOCKED: {
    en: (vars: { status: string }) =>
      `Location updates are currently unavailable for your account status (${vars.status.toLowerCase()}). Please contact support for more information.`,
    pt: (vars: { status: string }) =>
      `As atualizações de localização estão indisponíveis para o status atual da sua conta (${vars.status.toLowerCase()}). Por favor, entre em contato com o suporte para mais informações.`,
  },
  LOCATION_UPDATE_UNAUTHORIZED: {
    en: "You're not authorized to update the location for this account.",
    pt: 'Você não está autorizado a atualizar a localização para esta conta.',
  },
  LOW_LOCATION_ACCURACY: {
    en: "Low location accuracy detected. Please ensure your device's location services are working correctly and try again.",
    pt: 'Baixa precisão de localização detectada. Certifique-se de que os serviços de localização do seu dispositivo estão funcionando corretamente e tente novamente.',
  },
  CUSTOMER_PROFILE_NOT_FOUND: {
    en: 'Customer profile not found.',
    pt: 'Perfil do cliente não encontrado.',
  },
  LOCATION_UPDATE_FAILED: {
    en: 'We encountered an issue while updating your location. Please try again.',
    pt: 'Encontramos um problema ao atualizar sua localização. Por favor, tente novamente.',
  },
  LIVE_LOCATION_UPDATED_SUCCESS: {
    en: 'Live location and PRIMARY delivery address updated successfully',
    pt: 'Localização em tempo real e endereço de entrega PRINCIPAL atualizados com sucesso',
  },
  DELIVERY_ADDRESS_FIELDS_REQUIRED: {
    en: 'Please fill in all address fields, including street, city, state, country, postal code, and map location, so we can deliver to you accurately.',
    pt: 'Por favor, preencha todos os campos do endereço, incluindo rua, cidade, estado, país, código postal e localização no mapa, para que possamos realizar a entrega com precisão.',
  },
  ONLY_CUSTOMER_CAN_ADD_ADDRESS: {
    en: 'Only customer accounts can add delivery addresses.',
    pt: 'Apenas contas de clientes podem adicionar endereços de entrega.',
  },
  CUSTOMER_PROFILE_SETUP_REQUIRED: {
    en: "We couldn't find your profile. Please ensure your account is fully set up.",
    pt: 'Não conseguimos localizar seu perfil. Por favor, certifique-se de que sua conta está totalmente configurada.',
  },
  ADDRESS_LIMIT_REACHED: {
    en: "You've reached the maximum limit of 5 saved addresses. Please remove an old address before adding a new one.",
    pt: 'Você atingiu o limite máximo de 5 endereços salvos. Por favor, remova um endereço antigo antes de adicionar um novo.',
  },
  ADDRESS_ALREADY_EXISTS: {
    en: 'This address is already in your saved list. No need to add it again!',
    pt: 'Este endereço já está na sua lista de salvos. Não há necessidade de adicioná-lo novamente!',
  },
  DELIVERY_ADDRESS_ADDED_SUCCESS: {
    en: 'Delivery address added successfully',
    pt: 'Endereço de entrega adicionado com sucesso',
  },
  UPDATE_ADDRESS_NOT_FOUND_OR_FORBIDDEN: {
    en: "We couldn't find this address, or you may not have permission to update it.",
    pt: 'Não conseguimos encontrar este endereço ou você pode não ter permissão para atualizá-lo.',
  },
  REQUESTED_ADDRESS_NOT_FOUND: {
    en: 'The requested delivery address could not be found.',
    pt: 'O endereço de entrega solicitado não pôde ser encontrado.',
  },
  PRIMARY_ADDRESS_TYPE_IMMUTABLE: {
    en: 'The type of a PRIMARY address cannot be modified.',
    pt: 'O tipo de um endereço PRINCIPAL não pode ser modificado.',
  },
  CANNOT_SET_PRIMARY_MANUALLY: {
    en: 'You cannot manually set an address type to PRIMARY.',
    pt: 'Você não pode definir manualmente o tipo de um endereço como PRINCIPAL.',
  },
  ADDRESS_COORDINATES_DUPLICATE: {
    en: 'An address with these coordinates is already saved in your list.',
    pt: 'Um endereço com estas coordenadas já está salvo na sua lista.',
  },
  DELIVERY_ADDRESS_UPDATED_SUCCESS: {
    en: 'Delivery address updated successfully',
    pt: 'Endereço de entrega atualizado com sucesso',
  },
  PROFILE_NOT_FOUND_LOGIN_AGAIN: {
    en: 'Profile not found. Please try logging in again.',
    pt: 'Perfil não encontrado. Por favor, tente fazer login novamente.',
  },
  ACTIVATE_ADDRESS_NOT_FOUND: {
    en: "We couldn't find the delivery address you're trying to activate.",
    pt: 'Não conseguimos encontrar o endereço de entrega que você está tentando ativar.',
  },
  DELIVERY_ADDRESS_CHANGED_SUCCESS: {
    en: 'Delivery address changed successfully',
    pt: 'Endereço de entrega alterado com sucesso',
  },
  PROFILE_NOT_FOUND_TRY_AGAIN: {
    en: 'Profile not found. Please try again.',
    pt: 'Perfil não encontrado. Por favor, tente novamente.',
  },
  DELETE_ADDRESS_NOT_FOUND: {
    en: "The address you're trying to delete doesn't exist.",
    pt: 'O endereço que você está tentando excluir não existe.',
  },
  CANNOT_DELETE_ACTIVE_ADDRESS: {
    en: 'You cannot delete your active delivery address. Please set another address as active before deleting this one.',
    pt: 'Você não pode excluir seu endereço de entrega ativo. Por favor, defina outro endereço como ativo antes de excluir este.',
  },
  CANNOT_DELETE_PRIMARY_ADDRESS: {
    en: 'Your primary address is required and cannot be deleted. Please update it if your details have changed.',
    pt: 'Seu endereço principal é obrigatório e não pode ser excluído. Por favor, atualize-o se os seus detalhes mudaram.',
  },
  DELIVERY_ADDRESS_DELETED_SUCCESS: {
    en: 'Delivery address deleted successfully',
    pt: 'Endereço de entrega excluído com sucesso',
  },
  VIEW_CUSTOMER_LIST_FORBIDDEN: {
    en: (vars: { status: string }) =>
      `Access denied. Your account status (${vars.status.toLowerCase()}) does not allow you to view customer lists.`,
    pt: (vars: { status: string }) =>
      `Acesso negado. O status da sua conta (${vars.status.toLowerCase()}) não permite que você visualize listas de clientes.`,
  },
  CUSTOMERS_RETRIEVED_SUCCESS: {
    en: 'Customers Retrieved Successfully',
    pt: 'Clientes recuperados com sucesso',
  },
  VIEW_CUSTOMER_INFO_FORBIDDEN: {
    en: (vars: { status: string }) =>
      `Access denied. Your account status (${vars.status.toLowerCase()}) does not allow you to view this information.`,
    pt: (vars: { status: string }) =>
      `Acesso negado. O status da sua conta (${vars.status.toLowerCase()}) não permite que você visualize esta informação.`,
  },
  VIEW_CUSTOMER_DETAILS_FORBIDDEN: {
    en: "You don't have permission to view this customer's details.",
    pt: 'Você não tem permissão para visualizar os detalhes deste cliente.',
  },
  REQUESTED_CUSTOMER_NOT_FOUND: {
    en: 'The requested customer profile could not be found.',
    pt: 'O perfil do cliente solicitado não pôde ser encontrado.',
  },
  CUSTOMER_RETRIEVED_SUCCESS: {
    en: 'Customer Retrieved Successfully',
    pt: 'Cliente recuperado com sucesso',
  },
} as const;
