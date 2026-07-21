export const globalCommonMessages = {
  // --- DEFAULT SERVER ERRORS ---
  SOMETHING_WENT_WRONG: {
    en: 'Something went wrong on our end. Please try again shortly.',
    pt: 'Algo deu errado por aqui. Por favor, tente novamente em breve.',
  },
  UNKNOWN_SERVER_ERROR: {
    en: 'We encountered an unexpected error. Please refresh and try again.',
    pt: 'Encontramos um erro inesperado. Por favor, atualize e tente novamente.',
  },

  // --- MULTER FILE UPLOAD ERRORS ---
  FILE_TOO_LARGE: {
    en: 'The file is too large. Maximum allowed size is 5MB.',
    pt: 'O arquivo é muito grande. O tamanho máximo permitido é de 5MB.',
  },
  FILE_COUNT_EXCEEDED: {
    en: 'You can only upload up to 5 files at a time.',
    pt: 'Você só pode enviar até 5 arquivos por vez.',
  },
  UNEXPECTED_FILE_FIELD: {
    en: 'Invalid file upload request. Please check your attachment and try again.',
    pt: 'Solicitação de upload inválida. Verifique o anexo e tente novamente.',
  },

  DATA_LOAD_SUCCESS: {
    en: (vars?: { entity?: string; isPlural?: boolean }) => {
      if (!vars?.entity) return 'Data loaded successfully.';
      return vars.isPlural
        ? `${vars.entity} list loaded successfully.`
        : `${vars.entity} details loaded successfully.`;
    },
    pt: (vars?: { entity?: string; isPlural?: boolean }) => {
      if (!vars?.entity) return 'Dados carregados com sucesso.';
      return vars.isPlural
        ? `Lista de ${vars.entity.toLowerCase()} carregada com sucesso.`
        : `Detalhes do ${vars.entity.toLowerCase()} carregados com sucesso.`;
    },
  },

  NOT_FOUND_MESSAGE: {
    en: (vars?: {
      entity?: string;
      isPlural?: boolean;
      isOneOrMore?: boolean;
    }) => {
      if (!vars?.entity) return 'The requested resource could not be found.';
      if (vars.isOneOrMore)
        return `One or more assigned ${vars.entity.toLowerCase()} could not be found.`;

      return vars.isPlural
        ? `No ${vars.entity} were found.`
        : `${vars.entity} could not be found.`;
    },
    pt: (vars?: {
      entity?: string;
      isPlural?: boolean;
      isOneOrMore?: boolean;
    }) => {
      if (!vars?.entity) return 'O recurso solicitado não pôde ser encontrado.';
      if (vars.isOneOrMore)
        return `Um ou mais ${vars.entity.toLowerCase()} atribuídos não foram encontrados.`;

      return vars.isPlural
        ? `Nenhum ${vars.entity.toLowerCase()} foi encontrado.`
        : `${vars.entity} não pôde ser encontrado.`;
    },
  },

  // --- BULKGATE / OTP ERRORS ---
  BULKGATE_CONFIGURATION_MISSING: {
    en: 'SMS service is temporarily unavailable. Please try another method.',
    pt: 'O serviço de SMS está temporariamente indisponível. Tente outro método.',
  },
  BULKGATE_VERIFY_OTP_FAILED: {
    en: (vars: { message: string }) =>
      vars.message || 'Verification failed. Please double-check your code.',
    pt: (vars: { message: string }) =>
      vars.message ||
      'Falha na verificação. Por favor, verifique o seu código.',
  },
  BULKGATE_OTP_SEND_FAILED: {
    en: (vars: { error: string }) =>
      vars.error
        ? `Failed to send code: ${vars.error}`
        : "We couldn't send the code. Please try again.",
    pt: (vars: { error: string }) =>
      vars.error
        ? `Falha ao enviar o código: ${vars.error}`
        : 'Não conseguimos enviar o código. Tente novamente.',
  },
  INVALID_OTP_REQUEST_ID: {
    en: 'Session expired. Please request a new verification code.',
    pt: 'Sessão expirada. Por favor, solicite um novo código de verificação.',
  },
  BULKGATE_RESEND_OTP_FAILED: {
    en: (vars: { message: string }) =>
      vars.message ||
      'Could not resend the code right now. Please wait a moment.',
    pt: (vars: { message: string }) =>
      vars.message ||
      'Não foi possível reenviar o código agora. Aguarde um momento.',
  },

  // --- ACCOUNT & AUTH ---
  USER_ID_MUST_BE_PROVIDED: {
    en: 'Account identification is missing. Please log in again.',
    pt: 'Identificação da conta ausente. Por favor, faça login novamente.',
  },
  EMAIL_MUST_BE_PROVIDED: {
    en: 'Please enter your email address to proceed.',
    pt: 'Por favor, insira seu endereço de e-mail para continuar.',
  },
  UNAUTHORIZED_ROLE: {
    en: (vars: { role: string }) =>
      `Your account type (${vars.role}) does not have permission to access this feature.`,
    pt: (vars: { role: string }) =>
      `Seu tipo de conta (${vars.role}) não tem permissão para acessar este recurso.`,
  },
  NO_USER_FOUND_WITH_ID: {
    en: (vars: { userId: string }) =>
      `No account found with ID: ${vars.userId}. Please check your details.`,
    pt: (vars: { userId: string }) =>
      `Nenhuma conta encontrada com o ID: ${vars.userId}. Verifique seus dados.`,
  },
  NO_USER_FOUND_WITH_EMAIL: {
    en: (vars: { email: string }) =>
      `No account found with email: ${vars.email}.`,
    pt: (vars: { email: string }) =>
      `Nenhuma conta encontrada com o e-mail: ${vars.email}.`,
  },

  // --- EMAIL & FILE SYSTEM ---
  FAILED_TO_SEND_EMAIL: {
    en: "We couldn't send the email. Please try again in a few moments.",
    pt: 'Não conseguimos enviar o e-mail. Tente novamente em alguns instantes.',
  },
  EMAIL_CONTENT_GENERATION_FAILED: {
    en: (vars: { message: string }) =>
      vars.message || 'Failed to prepare email. Please try again.',
    pt: (vars: { message: string }) =>
      vars.message || 'Falha ao preparar o e-mail. Tente novamente.',
  },
  FILE_NOT_FOUND_AT_PATH: {
    en: (vars: { localFilePath: string }) =>
      `Requested file could not be found. (Path: ${vars.localFilePath})`,
    pt: (vars: { localFilePath: string }) =>
      `O arquivo solicitado não pôde ser encontrado. (Caminho: ${vars.localFilePath})`,
  },
  EMPTY_FILE_CANNOT_BE_UPLOADED_TO_CLOUDINARY: {
    en: 'The selected file is empty. Please select a valid file.',
    pt: 'O arquivo selecionado está vazio. Por favor, selecione um arquivo válido.',
  },
  FILE_UPLOAD_FAILED: {
    en: (vars: { message: string }) =>
      vars.message || 'Upload failed. Please try again.',
    pt: (vars: { message: string }) =>
      vars.message || 'Falha no upload. Por favor, tente novamente.',
  },

  // --- THIRD PARTY & SECURITY ---
  GOOGLE_API_ERROR: {
    en: (vars: { status: string }) =>
      `Google service error (${vars.status}). Please try again.`,
    pt: (vars: { status: string }) =>
      `Erro no serviço do Google (${vars.status}). Tente novamente.`,
  },
  RATE_LIMIT_EXCEEDED: {
    en: (vars: { messagePrefix: string; secondsLeft: number }) =>
      `${vars.messagePrefix || 'Too many requests!'} Please try again after ${vars.secondsLeft} seconds.`,
    pt: (vars: { messagePrefix: string; secondsLeft: number }) =>
      `${vars.messagePrefix || 'Muitas solicitações!'} Tente novamente após ${vars.secondsLeft} segundos.`,
  },
  INVALID_JSON_DATA: {
    en: 'Incomplete or invalid request data.',
    pt: 'Dados de solicitação incompletos ou inválidos.',
  },
  PROVIDE_REQUIRED_DATA_OR_IMAGE_FORM_DATA: {
    en: 'Please complete all required fields and upload the image.',
    pt: 'Por favor, preencha todos os campos obrigatórios e envie a imagem.',
  },

  // --- REUSABLE GENERIC TEMPLATES (COMPAT MODE) ---
  COMMON_NOT_FOUND: {
    en: (vars: { entity: string }) => `${vars.entity} could not be found.`,
    pt: (vars: { entity: string }) => `${vars.entity} nao pode ser encontrado.`,
  },
  COMMON_ACTION_SUCCESS: {
    en: (vars: { entity: string; action: string }) =>
      `${vars.entity} ${vars.action} successfully.`,
    pt: (vars: { entity: string; action: string }) =>
      `${vars.entity} ${vars.action.toLowerCase()} com sucesso.`,
  },
  COMMON_RETRIEVED_SUCCESS: {
    en: (vars: { entity: string }) => `${vars.entity} loaded successfully.`,
    pt: (vars: { entity: string }) => `${vars.entity} carregado com sucesso.`,
  },
  COMMON_LIST_RETRIEVED_SUCCESS: {
    en: (vars: { entityPlural: string }) =>
      `${vars.entityPlural} loaded successfully.`,
    pt: (vars: { entityPlural: string }) =>
      `${vars.entityPlural} carregados com sucesso.`,
  },
  COMMON_ACCESS_DENIED: {
    en: (vars: { reason?: string }) =>
      vars.reason ? `Access denied. ${vars.reason}` : 'Access denied.',
    pt: (vars: { reason?: string }) =>
      vars.reason ? `Acesso negado. ${vars.reason}` : 'Acesso negado.',
  },
  COMMON_UNAUTHORIZED_ACTION: {
    en: (vars: { action: string }) =>
      `You do not have permission to ${vars.action}.`,
    pt: (vars: { action: string }) =>
      `Voce nao tem permissao para ${vars.action}.`,
  },
  COMMON_CREATED_SUCCESS: {
    en: (vars: { entity: string }) => `${vars.entity} created successfully.`,
    pt: (vars: { entity: string }) => `${vars.entity} criado com sucesso.`,
  },
  COMMON_UPDATED_SUCCESS: {
    en: (vars: { entity: string }) => `${vars.entity} updated successfully.`,
    pt: (vars: { entity: string }) => `${vars.entity} atualizado com sucesso.`,
  },
  COMMON_SOFT_DELETED_SUCCESS: {
    en: (vars: { entity: string }) => `${vars.entity} removed successfully.`,
    pt: (vars: { entity: string }) => `${vars.entity} removido com sucesso.`,
  },
  COMMON_PERMANENTLY_DELETED_SUCCESS: {
    en: (vars: { entity: string }) =>
      `${vars.entity} permanently deleted from the system.`,
    pt: (vars: { entity: string }) =>
      `${vars.entity} excluido permanentemente do sistema.`,
  },
  COMMON_MUST_SOFT_DELETE_FIRST: {
    en: (vars: { entity?: string }) =>
      vars.entity
        ? `${vars.entity} must be deactivated before permanent deletion.`
        : 'This item must be deactivated before permanent deletion.',
    pt: (vars: { entity?: string }) =>
      vars.entity
        ? `${vars.entity} deve ser desativado antes da exclusao permanente.`
        : 'Este item deve ser desativado antes da exclusao permanente.',
  },
  COMMON_OPERATION_FAILED: {
    en: (vars: { operation: string; reason?: string }) =>
      vars.reason
        ? `Failed to ${vars.operation}: ${vars.reason}`
        : `Failed to ${vars.operation}.`,
    pt: (vars: { operation: string; reason?: string }) =>
      vars.reason
        ? `Falha ao ${vars.operation}: ${vars.reason}`
        : `Falha ao ${vars.operation}.`,
  },
  COMMON_NOT_AVAILABLE: {
    en: 'N/A',
    pt: 'N/D',
  },
} as const;
