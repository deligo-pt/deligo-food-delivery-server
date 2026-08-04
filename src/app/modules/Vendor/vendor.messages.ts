export const vendorMessages = {
  // --- Unique Validation & Business Logic Errors ---
  VENDOR_UPDATE_LOCKED_CONTACT_SUPPORT: {
    en: 'Vendor profile configuration is locked. Please contact support.',
    pt: 'A atualização do perfil do fornecedor está bloqueada. Por favor, entre em contato com o suporte.',
  },
  INVALID_BUSINESS_TYPE: {
    en: 'Invalid business type selected.',
    pt: 'Tipo de negócio inválido selecionado.',
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
    en: 'Invalid cuisine type selected.',
    pt: 'Tipo de cozinha inválido selecionado.',
  },
  MAXIMUM_IMAGES_ALLOWED_FOR_DOCUMENT: {
    en: (vars: { title: string; existing: number; adding: number }) =>
      `Maximum 3 images are allowed for ${vars.title}. You currently have ${vars.existing} and are trying to add ${vars.adding}.`,
    pt: (vars: { title: string; existing: number; adding: number }) =>
      `É permitido o máximo de 3 imagens para ${vars.title}. Você já possui ${vars.existing} e está tentando adicionar ${vars.adding}.`,
  },
  VENDOR_PROFILE_LOCKED: {
    en: 'Profile is locked. Please contact support.',
    pt: 'O perfil está bloqueado. Entre em contato com o suporte.',
  },
  IMAGE_NOT_FOUND_IN_DOCUMENT_CATEGORY: {
    en: 'The requested image could not be found in this document category.',
    pt: 'Imagem não encontrada nesta categoria de documento.',
  },
  GEO_ACCURACY_LESS_THAN_100: {
    en: 'GPS location accuracy must be less than 100 meters.',
    pt: 'A precisão geográfica deve ser menor que 100 metros.',
  },
  LOCATION_REQUIRED_SELECT_ADDRESS_OR_ENABLE_GPS: {
    en: 'Location required. Please select an address or enable GPS to view nearby restaurants.',
    pt: 'Localização obrigatória. Por favor, selecione um endereço ou ative o GPS para encontrar restaurantes próximos.',
  },
  LOCATION_COORDINATES_REQUIRED_FOR_NEARBY_RESTAURANTS: {
    en: 'Location coordinates are required to discover nearby restaurants.',
    pt: 'As coordenadas de localização são obrigatórias para encontrar restaurantes próximos.',
  },

  // --- Unique Lifecycle Success & State Messages ---
  VENDOR_DOCUMENT_IMAGE_DELETED_SUCCESS: {
    en: 'Vendor document image deleted successfully.',
    pt: 'Imagem do documento do fornecedor excluída com sucesso.',
  },
  STORE_STATUS_MESSAGE: {
    en: (vars: { isOpen: boolean }) =>
      `Store is now ${vars.isOpen ? 'OPEN' : 'CLOSED'}.`,
    pt: (vars: { isOpen: boolean }) =>
      `A loja está ${vars.isOpen ? 'ABERTA' : 'FECHADA'}.`,
  },

  VENDOR_NOT_FOUND_OR_UPDATE_FAILED: {
    en: 'Vendor profile not found or update failed.',
    pt: 'Fornecedor não encontrado ou falha na atualização.',
  },
  CUSTOMER_PROFILE_NOT_FOUND_SETUP_FIRST: {
    en: 'Profile not found. Please set up your account first.',
    pt: 'Perfil não encontrado. Por favor, configure seu perfil primeiro.',
  },
} as const;
