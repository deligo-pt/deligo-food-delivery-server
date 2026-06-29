export const offerMessages = {
  NOT_AUTHORIZED_WITH_ACCOUNT_STATUS: {
    en: (vars: { status: string }) =>
      `You are not authorized. Your account is ${vars.status}`,
    pt: (vars: { status: string }) =>
      `Você não está autorizado. Sua conta está ${vars.status.toLowerCase()}`,
  },
  OFFER_CODE_ALREADY_EXISTS: {
    en: 'An active offer with this code already exists',
    pt: 'Uma oferta ativa com este código já existe',
  },
  BOGO_CREATE_DISABLED: {
    en: 'BOGO offers are temporarily disabled and cannot be created at this time.',
    pt: 'Ofertas do tipo "Leve 2, Pague 1" (BOGO) estão temporariamente desativadas e não podem ser criadas no momento.',
  },
  VALID_DISCOUNT_VALUE_REQUIRED: {
    en: (vars: { offerType: string }) =>
      `Valid discountValue is required for ${vars.offerType} offer`,
    pt: (vars: { offerType: string }) =>
      `Um valor de desconto válido é obrigatório para ofertas do tipo ${vars.offerType}`,
  },
  INVALID_OFFER_TYPE: {
    en: 'Invalid offer type',
    pt: 'Tipo de oferta inválido',
  },
  END_DATE_AFTER_START_DATE: {
    en: 'End date must be after start date',
    pt: 'A data de término deve ser posterior à data de início',
  },
  END_DATE_CANNOT_BE_IN_PAST: {
    en: 'End date cannot be in the past',
    pt: 'A data de término não pode estar no passado',
  },
  OFFER_CREATED_SUCCESS: {
    en: 'Offer created successfully',
    pt: 'Oferta criada com sucesso',
  },
  NOT_APPROVED_WITH_STATUS: {
    en: (vars: { status: string }) =>
      `You are not approved. Status: ${vars.status}`,
    pt: (vars: { status: string }) =>
      `Você não está aprovado. Status: ${vars.status.toLowerCase()}`,
  },
  OFFER_NOT_FOUND: {
    en: 'Offer not found',
    pt: 'Oferta não encontrada',
  },
  NOT_AUTHORIZED_TO_UPDATE_OFFER: {
    en: 'You are not authorized to update this offer',
    pt: 'Você não tem permissão para atualizar esta oferta',
  },
  EXPIRED_OFFER_UPDATE_REQUIRES_DATE_EXTENSION: {
    en: 'Expired offer cannot be updated without extending the date',
    pt: 'Uma oferta expirada não pode ser atualizada sem a extensão da data de término',
  },
  BOGO_UPDATE_DISABLED: {
    en: 'BOGO offers are currently disabled. You cannot update or switch to BOGO type.',
    pt: 'Ofertas do tipo "Leve 2, Pague 1" (BOGO) estão desativadas. Você não pode atualizar ou alterar para o tipo BOGO.',
  },
  CODE_ALREADY_IN_USE: {
    en: 'Code already in use',
    pt: 'Este código já está em uso',
  },
  CODE_REQUIRED_FOR_MANUAL_OFFERS: {
    en: 'Code is required for manual offers',
    pt: 'O código é obrigatório para ofertas manuais',
  },
  PERCENTAGE_RANGE_INVALID: {
    en: 'Percentage must be between 1-100',
    pt: 'O percentual deve estar entre 1 e 100',
  },
  FLAT_DISCOUNT_MUST_BE_POSITIVE: {
    en: 'Flat discount must be positive',
    pt: 'O desconto fixo deve ser um valor positivo',
  },
  MAX_USAGE_LESS_THAN_CURRENT_USAGE: {
    en: 'Max usage cannot be less than current usage',
    pt: 'O limite máximo de uso não pode ser menor do que o uso atual',
  },
  OFFER_UPDATED_SUCCESS: {
    en: 'Offer updated successfully',
    pt: 'Oferta atualizada com sucesso',
  },
  ACCOUNT_CANNOT_PERFORM_ACTION: {
    en: (vars: { status: string }) =>
      `Your account is ${vars.status}. You cannot perform this action.`,
    pt: (vars: { status: string }) =>
      `Sua conta está ${vars.status.toLowerCase()}. Você não pode realizar esta ação.`,
  },
  CANNOT_TOGGLE_DELETED_OFFER: {
    en: 'Cannot toggle a deleted offer',
    pt: 'Não é possível alterar o status de uma oferta excluída',
  },
  NOT_AUTHORIZED_TO_CHANGE_OFFER_STATUS: {
    en: 'You are not authorized to change the status of this offer',
    pt: 'Você não tem permissão para alterar o status desta oferta',
  },
  CANNOT_ACTIVATE_EXPIRED_OFFER: {
    en: 'Cannot activate an expired offer. Please update the end date first.',
    pt: 'Não é possível ativar uma oferta expirada. Por favor, atualize a data de término primeiro.',
  },
  OFFER_STATUS_TOGGLED_SUCCESS: {
    en: (vars: { isActive: boolean }) =>
      `Offer ${vars.isActive ? 'activated' : 'deactivated'} successfully`,
    pt: (vars: { isActive: boolean }) =>
      `Oferta ${vars.isActive ? 'ativada' : 'desativada'} com sucesso`,
  },
  CHECKOUT_SESSION_NOT_FOUND: {
    en: 'Checkout session not found',
    pt: 'Sessão de checkout não encontrada',
  },
  CHECKOUT_DOES_NOT_BELONG_TO_USER: {
    en: "This checkout session doesn't belong to you",
    pt: 'Esta sessão de checkout não pertence ao seu usuário',
  },
  CANNOT_APPLY_OFFER_TO_COMPLETED_CHECKOUT: {
    en: 'Cannot apply offer to completed checkout',
    pt: 'Não é possível aplicar uma oferta a um checkout já concluído',
  },
  OFFER_REMOVED_OR_INVALID: {
    en: 'Offer removed/invalid',
    pt: 'Oferta removida ou inválida',
  },
  OFFER_APPLIED_SUCCESS: {
    en: 'Offer applied successfully',
    pt: 'Oferta aplicada com sucesso',
  },
  OFFER_IS_APPLICABLE: {
    en: 'Offer is applicable',
    pt: 'A oferta é aplicável',
  },
  OFFER_NOT_VALID_FOR_CART_PRODUCTS: {
    en: 'This offer is not valid for the products in your cart',
    pt: 'Esta oferta não é válida para os produtos no seu carrinho',
  },
  ADD_MORE_TO_UNLOCK_OFFER: {
    en: (vars: { amount: number }) =>
      `Add €${vars.amount} more to unlock this offer`,
    pt: (vars: { amount: number }) =>
      `Adicione mais €${vars.amount} para liberar esta oferta`,
  },
  OFFER_USAGE_LIMIT_EXCEEDED: {
    en: 'You have exceeded the usage limit for this offer',
    pt: 'Você excedeu o limite de uso desta oferta',
  },
  AVAILABLE_OFFERS_FETCHED_SUCCESS: {
    en: 'Available offers fetched successfully',
    pt: 'Ofertas disponíveis recuperadas com sucesso',
  },
  OFFERS_FETCHED_SUCCESS: {
    en: 'Offers fetched successfully',
    pt: 'Ofertas recuperadas com sucesso',
  },
  OFFER_NOT_FOUND_OR_UNAVAILABLE: {
    en: 'Offer not found or unavailable',
    pt: 'Oferta não encontrada ou indisponível',
  },
  NOT_AUTHORIZED_TO_VIEW_OFFER: {
    en: 'You are not authorized to view this offer',
    pt: 'Você não tem permissão para visualizar esta oferta',
  },
  OFFER_FETCHED_SUCCESS: {
    en: 'Offer fetched successfully',
    pt: 'Oferta recuperada com sucesso',
  },
  OFFER_ALREADY_DELETED: {
    en: 'Offer is already deleted',
    pt: 'A oferta já foi excluída',
  },
  NOT_AUTHORIZED_TO_DELETE_OFFER: {
    en: 'You are not authorized to delete this offer',
    pt: 'Você não tem permissão para excluir esta oferta',
  },
  ACTIVE_OFFER_MUST_BE_DEACTIVATED_BEFORE_DELETING: {
    en: 'Active offer must be deactivated before deleting',
    pt: 'Uma oferta ativa deve ser desativada antes de ser excluída',
  },
  OFFER_DELETED_SUCCESS: {
    en: 'Offer deleted successfully',
    pt: 'Oferta excluída com sucesso',
  },
  ONLY_ADMIN_CAN_PERMANENTLY_DELETE_OFFER: {
    en: 'Only admin can permanently delete an offer',
    pt: 'Apenas administradores podem excluir permanentemente uma oferta',
  },
  SOFT_DELETE_REQUIRED_BEFORE_PERMANENT_DELETE: {
    en: 'Offer must be soft deleted before permanent delete',
    pt: 'A oferta deve ser excluída logicamente primeiro antes de realizar a exclusão permanente',
  },
  ACTIVE_OFFER_CANNOT_BE_PERMANENTLY_DELETED: {
    en: 'Active offer cannot be permanently deleted',
    pt: 'Uma oferta ativa não pode ser excluída permanentemente',
  },
  OFFER_PERMANENTLY_DELETED_SUCCESS: {
    en: 'Offer permanently deleted successfully',
    pt: 'Oferta excluída permanentemente com sucesso',
  },
} as const;
