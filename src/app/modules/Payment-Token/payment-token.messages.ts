export const paymentTokenMessages = {
  CARD_SAVED_SUCCESS: {
    en: 'Your card was saved successfully.',
    pt: 'O seu cartão foi guardado com sucesso.',
  },
  CARD_TOKENIZATION_FAILED_BY_GATEWAY: {
    en: 'The payment gateway rejected the card tokenization request.',
    pt: 'O gateway de pagamento rejeitou o pedido de tokenização do cartão.',
  },
  CARD_TOKEN_NOT_RECEIVED: {
    en: 'The payment gateway did not return a card token. Please try again.',
    pt: 'O gateway de pagamento não devolveu um token de cartão. Tente novamente.',
  },
  SAVED_CARDS_FETCHED_SUCCESS: {
    en: 'Saved cards fetched successfully.',
    pt: 'Cartões guardados obtidos com sucesso.',
  },
  SAVED_CARD_NOT_FOUND: {
    en: 'This saved card could not be found or no longer belongs to you.',
    pt: 'Este cartão guardado não foi encontrado ou já não lhe pertence.',
  },
  SAVED_CARD_ALREADY_DISABLED: {
    en: 'This saved card has already been removed.',
    pt: 'Este cartão guardado já foi removido.',
  },
  SAVED_CARD_DISABLE_FAILED_BY_GATEWAY: {
    en: 'The payment gateway failed to disable this saved card. Please try again later.',
    pt: 'O gateway de pagamento não conseguiu desativar este cartão guardado. Tente novamente mais tarde.',
  },
} as const;
