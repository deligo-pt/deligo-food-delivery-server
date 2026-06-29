export const sponsorshipsMessages = {
  NOT_APPROVED_WITH_STATUS: {
    en: (vars: { status: string }) =>
      `You are not approved. Your account is ${vars.status}`,
    pt: (vars: { status: string }) =>
      `Você não está aprovado. Sua conta está ${vars.status.toLowerCase()}`,
  },
  BANNER_IMAGE_MUST_BE_FILE: {
    en: 'Banner image must be uploaded as a file, not in text.',
    pt: 'A imagem do banner deve ser carregada como um arquivo, não em texto.',
  },
  SPONSORSHIP_CAMPAIGN_ALREADY_EXISTS_SAME_START_DATE: {
    en: 'This sponsorship campaign already exists for the same start date.',
    pt: 'Esta campanha de patrocínio já existe para a mesma data de início.',
  },
  SPONSORSHIP_CREATED_SUCCESS: {
    en: 'Sponsorship created successfully',
    pt: 'Patrocínio criado com sucesso',
  },
  SPONSORSHIP_NOT_FOUND: {
    en: 'Sponsorship not found',
    pt: 'Patrocínio não encontrado',
  },
  CAMPAIGN_WITH_SAME_NAME_AND_START_DATE_EXISTS: {
    en: 'Another campaign with same name and start date already exists',
    pt: 'Já existe outra campanha com o mesmo nome e data de início',
  },
  SPONSORSHIP_UPDATED_SUCCESS: {
    en: 'Sponsorship updated successfully',
    pt: 'Patrocínio atualizado com sucesso',
  },
  NOT_APPROVED_TO_VIEW_SPONSORSHIPS_WITH_STATUS: {
    en: (vars: { status: string }) =>
      `You are not approved to view sponsorships. Your account is ${vars.status}`,
    pt: (vars: { status: string }) =>
      `Você não está aprovado para visualizar patrocínios. Sua conta está ${vars.status.toLowerCase()}`,
  },
  SPONSORSHIPS_RETRIEVED_SUCCESS: {
    en: 'Sponsorships retrieved successfully',
    pt: 'Patrocínios recuperados com sucesso',
  },
  SPONSORSHIP_NOT_FOUND_OR_DELETED: {
    en: 'Sponsorship is not found or deleted',
    pt: 'Patrocínio não encontrado ou excluído',
  },
  SPONSORSHIP_RETRIEVED_SUCCESS: {
    en: 'Sponsorship retrieved successfully',
    pt: 'Patrocínio recuperado com sucesso',
  },
  SPONSORSHIP_ALREADY_DELETED: {
    en: 'Sponsorship is already deleted',
    pt: 'O patrocínio já foi excluído',
  },
  SPONSORSHIP_DELETED_SUCCESS: {
    en: 'Sponsorship deleted successfully',
    pt: 'Patrocínio excluído com sucesso',
  },
  PLEASE_SOFT_DELETE_FIRST: {
    en: 'Please soft delete first',
    pt: 'Por favor, realize a exclusão lógica primeiro',
  },
  SPONSORSHIP_DELETED_PERMANENTLY: {
    en: 'Sponsorship deleted permanently',
    pt: 'Patrocínio excluído permanentemente',
  },
} as const;
