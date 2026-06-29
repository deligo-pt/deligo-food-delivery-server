export const agreementMessages = {
  AGREEMENT_ALREADY_EXISTS: {
    en: 'An active commercial agreement has already been initialized for this email address.',
    pt: 'Um contrato comercial ativo já foi inicializado para este endereço de e-mail.',
  },
  CREATE_FAILED: {
    en: 'Failed to create the commercial agreement record.',
    pt: 'Falha ao criar o registro do contrato comercial.',
  },
  VERIFICATION_CODE_SENT: {
    en: 'Verification code sent successfully.',
    pt: 'Código de verificação enviado com sucesso.',
  },
  CREDENTIALS_REQUIRED: {
    en: 'Agreement email address and verification OTP are required.',
    pt: 'O endereço de e-mail do contrato e o OTP de verificação são obrigatórios.',
  },
  AGREEMENT_NOT_FOUND: {
    en: 'Commercial agreement record not found.',
    pt: 'Registro de contrato comercial não encontrado.',
  },
  ACTION_UNAUTHORIZED: {
    en: 'You do not have permission to perform operations on this agreement.',
    pt: 'Você não tem permissão para realizar operações neste contrato.',
  },
  EMAIL_ALREADY_VERIFIED: {
    en: 'This email address has already been verified.',
    pt: 'Este endereço de e-mail já foi verificado.',
  },
  INVALID_OR_EXPIRED_OTP: {
    en: 'The provided verification code is invalid or has expired.',
    pt: 'O código de verificação fornecido é inválido ou expirou.',
  },
  VERIFY_AND_GENERATE_SUCCESS: {
    en: 'Email verified and agreement generated successfully.',
    pt: 'E-mail verificado e contrato gerado com sucesso.',
  },
  EMAIL_REQUIRED: {
    en: 'Agreement email address is required.',
    pt: 'O endereço de e-mail do contrato é obrigatório.',
  },
  OTP_RESEND_SUCCESS: {
    en: 'Verification code resent successfully. Please check your inbox.',
    pt: 'Código de verificação reenviado com sucesso. Por favor, verifique sua caixa de entrada.',
  },
  NOT_READY_FOR_SIGNING: {
    en: 'The agreement status is not eligible for signing.',
    pt: 'O status do contrato não está elegível para assinatura.',
  },
  EMAIL_VERIFICATION_REQUIRED: {
    en: 'Please complete email verification before signing the document.',
    pt: 'Por favor, conclua a verificação de e-mail antes de assinar o documento.',
  },
  SIGN_SUCCESS: {
    en: 'Agreement signed and dispatched successfully.',
    pt: 'Contrato assinado e enviado com sucesso.',
  },
  FETCH_SINGLE_SUCCESS: {
    en: 'Agreement retrieved successfully.',
    pt: 'Contrato recuperado com sucesso.',
  },
  FETCH_ALL_SUCCESS: {
    en: 'Agreements retrieved successfully.',
    pt: 'Contratos recuperados com sucesso.',
  },
  INVALID_SIGNATURE_FORMAT: {
    en: 'The provided signature image format is invalid.',
    pt: 'O formato da imagem de assinatura fornecido é inválido.',
  },
} as const;
