export const vendorMessages = {
  VENDOR_NOT_FOUND_WITH_DOT: {
    en: 'Vendor not found.',
    pt: 'Comerciante não encontrado.',
  },
  NOT_AUTHORIZED_FOR_ACTION: {
    en: 'You are not authorized for this action.',
    pt: 'Você não tem autorização para realizar esta ação.',
  },
  VENDOR_UPDATE_LOCKED_CONTACT_SUPPORT: {
    en: 'Vendor update is locked. Please contact support.',
    pt: 'A atualização do comerciante está bloqueada. Por favor, entre em contato com o suporte.',
  },
  INVALID_BUSINESS_TYPE: {
    en: 'Invalid business type.',
    pt: 'Tipo de negócio inválido.',
  },
  PLEASE_SELECT_CUISINE_TYPE: {
    en: 'Please select a cuisine type.',
    pt: 'Por favor, selecione um tipo de cozinha.',
  },
  PLEASE_SELECT_AT_LEAST_ONE_CUISINE_TYPE: {
    en: 'Please select at least one cuisine type.',
    pt: 'Por favor, selecione pelo menos um tipo de cozinha.',
  },
  INVALID_CUISINE_TYPE: {
    en: 'Invalid cuisine type.',
    pt: 'Tipo de cozinha inválido.',
  },
  FAILED_TO_UPDATE_VENDOR: {
    en: 'Failed to update vendor.',
    pt: 'Falha ao atualizar o comerciante.',
  },
  VENDOR_UPDATED_SUCCESS: {
    en: 'Vendor updated successfully',
    pt: 'Comerciante atualizado com sucesso',
  },
  VENDOR_NOT_FOUND: {
    en: 'Vendor not found',
    pt: 'Comerciante não encontrado',
  },
  MAXIMUM_IMAGES_ALLOWED_FOR_DOCUMENT: {
    en: (vars: { title: string; existing: number; adding: number }) =>
      `Maximum 3 images are allowed for ${vars.title}. You already have ${vars.existing} and trying to add ${vars.adding}.`,
    pt: (vars: { title: string; existing: number; adding: number }) =>
      `É permitido o máximo de 3 imagens para ${vars.title}. Você já possui ${vars.existing} e está tentando adicionar ${vars.adding}.`,
  },
  VENDOR_DOCUMENT_IMAGE_UPDATED_SUCCESS: {
    en: 'Vendor document image updated successfully',
    pt: 'Imagem do documento do comerciante atualizada com sucesso',
  },
  PROFILE_LOCKED_CONTACT_SUPPORT: {
    en: 'Profile is locked. Contact support.',
    pt: 'O perfil está bloqueado. Entre em contato com o suporte.',
  },
  IMAGE_NOT_FOUND_IN_DOCUMENT_CATEGORY: {
    en: 'Image not found in this document category',
    pt: 'Imagem não encontrada nesta categoria de documento',
  },
  CLOUDINARY_DELETION_FAILED_LOG: {
    en: 'Cloudinary deletion failed:',
    pt: 'Falha na exclusão do Cloudinary:',
  },
  VENDOR_DOCUMENT_IMAGE_DELETED_SUCCESS: {
    en: 'Vendor document image deleted successfully',
    pt: 'Imagem do documento do comerciante excluída com sucesso',
  },
  NOT_APPROVED_TO_UPDATE_LIVE_LOCATION: {
    en: (vars: { status: string }) =>
      `You are not approved to update live location. Your account status is: ${vars.status}`,
    pt: (vars: { status: string }) =>
      `Você não está aprovado para atualizar a localização em tempo real. O status da sua conta é: ${vars.status.toLowerCase()}`,
  },
  NOT_AUTHORIZED_TO_UPDATE_LIVE_LOCATION: {
    en: 'You are not authorize to update live location!',
    pt: 'Você não tem autorização para atualizar a localização em tempo real!',
  },
  GEO_ACCURACY_LESS_THAN_100: {
    en: 'Geo accuracy should be less than 100',
    pt: 'A precisão geográfica deve ser menor que 100',
  },
  VENDOR_NOT_FOUND_OR_UPDATE_FAILED: {
    en: 'Vendor not found or update failed.',
    pt: 'Comerciante não encontrado ou falha na atualização.',
  },
  LIVE_LOCATION_UPDATED_SUCCESS: {
    en: 'Live location updated successfully',
    pt: 'Localização em tempo real atualizada com sucesso',
  },
  NOT_APPROVED_TO_TOGGLE_STORE: {
    en: (vars: { status: string }) =>
      `You are not approved to toggle store open/close. Your account is ${vars.status}`,
    pt: (vars: { status: string }) =>
      `Você não está aprovado para abrir/fechar a loja. Sua conta está ${vars.status.toLowerCase()}`,
  },
  STORE_STATUS_MESSAGE: {
    en: (vars: { isOpen: boolean }) =>
      `Store is ${vars.isOpen ? 'open' : 'closed'}`,
    pt: (vars: { isOpen: boolean }) =>
      `A loja está ${vars.isOpen ? 'aberta' : 'fechada'}`,
  },
  NOT_APPROVED_TO_VIEW_VENDORS: {
    en: (vars: { status: string }) =>
      `You are not approved to view vendors. Your account is ${vars.status}`,
    pt: (vars: { status: string }) =>
      `Você não está aprovado para visualizar comerciantes. Sua conta está ${vars.status.toLowerCase()}`,
  },
  VENDORS_RETRIEVED_SUCCESS: {
    en: 'Vendors Retrieved Successfully',
    pt: 'Comerciantes recuperados com sucesso',
  },
  NOT_AUTHORIZED_TO_ACCESS_VENDOR: {
    en: 'You are not authorize to access this vendor!',
    pt: 'Você não tem autorização para acessar este comerciante!',
  },
  VENDOR_NOT_FOUND_WITH_EXCLAMATION: {
    en: 'Vendor not found!',
    pt: 'Comerciante não encontrado!',
  },
  VENDOR_RETRIEVED_SUCCESS: {
    en: 'Vendor Retrieved Successfully',
    pt: 'Comerciante recuperado com sucesso',
  },
  CUSTOMER_PROFILE_NOT_FOUND_SETUP_FIRST: {
    en: 'Customer profile not found. Please set up your profile first.',
    pt: 'Perfil de cliente não encontrado. Por favor, configure seu perfil primeiro.',
  },
  LOCATION_REQUIRED_SELECT_ADDRESS_OR_ENABLE_GPS: {
    en: 'Location required. Please select a delivery address or enable GPS to find nearby restaurants.',
    pt: 'Localização obrigatória. Por favor, selecione um endereço de entrega ou ative o GPS para encontrar restaurantes próximos.',
  },
  LOCATION_COORDINATES_REQUIRED_FOR_NEARBY_RESTAURANTS: {
    en: 'Location coordinates (latitude and longitude) are strictly required to find nearby restaurants.',
    pt: 'As coordenadas de localização (latitude e longitude) são estritamente obrigatórias para encontrar restaurantes próximos.',
  },
} as const;
