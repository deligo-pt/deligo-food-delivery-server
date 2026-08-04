export const authMessages = {
  INVALID_REG_PATH: {
    en: 'The registration link or path is invalid. Please check and try again.',
    pt: 'O link ou caminho de registro é inválido. Verifique e tente novamente.',
  },
  EMAIL_ALREADY_REGISTERED: {
    en: (vars: { role: string; targetRole: string }) =>
      `This email is already linked to an active ${vars.role} account. You cannot sign up as a ${vars.targetRole}.`,
    pt: (vars: { role: string; targetRole: string }) =>
      `Este e-mail já está vinculado a uma conta de ${vars.role} ativa. Você não pode se registrar como ${vars.targetRole}.`,
  },
  EMAIL_ALREADY_VERIFIED: {
    en: (vars: { formattedEmail: string; role: string }) =>
      `The email ${vars.formattedEmail} is already registered and verified as a ${vars.role}.`,
    pt: (vars: { formattedEmail: string; role: string }) =>
      `O e-mail ${vars.formattedEmail} já está registrado e verificado como ${vars.role}.`,
  },
  EMAIL_CONFLICT_ROLE: {
    en: 'An account with this email already exists for this role. Please use a different email.',
    pt: 'Uma conta con este e-mail já existe para este cargo. Por favor, use outro e-mail.',
  },
  REGISTRATION_SUCCESS: {
    en: 'Registration successful! We have sent a verification OTP to your email.',
    pt: 'Registro concluído com sucesso! Enviamos um OTP de verificação para o seu e-mail.',
  },
  INVALID_ONBOARDING_ROLE: {
    en: 'The selected onboarding role is invalid.',
    pt: 'O cargo de integração selecionado é inválido.',
  },
  ONBOARD_UNAPPROVED_USER: {
    en: (vars: { status: string }) =>
      `Your account is currently ${vars.status}. Only fully approved accounts can onboard others.`,
    pt: (vars: { status: string }) =>
      `Sua conta está atualmente ${vars.status}. Apenas contas totalmente aprovadas podem integrar outras.`,
  },
  ONBOARD_PERMISSION_DENIED: {
    en: (vars: { role: string }) =>
      `You do not have the required permissions to onboard a ${vars.role}.`,
    pt: (vars: { role: string }) =>
      `Você não possui as permissões necessárias para integrar um ${vars.role}.`,
  },
  EMAIL_ALREADY_REGISTERED_ONBOARD: {
    en: (vars: { role: string; currentOnboardingRole: string }) =>
      `This email is already active as a ${vars.role} and cannot be onboarded as a ${vars.currentOnboardingRole}.`,
    pt: (vars: { role: string; currentOnboardingRole: string }) =>
      `Este e-mail já está ativo como ${vars.role} e não pode ser integrado como ${vars.currentOnboardingRole}.`,
  },
  EMAIL_CONFLICT_ONBOARD_ID: {
    en: 'This email or User ID is already taken for this role. Please try another.',
    pt: 'Este e-mail ou ID de usuário já está em uso para este cargo. Por favor, tente outro.',
  },
  ONBOARD_SUCCESS: {
    en: (vars: { role: string; email: string }) =>
      `${vars.role} onboarded successfully. A verification email has been sent to ${vars.email}.`,
    pt: (vars: { role: string; email: string }) =>
      `${vars.role} integrado com sucesso. Um e-mail de verificação foi enviado para ${vars.email}.`,
  },
  CREDENTIAL_REQUIRED: {
    en: 'Please provide your email or phone number to receive the verification OTP.',
    pt: 'Por favor, insira seu e-mail ou número de telefone para receber o OTP de verificação.',
  },
  USER_NOT_FOUND_REGISTER: {
    en: "We couldn't find an account with these details. Please sign up first.",
    pt: 'Não encontramos uma conta com esses dados. Por favor, cadastre-se primeiro.',
  },
  LIMIT_EXCEEDED: {
    en: 'Login limit exceeded. Please wait a moment and log in again.',
    pt: 'Limite de login excedido. Por favor, aguarde um momento e faça login novamente.',
  },
  INVALID_OTP: {
    en: 'The code you entered is incorrect. Please try again.',
    pt: 'O código inserido está incorreto. Por favor, tente novamente.',
  },
  INVALID_OR_EXPIRED_OTP: {
    en: 'The verification code is invalid or has expired. Please request a new one.',
    pt: 'O código de verificação é inválido ou expirou. Por favor, solicite um novo.',
  },
  VERIFY_EMAIL_SUCCESS: {
    en: (vars: { role: string }) =>
      `Email verified successfully! Your ${vars.role} account is ready.`,
    pt: (vars: { role: string }) =>
      `E-mail verificado com sucesso! Sua conta de ${vars.role} está pronta.`,
  },
  VERIFY_CONTACT_SUCCESS: {
    en: 'Your contact number has been successfully verified.',
    pt: 'Seu número de contato foi verificado com sucesso.',
  },
  RESEND_OTP_CREDENTIAL_REQUIRED: {
    en: 'Email or phone number is required to resend the verification code.',
    pt: 'É necessário informar o e-mail ou número de contato para reenviar o OTP.',
  },
  USER_NOT_FOUND_CONTACT: {
    en: 'No account found with this phone number. Please register first.',
    pt: 'Nenhuma conta encontrada com este número. Por favor, cadastre-se primeiro.',
  },
  NO_ACTIVE_OTP_SESSION: {
    en: 'Verification session expired. Please request a new code.',
    pt: 'Sessão de verificação expirada. Por favor, solicite um novo código.',
  },
  RESEND_OTP_MOBILE_SUCCESS: {
    en: 'A new code has been sent via SMS. Please check your phone.',
    pt: 'Um novo código foi enviado por SMS. Verifique seu telefone.',
  },
  USER_NOT_FOUND_EMAIL: {
    en: 'No account found with this email address. Please register first.',
    pt: 'Nenhuma conta encontrada com este endereço de e-mail. Cadastre-se primeiro.',
  },
  EMAIL_ALREADY_VERIFIED_LOGIN: {
    en: 'Your email is already verified. You can proceed to log in.',
    pt: 'Seu e-mail já está verificado. Você pode prosseguir para o login.',
  },
  RESEND_OTP_EMAIL_SUCCESS: {
    en: 'A new verification code has been sent. Please check your inbox or spam folder.',
    pt: 'Um novo código de verificação foi enviado. Verifique sua caixa de entrada ou spam.',
  },
  USER_NOT_FOUND: {
    en: 'Account not found.',
    pt: 'Conta não encontrada.',
  },
  ACCOUNT_DELETED: {
    en: 'This account has been deleted. Please contact support for assistance.',
    pt: 'Esta conta foi excluída. Entre em contato com o suporte para obter assistência.',
  },
  USER_BLOCKED: {
    en: 'Your account is temporarily restricted. Please contact support.',
    pt: 'Sua conta está temporariamente restrita. Entre em contato com o suporte.',
  },
  USER_NOT_VERIFIED: {
    en: 'Your account is not verified yet. Please complete email verification.',
    pt: 'Sua conta ainda não foi verificada. Por favor, conclua a verificação de e-mail.',
  },
  AUTHENTICATION_REQUIRED: {
    en: 'Session expired or authentication required. Please log in.',
    pt: 'Sessão expirada ou autenticação necessária. Por favor, faça login.',
  },
  ACCOUNT_BLOCKED: {
    en: 'Your account is blocked. Please reach out to support for help.',
    pt: 'Sua conta está bloqueada. Entre em contato com o suporte para obter ajuda.',
  },
  DEVICE_LOGGED_OUT: {
    en: 'You have been logged out from this device. Please log in again.',
    pt: 'Você foi desconectado deste dispositivo. Por favor, faça login novamente.',
  },
  PASSWORD_RECENTLY_CHANGED: {
    en: 'Your password was recently changed. Please log in again with your new credentials.',
    pt: 'Sua senha foi alterada recentemente. Faça login novamente com suas novas credenciais.',
  },
  ADMIN_ACTION_PERMISSION_DENIED: {
    en: 'Action denied. Your Admin account does not have the specific permission required.',
    pt: 'Ação negado. Sua conta de Administrador não possui a permissão específica necessária.',
  },
  PASSWORD_MISSING: {
    en: 'Please enter your password.',
    pt: 'Por favor, insira sua senha.',
  },
  PASSWORD_NOT_MATCHED: {
    en: 'Incorrect password. Please try again.',
    pt: 'Senha incorreta. Por favor, tente novamente.',
  },
  SOCKET_NOT_INITIALIZED: {
    en: 'Connection issue. Please refresh the app.',
    pt: 'Problema de conexão. Por favor, atualize o aplicativo.',
  },
  LOGIN_SUCCESS: {
    en: 'Welcome back! Logged in successfully.',
    pt: 'Bem-vindo de volta! Login realizado com sucesso.',
  },
  LOGIN_CREDENTIAL_REQUIRED: {
    en: 'Email or phone number is required to log in.',
    pt: 'E-mail ou número de telefone é obrigatório para fazer o login.',
  },
  ALREADY_REFERRED: {
    en: 'A referral code has already been applied to this account.',
    pt: 'Um código de indicação já foi aplicado a esta conta.',
  },
  OTP_SENT_EMAIL: {
    en: 'A login code has been sent to your email. Please verify to continue.',
    pt: 'Um código de login foi enviado para o seu e-mail. Verifique para continuar.',
  },
  OTP_SENT_MOBILE: {
    en: 'A login code has been sent to your mobile number. Please verify to continue.',
    pt: 'Um código de login foi enviado para o seu celular. Verifique para continuar.',
  },
  FCM_REQUIRED: {
    en: 'Notification setup incomplete. Missing device credentials.',
    pt: 'Configuração de notificação incompleta. Credenciais do dispositivo ausentes.',
  },
  DEVICE_NOT_REGISTERED: {
    en: 'This device is not registered to your account.',
    pt: 'Este dispositivo não está registrado na sua conta.',
  },
  FCM_SYNC_SUCCESS: {
    en: 'Notification settings synchronized successfully.',
    pt: 'Configurações de notificação sincronizadas com sucesso.',
  },
  DEVICE_SESSION_NOT_FOUND: {
    en: 'Device session not found. Please sign in again.',
    pt: 'Sessão do dispositivo não encontrada. Por favor, faça login novamente.',
  },
  USER_LOGOUT_SUCCESS: {
    en: 'Logged out successfully.',
    pt: 'Desconectado com sucesso.',
  },
  CUSTOMER_PASSWORD_CHANGE_DENIED: {
    en: 'Password modifications are not required for this account type.',
    pt: 'Alterações de senha não são necessárias para este tipo de conta.',
  },
  USER_STATUS_RESTRICTED: {
    en: (vars: { status: string }) =>
      `Access denied. Your account is currently ${vars.status}.`,
    pt: (vars: { status: string }) =>
      `Acesso negado. Sua conta está atualmente ${vars.status}.`,
  },
  OLD_PASSWORD_NOT_MATCHED: {
    en: 'The current password you entered is incorrect.',
    pt: 'A senha atual inserida está incorreta.',
  },
  CUSTOMER_PASSWORD_RESET_DENIED: {
    en: 'Secure login via OTP is active. Password reset is not required.',
    pt: 'O login seguro via OTP está ativo. A redefinição de senha não é necessária.',
  },
  USER_NOT_FOUND_FOR_RESET: {
    en: 'Account not found. Cannot proceed with password reset.',
    pt: 'Conta não encontrada. Não é possível prosseguir com a redefinição de senha.',
  },
  VERIFY_EMAIL_REQUIRED: {
    en: 'Please verify your email address to unlock this feature.',
    pt: 'Por favor, verifique seu endereço de e-mail para desbloquear este recurso.',
  },
  PASSWORD_RESET_LINK_SUCCESS: {
    en: 'A password reset link has been successfully sent to your email.',
    pt: 'Um link de redefinição de senha foi enviado com sucesso para o seu e-mail.',
  },
  TOKEN_INVALID_OR_EXPIRED: {
    en: 'The reset link is invalid or has expired. Please request a new one.',
    pt: 'O link de redefinição é inválido ou expirou. Por favor, solicite um novo.',
  },
  TOKEN_MISMATCH: {
    en: 'Security token verification failed. Please try again.',
    pt: 'Falha na verificação do token de segurança. Por favor, tente novamente.',
  },
  ACCOUNT_MODIFICATION_RESTRICTED: {
    en: (vars: { status: string }) =>
      `This account is currently ${vars.status} and cannot be modified at this time.`,
    pt: (vars: { status: string }) =>
      `Esta conta está atualmente ${vars.status} e não pode ser modificada neste momento.`,
  },
  PASSWORD_RESET_SUCCESS: {
    en: 'Password reset successfully! All other active sessions have been securely closed.',
    pt: 'Senha redefinida com sucesso! Todas as outras sessões ativas foram encerradas com segurança.',
  },
  SESSION_EXPIRED: {
    en: 'Your session has expired. Please log in again.',
    pt: 'Sua sessão expirou. Por favor, faça login novamente.',
  },
  TOKEN_REUSE_DETECTED: {
    en: 'Suspicious activity detected on this session. Please log in again.',
    pt: 'Atividade suspeita detectada nesta sessão. Por favor, faça login novamente.',
  },
  NOT_AUTHORIZED: {
    en: 'You are not authorized to perform this action.',
    pt: 'Você não está autorizado a realizar esta ação.',
  },
  ALREADY_SUBMITTED_APPROVAL: {
    en: 'Your approval request is already under review. Please wait for confirmation.',
    pt: 'Sua solicitação de aprovação já está em análise. Por favor, aguarde a confirmação.',
  },
  ALREADY_APPROVED: {
    en: 'Your account has already been approved.',
    pt: 'Sua conta já foi aprovada.',
  },
  INVALID_ROLE_MAPPING: {
    en: 'Account configuration issue. Invalid role assignment.',
    pt: 'Problema de configuração da conta. Atribuição de cargo inválida.',
  },
  DELIVERY_PARTNER_FLEET_ASSIGNMENT_REQUIRED: {
    en: 'Before approval, this delivery partner must be assigned under a fleet manager.',
    pt: 'Antes da aprovação, este parceiro de entrega deve ser atribuído a um gestor de frota.',
  },
  SUBMIT_APPROVAL_OWN_PROFILE_ONLY: {
    en: 'You can only submit verification requests for your own profile.',
    pt: 'Você só pode enviar solicitações de verificação para o seu próprio perfil.',
  },
  SUBMIT_APPROVAL_PERMISSION_DENIED: {
    en: 'Permission denied. You cannot initiate this review request.',
    pt: 'Permissão negada. Você não pode iniciar esta solicitação de análise.',
  },
  APPROVAL_TRANSACTION_FAILED: {
    en: "We couldn't submit your approval request. Please try again.",
    pt: 'Não foi possível enviar sua solicitação de aprovação. Tente novamente.',
  },
  SUBMIT_APPROVAL_SUCCESS: {
    en: (vars: { role: string }) =>
      `${vars.role} application submitted for review successfully.`,
    pt: (vars: { role: string }) =>
      `A solicitação de ${vars.role} foi enviada para análise com sucesso.`,
  },
  CANNOT_CHANGE_OWN_STATUS: {
    en: 'You cannot change your own account status.',
    pt: 'Você não pode alterar o status da sua própria conta.',
  },
  ADMIN_NOT_FOUND_OR_UNAUTHORIZED: {
    en: 'Administrative authorization failed or account not found.',
    pt: 'Falha na autorização administrativa ou conta não encontrada.',
  },
  USER_ALREADY_IN_STATUS: {
    en: (vars: { status: string }) =>
      `This account is already marked as ${vars.status}.`,
    pt: (vars: { status: string }) =>
      `Esta conta já está marcada como ${vars.status}.`,
  },
  REMARKS_REQUIRED: {
    en: (vars: { status: string }) =>
      `Please provide notes/remarks for updating status to ${vars.status}.`,
    pt: (vars: { status: string }) =>
      `Por favor, forneça justificativas para atualizar o status para ${vars.status}.`,
  },
  STATUS_UPDATE_TRANSACTION_FAILED: {
    en: 'Could not update status due to a database sync error. Please try again.',
    pt: 'Não foi possível atualizar o status devido a um erro de sincronização. Tente novamente.',
  },
  STATUS_UPDATE_SUCCESS: {
    en: (vars: { role: string; status: string }) =>
      `The ${vars.role} account has been successfully set to ${vars.status}.`,
    pt: (vars: { role: string; status: string }) =>
      `A conta de ${vars.role} foi definida como ${vars.status} com sucesso.`,
  },
  DELETE_UNAPPROVED_DENIED: {
    en: (vars: { status: string }) =>
      `Action restricted. Your current account status is ${vars.status}.`,
    pt: (vars: { status: string }) =>
      `Ação restrita. O status atual da sua conta é ${vars.status}.`,
  },
  USER_NOT_FOUND_OR_DELETED: {
    en: 'Account not found or has already been deleted.',
    pt: 'Conta não encontrada ou já excluída.',
  },
  CANNOT_DELETE_SUPER_ADMIN: {
    en: 'Security restriction: Super Admin accounts cannot be deleted.',
    pt: 'Restrição de segurança: Contas de Super Admin não podem ser excluídas.',
  },
  DELETE_PERMISSION_DENIED: {
    en: 'You do not have the required permissions to delete this account.',
    pt: 'Você não possui as permissões necessárias para excluir esta conta.',
  },
  DELETE_FLEET_PARTNER_DENIED: {
    en: 'You can only remove delivery partners registered under your own fleet management.',
    pt: 'Você só pode remover parceiros de entrega registrados sob a gestão da sua própria frota.',
  },
  SOFT_DELETE_TRANSACTION_FAILED: {
    en: 'Could not delete account due to a system error. Please try again.',
    pt: 'Não foi possível excluir a conta devido a um erro do sistema. Tente novamente.',
  },
  SOFT_DELETE_SUCCESS: {
    en: (vars: { role: string }) =>
      `The ${vars.role} account and associated profiles have been successfully removed.`,
    pt: (vars: { role: string }) =>
      `A conta de ${vars.role} e os perfis associados foram removidos com sucesso.`,
  },
  PERMANENT_DELETE_UNAPPROVED_DENIED: {
    en: (vars: { status: string }) =>
      `Action restricted. Permanent deletion is not allowed while your status is ${vars.status}.`,
    pt: (vars: { status: string }) =>
      `Ação restrita. A exclusão permanente não é permitida enquanto seu status for ${vars.status}.`,
  },
  PERMANENT_DELETE_NOT_FOUND: {
    en: 'Account not found or has already been permanently removed.',
    pt: 'Conta não encontrada ou já removida permanentemente.',
  },
  MUST_BE_SOFT_DELETED_FIRST: {
    en: 'Account must be deactivated/soft-deleted before it can be permanently removed.',
    pt: 'A conta deve ser desativada antes de poder ser removida permanentemente.',
  },
  PERMANENT_DELETE_SUCCESS: {
    en: (vars: { role: string }) =>
      `The ${vars.role} account and all associated profile history have been permanently purged from the system.`,
    pt: (vars: { role: string }) =>
      `A conta de ${vars.role} e todo o histórico do perfil associado foram eliminados permanentemente do sistema.`,
  },
  REFRESH_TOKEN_SUCCESS: {
    en: 'Access session renewed successfully.',
    pt: 'Sessão de acesso renovada com sucesso.',
  },
  SUPER_ADMIN_PASSWORD_RESET_DENIED: {
    en: 'Super Admin accounts password cannot be reset.',
    pt: 'As senhas das contas de Super Admin não podem ser redefinidas.',
  },
} as const;
