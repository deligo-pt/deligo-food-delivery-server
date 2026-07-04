export const offerMessages = {
  NOT_AUTHORIZED_WITH_ACCOUNT_STATUS: {
    en: (vars: { status: string }) =>
      `Access denied. Your account is currently ${vars.status.toLowerCase()}.`,
    pt: (vars: { status: string }) =>
      `Acesso negado. Sua conta está atualmente ${vars.status.toLowerCase()}.`,
  },
  OFFER_CODE_ALREADY_EXISTS: {
    en: 'An active offer with this code already exists.',
    pt: 'Uma oferta ativa com este código já existe.',
  },
  INVALID_OFFER_OR_PROMO_CODE: {
    en: 'Invalid offer or promo code.',
    pt: 'Oferta ou código promocional inválido.',
  },
  OFFER_REQUIRES_VALID_PROMO_CODE: {
    en: 'This offer requires a valid promo code.',
    pt: 'Esta oferta requer um código promocional válido.',
  },
  MIN_ORDER_AMOUNT_REQUIRED_TEMPLATE: {
    en: (vars: { amount: number }) =>
      `This offer requires a minimum order amount of ${vars.amount}.`,
    pt: (vars: { amount: number }) =>
      `Esta oferta exige um valor mínimo de pedido de ${vars.amount}.`,
  },
  BOGO_CREATE_DISABLED: {
    en: 'Buy-One-Get-One (BOGO) offers are temporarily disabled.',
    pt: 'Ofertas do tipo "Leve 2, Pague 1" (BOGO) estão temporariamente desativadas.',
  },
  VALID_DISCOUNT_VALUE_REQUIRED: {
    en: (vars: { offerType: string }) =>
      `A valid discount value is required for ${vars.offerType} offers.`,
    pt: (vars: { offerType: string }) =>
      `Um valor de desconto válido é obrigatório para ofertas do tipo ${vars.offerType}.`,
  },
  INVALID_OFFER_TYPE: {
    en: 'Invalid offer type selected.',
    pt: 'Tipo de oferta inválido selecionado.',
  },
  END_DATE_AFTER_START_DATE: {
    en: 'End date must be after the start date.',
    pt: 'A data de término deve ser posterior à data de início.',
  },
  END_DATE_CANNOT_BE_IN_PAST: {
    en: 'End date cannot be in the past.',
    pt: 'A data de término não pode estar no passado.',
  },
  OFFER_CREATED_SUCCESS: {
    en: 'Offer created successfully.',
    pt: 'Oferta criada com sucesso.',
  },
  NOT_APPROVED_WITH_STATUS: {
    en: (vars: { status: string }) =>
      `Access denied. Your current account status is: ${vars.status.toLowerCase()}.`,
    pt: (vars: { status: string }) =>
      `Acesso negado. O status atual da sua conta é: ${vars.status.toLowerCase()}.`,
  },
  OFFER_NOT_FOUND: {
    en: 'The requested offer could not be found.',
    pt: 'A oferta solicitada não pôde ser encontrada.',
  },
  NOT_AUTHORIZED_TO_UPDATE_OFFER: {
    en: 'You do not have permission to update this offer.',
    pt: 'Você não tem permissão para atualizar esta oferta.',
  },
  EXPIRED_OFFER_UPDATE_REQUIRES_DATE_EXTENSION: {
    en: 'An expired offer cannot be updated without extending the end date.',
    pt: 'Uma oferta expirada não pode ser atualizada sem estender a data de término.',
  },
  BOGO_UPDATE_DISABLED: {
    en: 'BOGO offers are currently disabled and cannot be modified.',
    pt: 'Ofertas do tipo "Leve 2, Pague 1" (BOGO) estão desativadas e não podem ser modificadas.',
  },
  CODE_ALREADY_IN_USE: {
    en: 'This promo code is already in use.',
    pt: 'Este código promocional já está em uso.',
  },
  CODE_REQUIRED_FOR_MANUAL_OFFERS: {
    en: 'A promo code is required for manual offers.',
    pt: 'O código é obrigatório para ofertas manuais.',
  },
  PERCENTAGE_RANGE_INVALID: {
    en: 'Discount percentage must be between 1 and 100.',
    pt: 'O percentual de desconto deve estar entre 1 e 100.',
  },
  FLAT_DISCOUNT_MUST_BE_POSITIVE: {
    en: 'Flat discount amount must be a positive value.',
    pt: 'O valor do desconto fixo deve ser positivo.',
  },
  MAX_USAGE_LESS_THAN_CURRENT_USAGE: {
    en: 'Maximum usage limit cannot be less than the current usage.',
    pt: 'O limite máximo de uso não pode ser menor do que o uso atual.',
  },
  OFFER_UPDATED_SUCCESS: {
    en: 'Offer updated successfully.',
    pt: 'Oferta atualizada com sucesso.',
  },
  ACCOUNT_CANNOT_PERFORM_ACTION: {
    en: (vars: { status: string }) =>
      `Your account status (${vars.status.toLowerCase()}) restricts this action.`,
    pt: (vars: { status: string }) =>
      `O status da sua conta (${vars.status.toLowerCase()}) restringe esta ação.`,
  },
  CANNOT_TOGGLE_DELETED_OFFER: {
    en: 'Cannot modify a deleted offer.',
    pt: 'Não é possível alterar uma oferta excluída.',
  },
  NOT_AUTHORIZED_TO_CHANGE_OFFER_STATUS: {
    en: 'You do not have permission to change the status of this offer.',
    pt: 'Você não tem permissão para alterar o status desta oferta.',
  },
  CANNOT_ACTIVATE_EXPIRED_OFFER: {
    en: 'Cannot activate an expired offer. Please update the end date first.',
    pt: 'Não é possível ativar uma oferta expirada. Por favor, atualize a data de término primeiro.',
  },
  OFFER_STATUS_TOGGLED_SUCCESS: {
    en: (vars: { isActive: boolean }) =>
      `Offer ${vars.isActive ? 'activated' : 'deactivated'} successfully.`,
    pt: (vars: { isActive: boolean }) =>
      `Oferta ${vars.isActive ? 'ativada' : 'desativada'} com sucesso.`,
  },
  CHECKOUT_SESSION_NOT_FOUND: {
    en: 'Checkout session could not be found.',
    pt: 'Sessão de checkout não pôde ser encontrada.',
  },
  CHECKOUT_DOES_NOT_BELONG_TO_USER: {
    en: 'Access denied. This checkout session belongs to another profile.',
    pt: 'Acesso negado. Esta sessão de checkout pertence a outro perfil.',
  },
  CANNOT_APPLY_OFFER_TO_COMPLETED_CHECKOUT: {
    en: 'Cannot apply an offer to an already completed checkout.',
    pt: 'Não é possível aplicar uma oferta a um checkout já concluído.',
  },
  OFFER_REMOVED_OR_INVALID: {
    en: 'This offer is no longer valid or has been removed.',
    pt: 'Esta oferta não é mais válida ou foi removida.',
  },
  OFFER_APPLIED_SUCCESS: {
    en: 'Promo code applied successfully!',
    pt: 'Cupom aplicado com sucesso!',
  },
  OFFER_IS_APPLICABLE: {
    en: 'This offer is applicable.',
    pt: 'Esta oferta é aplicável.',
  },
  OFFER_NOT_VALID_FOR_CART_PRODUCTS: {
    en: 'This offer is not valid for the items in your cart.',
    pt: 'Esta oferta não é válida para os itens no seu carrinho.',
  },
  ADD_MORE_TO_UNLOCK_OFFER: {
    en: (vars: { amount: number }) =>
      `Add ${vars.amount} more to unlock this offer.`,
    pt: (vars: { amount: number }) =>
      `Adicione mais ${vars.amount} para liberar esta oferta.`,
  },
  OFFER_USAGE_LIMIT_EXCEEDED: {
    en: 'You have reached the usage limit for this promo code.',
    pt: 'Você atingiu o limite de uso deste cupom.',
  },
  AVAILABLE_OFFERS_FETCHED_SUCCESS: {
    en: 'Available offers loaded successfully.',
    pt: 'Ofertas disponíveis carregadas com sucesso.',
  },
  OFFERS_FETCHED_SUCCESS: {
    en: 'Offers list loaded successfully.',
    pt: 'Lista de ofertas carregada com sucesso.',
  },
  OFFER_NOT_FOUND_OR_UNAVAILABLE: {
    en: 'Offer not found or currently unavailable.',
    pt: 'Oferta não encontrada ou indisponível no momento.',
  },
  NOT_AUTHORIZED_TO_VIEW_OFFER: {
    en: 'You do not have permission to view this offer.',
    pt: 'Você não tem permissão para visualizar esta oferta.',
  },
  OFFER_FETCHED_SUCCESS: {
    en: 'Offer details loaded successfully.',
    pt: 'Detalhes da oferta carregados com sucesso.',
  },
  OFFER_ALREADY_DELETED: {
    en: 'This offer has already been deleted.',
    pt: 'Esta oferta já foi excluída.',
  },
  NOT_AUTHORIZED_TO_DELETE_OFFER: {
    en: 'You do not have permission to delete this offer.',
    pt: 'Você não tem permissão para excluir esta oferta.',
  },
  ACTIVE_OFFER_MUST_BE_DEACTIVATED_BEFORE_DELETING: {
    en: 'An active offer must be deactivated before it can be deleted.',
    pt: 'Uma oferta ativa deve ser desativada antes de poder ser excluída.',
  },
  OFFER_DELETED_SUCCESS: {
    en: 'Offer removed successfully.',
    pt: 'Oferta removida com sucesso.',
  },
  ONLY_ADMIN_CAN_PERMANENTLY_DELETE_OFFER: {
    en: 'Access denied. Only administrators can permanently delete an offer.',
    pt: 'Acesso negado. Apenas administradores podem excluir permanentemente uma oferta.',
  },
  SOFT_DELETE_REQUIRED_BEFORE_PERMANENT_DELETE: {
    en: 'This offer must be deactivated before it can be permanently deleted.',
    pt: 'Esta oferta deve ser desativada antes de poder ser excluída permanentemente.',
  },
  ACTIVE_OFFER_CANNOT_BE_PERMANENTLY_DELETED: {
    en: 'An active offer cannot be permanently deleted.',
    pt: 'Uma oferta ativa não pode ser excluída permanentemente.',
  },
  OFFER_PERMANENTLY_DELETED_SUCCESS: {
    en: 'Offer permanently deleted from the system.',
    pt: 'Oferta excluída permanentemente do sistema.',
  },
} as const;
