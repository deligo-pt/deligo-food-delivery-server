export const sponsorshipsMessages = {
  // --- Unique Validation & Logic Errors ---
  BANNER_IMAGE_MUST_BE_FILE: {
    en: 'Banner image must be uploaded as a valid image file.',
    pt: 'A imagem do banner deve ser carregada como um arquivo de imagem válido.',
  },
  SPONSORSHIP_CAMPAIGN_ALREADY_EXISTS_SAME_START_DATE: {
    en: 'A sponsorship campaign already exists for the selected start date.',
    pt: 'Uma campanha de patrocínio já existe para a data de início selecionada.',
  },
  CAMPAIGN_WITH_SAME_NAME_AND_START_DATE_EXISTS: {
    en: 'Another campaign with the same name and start date already exists.',
    pt: 'Já existe outra campanha com o mesmo nome e data de início.',
  },
  SPONSORSHIP_NOT_FOUND_OR_DELETED: {
    en: 'The requested sponsorship could not be found or has been deleted.',
    pt: 'O patrocínio solicitado não pôde ser encontrado ou foi excluído.',
  },

  // --- Global Mappings Block (To be handled by globalCommonMessages) ---
  SPONSORSHIP_NOT_FOUND: {
    en: 'Sponsorship not found.',
    pt: 'Patrocínio não encontrado.',
  },
  SPONSORSHIP_ALREADY_DELETED: {
    en: 'Sponsorship already deleted.',
    pt: 'O patrocínio já foi excluído.',
  },
} as const;
