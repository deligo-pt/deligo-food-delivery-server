export const profileMessages = {
  ACCOUNT_STATUS_CONTACT_SUPPORT: {
    en: (vars: { status: string }) =>
      `Your account is ${vars.status.toLowerCase()}. Please contact support.`,
    pt: (vars: { status: string }) =>
      `Sua conta está ${vars.status.toLowerCase()}. Por favor, entre em contato com o suporte.`,
  },
  MY_PROFILE_RETRIEVED_SUCCESS: {
    en: 'My Profile Retrieve Successfully',
    pt: 'Meu perfil recuperado com sucesso',
  },
  EMAIL_OR_CONTACT_REQUIRED: {
    en: 'Email or contact number is required',
    pt: 'E-mail ou número de contato é obrigatório',
  },
  CONTACT_ALREADY_LINKED_AND_VERIFIED: {
    en: 'This contact number is already linked to your account and verified. Please use another.',
    pt: 'Este número de contato já está associado à sua conta e verificado. Por favor, use outro.',
  },
  MOBILE_ALREADY_REGISTERED_ANOTHER_ACCOUNT: {
    en: 'This mobile number is already registered with another account.',
    pt: 'Este número de telemóvel já está registrado em outra conta.',
  },
  EMAIL_ALREADY_LINKED_AND_VERIFIED: {
    en: 'This email is already linked to your account and verified. Please use another.',
    pt: 'Este e-mail já está associado à sua conta e verificado. Por favor, use outro.',
  },
  EMAIL_ALREADY_REGISTERED_ANOTHER_ACCOUNT: {
    en: 'This email is already registered with another account.',
    pt: 'Este e-mail já está registrado em outra conta.',
  },
  MOBILE_UNDERGOING_VERIFICATION_BY_ANOTHER_USER: {
    en: 'This mobile number is currently undergoing verification by another user. Please try again after 5 minutes.',
    pt: 'Este número de telemóvel está passando por verificação por outro usuário no momento. Por favor, tente novamente após 5 minutos.',
  },
  FAILED_TO_RECEIVE_OTP_REFERENCE_FROM_GATEWAY: {
    en: 'Failed to receive OTP reference from gateway',
    pt: 'Falha ao receber a referência do OTP do gateway de comunicação',
  },
  MOBILE_OTP_SENT_SUCCESS: {
    en: 'OTP sent to your mobile number. Please verify within 5 minutes to update.',
    pt: 'Código OTP enviado para o seu número de telemóvel. Por favor, verifique dentro de 5 minutos para atualizar.',
  },
  EMAIL_UNDERGOING_VERIFICATION_BY_ANOTHER_USER: {
    en: 'This email address is currently undergoing verification by another user. Please try again after 5 minutes.',
    pt: 'Este endereço de e-mail está passando por verificação por outro usuário no momento. Por favor, tente novamente após 5 minutos.',
  },
  VERIFY_EMAIL_SUBJECT: {
    en: 'Verify your email for DeliGo',
    pt: 'Verifique o seu e-mail do DeliGo',
  },
  EMAIL_SENDING_FAILED_LOG: {
    en: 'Email sending failed:',
    pt: 'Falha no envio do e-mail:',
  },
  EMAIL_OTP_SENT_SUCCESS: {
    en: 'OTP sent to your email. Please verify within 5 minutes to update.',
    pt: 'Código OTP enviado para o seu e-mail. Por favor, verifique dentro de 5 minutos para atualizar.',
  },
  INVALID_USER_ROLE_MAPPING: {
    en: 'Invalid user role mapping.',
    pt: 'Mapeamento de função de usuário inválido.',
  },
  OTP_EXPIRED_OR_INVALID_REQUEST_NEW: {
    en: 'OTP has expired or is invalid. Please request a new one.',
    pt: 'O código OTP expirou ou é inválido. Por favor, solicite um novo.',
  },
  INVALID_OTP_CODE: {
    en: 'Invalid OTP code.',
    pt: 'Código OTP inválido.',
  },
  EMAIL_UPDATED_SUCCESS: {
    en: 'Email updated successfully.',
    pt: 'E-mail atualizado com sucesso.',
  },
  INVALID_OR_EXPIRED_OTP_CODE: {
    en: 'Invalid or expired OTP code.',
    pt: 'Código OTP inválido ou expirado.',
  },
  CONTACT_NUMBER_UPDATED_SUCCESS: {
    en: 'Contact number updated successfully.',
    pt: 'Número de contato atualizado com sucesso.',
  },
} as const;
