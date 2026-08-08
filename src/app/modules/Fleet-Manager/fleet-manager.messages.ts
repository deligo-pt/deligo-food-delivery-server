export const fleetManagerMessages = {
  FLEET_MANAGER_PROFILE_NOT_FOUND_DOT: {
    en: 'Fleet manager profile details not found.',
    pt: 'Os detalhes do perfil do gestor de frota não foram encontrados.',
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
  FLEET_MANAGER_PROFILE_LOCKED: {
    en: 'Profile configuration is locked. Please contact support for assistance.',
    pt: 'A configuração do perfil está bloqueada. Por favor, entre em contato com o suporte para obter assistência.',
  },
  IMAGE_NOT_FOUND_IN_CATEGORY: {
    en: 'The requested image could not be found in this category.',
    pt: 'A imagem solicitada não pôde ser encontrada nesta categoria.',
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
