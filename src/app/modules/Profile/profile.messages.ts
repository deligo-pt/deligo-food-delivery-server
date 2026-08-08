export const profileMessages = {
  ACCOUNT_STATUS_CONTACT_SUPPORT: {
    en: (vars: { status: string }) =>
      `Your account is ${vars.status.toLowerCase()}. Please contact support.`,
    pt: (vars: { status: string }) =>
      `Sua conta está ${vars.status.toLowerCase()}. Por favor, entre em contato com o suporte.`,
  },
  EMAIL_OR_CONTACT_REQUIRED: {
    en: 'Email or contact number is required.',
    pt: 'E-mail ou número de contato é obrigatório.',
  },
  CONTACT_ALREADY_LINKED_AND_VERIFIED: {
    en: 'This contact number is already linked to your account and verified.',
    pt: 'Este número de contato já está associado à sua conta e verificado.',
  },
  MOBILE_ALREADY_REGISTERED_ANOTHER_ACCOUNT: {
    en: 'This mobile number is already registered with another account.',
    pt: 'Este número de celular já está registrado em outra conta.',
  },
  EMAIL_ALREADY_LINKED_AND_VERIFIED: {
    en: 'This email is already linked to your account and verified.',
    pt: 'Este e-mail já está associado à sua conta e verificado.',
  },
  EMAIL_ALREADY_REGISTERED_ANOTHER_ACCOUNT: {
    en: 'This email is already registered with another account.',
    pt: 'Este e-mail já está registrado em outra conta.',
  },
  MOBILE_UNDERGOING_VERIFICATION_BY_ANOTHER_USER: {
    en: 'This mobile number is currently being verified by another user. Please try again in 5 minutes.',
    pt: 'Este número de celular está passando por verificação por outro usuário. Tente novamente em 5 minutos.',
  },
  MOBILE_OTP_SENT_SUCCESS: {
    en: 'Verification code sent to your mobile number. Please verify within 5 minutes.',
    pt: 'Código de verificação enviado para o seu celular. Por favor, verifique dentro de 5 minutos.',
  },
  EMAIL_UNDERGOING_VERIFICATION_BY_ANOTHER_USER: {
    en: 'This email address is currently being verified by another user. Please try again in 5 minutes.',
    pt: 'Este endereço de e-mail está passando por verificação por outro usuário. Tente novamente em 5 minutos.',
  },
  VERIFY_EMAIL_SUBJECT: {
    en: 'Verify your email for DeliGo',
    pt: 'Verifique o seu e-mail do DeliGo',
  },
  EMAIL_OTP_SENT_SUCCESS: {
    en: 'Verification code sent to your email. Please verify within 5 minutes.',
    pt: 'Código de verificação enviado para o seu e-mail. Por favor, verifique dentro de 5 minutos.',
  },
  INVALID_USER_ROLE_MAPPING: {
    en: 'Invalid or unrecognized user role mapping.',
    pt: 'Mapeamento de função de usuário inválido ou não reconhecido.',
  },
  OTP_EXPIRED_OR_INVALID_REQUEST_NEW: {
    en: 'The verification code has expired or is invalid. Please request a new one.',
    pt: 'O código de verificação expirou ou é inválido. Por favor, solicite um novo.',
  },
  INVALID_OTP_CODE: {
    en: 'Invalid verification code.',
    pt: 'Código de verificação inválido.',
  },
  INVALID_OR_EXPIRED_OTP_CODE: {
    en: 'Invalid or expired verification code.',
    pt: 'Código de verificação inválido ou expirado.',
  },
} as const;
