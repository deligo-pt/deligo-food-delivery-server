export const authMessages = {
  INVALID_REG_PATH: {
    en: 'Invalid registration path',
    pt: 'Caminho de registro inválido',
  },
  EMAIL_ALREADY_REGISTERED: {
    en: (vars: { role: string; targetRole: string }) =>
      `This email is already registered as an active ${vars.role}. You cannot register as a ${vars.targetRole}.`,
    pt: (vars: { role: string; targetRole: string }) =>
      `Este e-mail já está registrado como um ${vars.role} ativo. Você não pode se registrar como um ${vars.targetRole}.`,
  },
  EMAIL_ALREADY_VERIFIED: {
    en: (vars: { formattedEmail: string; role: string }) =>
      `${vars.formattedEmail} is already registered and verified as ${vars.role}.`,
    pt: (vars: { formattedEmail: string; role: string }) =>
      `${vars.formattedEmail} já está registrado e verificado como ${vars.role}.`,
  },
  EMAIL_CONFLICT_ROLE: {
    en: 'The email already exists for this role. Please use another email.',
    pt: 'O e-mail já existe para este cargo. Por favor, use outro e-mail.',
  },
  REGISTRATION_SUCCESS: {
    en: (vars: { role: string }) =>
      `${vars.role} registered successfully. Check your email for OTP.`,
    pt: (vars: { role: string }) =>
      `${vars.role} registrado com sucesso. Verifique seu e-mail para obter o OTP.`,
  },
  INVALID_ONBOARDING_ROLE: {
    en: 'Invalid onboarding target role',
    pt: 'Cargo de destino de integração inválido',
  },
  ONBOARD_UNAPPROVED_USER: {
    en: (vars: { status: string }) =>
      `Your account is ${vars.status}. Only approved users can onboard others.`,
    pt: (vars: { status: string }) =>
      `Sua conta está ${vars.status}. Apenas usuários aprovados podem integrar outros.`,
  },
  ONBOARD_PERMISSION_DENIED: {
    en: (vars: { role: string }) =>
      `You do not have permission to onboard a ${vars.role}`,
    pt: (vars: { role: string }) =>
      `Você não tem permissão para integrar um ${vars.role}`,
  },
  EMAIL_ALREADY_REGISTERED_ONBOARD: {
    en: (vars: { role: string; currentOnboardingRole: string }) =>
      `This email is already registered as an active ${vars.role}. You cannot onboard them as a ${vars.currentOnboardingRole}.`,
    pt: (vars: { role: string; currentOnboardingRole: string }) =>
      `Este e-mail já está registrado como um ${vars.role} ativo. Você não pode integrá-lo como um ${vars.currentOnboardingRole}.`,
  },
  EMAIL_CONFLICT_ONBOARD_ID: {
    en: 'The email or user ID already exists for this role. Please use another email.',
    pt: 'O e-mail ou ID de usuário já existe para este cargo. Por favor, use outro e-mail.',
  },
  ONBOARD_SUCCESS: {
    en: (vars: { role: string; email: string }) =>
      `${vars.role} onboarded successfully. Verification email sent to ${vars.email}`,
    pt: (vars: { role: string; email: string }) =>
      `${vars.role} integrado com sucesso. E-mail de verificação enviado para ${vars.email}`,
  },
  CREDENTIAL_REQUIRED: {
    en: 'Email or contact number is required for OTP verification',
    pt: 'E-mail ou número de contato é obrigatório para verificação de OTP',
  },
  USER_NOT_FOUND_REGISTER: {
    en: 'User not found. Please register.',
    pt: 'Usuário não encontrado. Por favor, registre-se.',
  },
  LIMIT_EXCEEDED: {
    en: 'LIMIT_EXCEEDED',
    pt: 'LIMIT_EXCEEDED',
  },
  INVALID_OTP: {
    en: 'Invalid OTP',
    pt: 'OTP inválido',
  },
  INVALID_OR_EXPIRED_OTP: {
    en: 'Invalid or expired OTP',
    pt: 'OTP inválido ou expirado',
  },
  VERIFY_EMAIL_SUCCESS: {
    en: (vars: { role: string }) => `${vars.role} email verified successfully`,
    pt: (vars: { role: string }) =>
      `E-mail de ${vars.role} verificado com sucesso`,
  },
  VERIFY_CONTACT_SUCCESS: {
    en: 'Customer contact number verified successfully',
    pt: 'Número de contato do cliente verificado com sucesso',
  },
  RESEND_OTP_CREDENTIAL_REQUIRED: {
    en: 'Email or contact number is required to resend OTP',
    pt: 'E-mail ou número de contato é obrigatório para reenviar o OTP',
  },
  USER_NOT_FOUND_CONTACT: {
    en: 'User not found with this contact number. Please register first.',
    pt: 'Usuário não encontrado com este número de contato. Por favor, registre-se primeiro.',
  },
  NO_ACTIVE_OTP_SESSION: {
    en: 'No active OTP session found to resend. Please request a new login.',
    pt: 'Nenhuma sessão de OTP ativa encontrada para reenviar. Por favor, solicite um novo login.',
  },
  RESEND_OTP_MOBILE_SUCCESS: {
    en: 'OTP resent successfully to your mobile number. Please check your SMS.',
    pt: 'OTP reenviado com sucesso para o seu número de celular. Por favor, verifique seu SMS.',
  },
  USER_NOT_FOUND_EMAIL: {
    en: 'User not found with this email address. Please register first.',
    pt: 'Usuário não encontrado com este endereço de e-mail. Por favor, registre-se primeiro.',
  },
  EMAIL_ALREADY_VERIFIED_LOGIN: {
    en: 'Your email is already verified. Please proceed to login.',
    pt: 'Seu e-mail já está verificado. Por favor, prossiga para o login.',
  },
  RESEND_OTP_EMAIL_SUCCESS: {
    en: 'OTP resent successfully. Please check your email inbox or spam folder.',
    pt: 'OTP reenviado com sucesso. Por favor, verifique sua caixa de entrada de e-mail ou pasta de spam.',
  },
  USER_NOT_FOUND: {
    en: 'User not found',
    pt: 'Usuário não encontrado',
  },
  ACCOUNT_DELETED: {
    en: 'Your account is deleted. Please contact support.',
    pt: 'Sua conta foi excluída. Por favor, entre em contato com o suporte.',
  },
  USER_BLOCKED: {
    en: 'This user is blocked!',
    pt: 'Este usuário está bloqueado!',
  },
  USER_NOT_VERIFIED: {
    en: 'This user is not verified. Please verify your email.',
    pt: 'Este usuário não está verificado. Por favor, verifique seu e-mail.',
  },
  PASSWORD_MISSING: {
    en: 'Password  information missing',
    pt: 'Informações de senha ausentes',
  },
  PASSWORD_NOT_MATCHED: {
    en: 'Password did not match',
    pt: 'A senha não confere',
  },
  LOGIN_SUCCESS: {
    en: (vars: { role: string }) => `${vars.role} logged in successfully!`,
    pt: (vars: { role: string }) => `${vars.role} conectado com sucesso!`,
  },
  LOGIN_CREDENTIAL_REQUIRED: {
    en: 'Email or contact number is required',
    pt: 'E-mail ou número de contato é obrigatório',
  },
  ALREADY_REFERRED: {
    en: 'You have already been referred and cannot apply another referral code.',
    pt: 'Você já foi indicado e não pode aplicar outro código de indicação.',
  },
  OTP_SENT_EMAIL: {
    en: 'OTP sent to your email. Please verify to login.',
    pt: 'OTP enviado para o seu e-mail. Por favor, verifique para fazer o login.',
  },
  OTP_SENT_MOBILE: {
    en: 'OTP sent to your mobile number. Please verify to login.',
    pt: 'OTP enviado para o seu número de celular. Por favor, verifique para fazer o login.',
  },
  FCM_REQUIRED: {
    en: 'FCM token and device ID are required',
    pt: 'Token FCM e ID do dispositivo são obrigatórios',
  },
  DEVICE_NOT_REGISTERED: {
    en: 'Device not registered for this user',
    pt: 'Dispositivo não registrado para este usuário',
  },
  FCM_SYNC_SUCCESS: {
    en: 'FCM token synchronized successfully',
    pt: 'Token FCM sincronizado com sucesso',
  },
  DEVICE_SESSION_NOT_FOUND: {
    en: 'This device is not registered for this user. Please log in again.',
    pt: 'Este dispositivo não está registrado para este usuário. Por favor, faça o login novamente.',
  },
  CUSTOMER_LOGOUT_SUCCESS: {
    en: 'Customer logged out and email verification reset',
    pt: 'Cliente desconectado e redefinição de verificação de e-mail realizada',
  },
  USER_LOGOUT_SUCCESS: {
    en: (vars: { role: string }) => `${vars.role} logged out successfully!`,
    pt: (vars: { role: string }) => `${vars.role} desconectado com sucesso!`,
  },
  CUSTOMER_PASSWORD_CHANGE_DENIED: {
    en: 'Customer no need to change password',
    pt: 'O cliente não precisa alterar a senha',
  },
  USER_STATUS_RESTRICTED: {
    en: (vars: { status: string }) => `This user is ${vars.status}!`,
    pt: (vars: { status: string }) => `Este usuário está ${vars.status}!`,
  },
  OLD_PASSWORD_NOT_MATCHED: {
    en: 'Old password does not match',
    pt: 'A senha antiga não confere',
  },
  PASSWORD_UPDATE_SUCCESS: {
    en: 'Password updated successfully!',
    pt: 'Senha atualizada com sucesso!',
  },
  CUSTOMER_PASSWORD_RESET_DENIED: {
    en: 'Customers login via OTP/Contact, password reset is not required.',
    pt: 'Clientes entram via OTP/Contato, a redefinição de senha não é necessária.',
  },
  USER_NOT_FOUND_FOR_RESET: {
    en: 'This user is not found!',
    pt: 'Este usuário não foi encontrado!',
  },
  VERIFY_EMAIL_REQUIRED: {
    en: 'You need to verify your email',
    pt: 'Você precisa verificar seu e-mail',
  },
  PASSWORD_RESET_LINK_SUCCESS: {
    en: 'Password reset link sent to your email address successfully',
    pt: 'Link de redefinição de senha enviado para o seu endereço de e-mail com sucesso',
  },
  TOKEN_INVALID_OR_EXPIRED: {
    en: 'Reset token is invalid or has expired.',
    pt: 'O token de redefinição é inválido ou expirou.',
  },
  TOKEN_MISMATCH: {
    en: 'Token does not match with this user or role.',
    pt: 'O token não corresponde a este usuário ou cargo.',
  },
  ACCOUNT_MODIFICATION_RESTRICTED: {
    en: (vars: { status: string }) =>
      `This user account is currently ${vars.status} and cannot be modified.`,
    pt: (vars: { status: string }) =>
      `Esta conta de usuário está atualmente ${vars.status} e não pode ser modificada.`,
  },
  PASSWORD_RESET_SUCCESS: {
    en: 'Password reset successfully! All other active sessions have been securely terminated.',
    pt: 'Senha redefinida com sucesso! Todas as outras sessões ativas foram encerradas com segurança.',
  },
  SESSION_EXPIRED: {
    en: 'Your session has expired or you have logged out from this device. Please log in again.',
    pt: 'Sua sessão expirou ou você saiu deste dispositivo. Por favor, faça o login novamente.',
  },
  NOT_AUTHORIZED: {
    en: 'You are not authorized!',
    pt: 'Você não está autorizado!',
  },
  ALREADY_SUBMITTED_APPROVAL: {
    en: 'You have already submitted the approval request. Please wait for admin approval.',
    pt: 'Você já enviou a solicitação de aprovação. Por favor, aguarde a aprovação do administrador.',
  },
  ALREADY_APPROVED: {
    en: 'Your account is already approved.',
    pt: 'Sua conta já está aprovada.',
  },
  INVALID_ROLE_MAPPING: {
    en: 'Invalid user role mapping',
    pt: 'Mapeamento de cargo de usuário inválido',
  },
  PROFILE_DETAILS_NOT_FOUND: {
    en: 'User profile details not found',
    pt: 'Detalhes do perfil do usuário não encontrados',
  },
  SUBMIT_APPROVAL_PERMISSION_DENIED_FLEET: {
    en: 'You do not have permission to submit approval requests for this delivery partner.',
    pt: 'Você não tem permissão para enviar solicitações de aprovação para este parceiro de entrega.',
  },
  SUBMIT_APPROVAL_OWN_PROFILE_ONLY: {
    en: 'You can only submit approval requests for your own profile.',
    pt: 'Você só pode enviar solicitações de aprovação para o seu próprio perfil.',
  },
  SUBMIT_APPROVAL_PERMISSION_DENIED: {
    en: 'You do not have permission to initiate this approval request.',
    pt: 'Você não tem permissão para iniciar esta solicitação de aprovação.',
  },
  APPROVAL_TRANSACTION_FAILED: {
    en: 'Failed to lock profile and submit approval request. Please try again.',
    pt: 'Falha ao bloquear o perfil e enviar a solicitação de aprovação. Por favor, tente novamente.',
  },
  SUBMIT_APPROVAL_SUCCESS: {
    en: (vars: { role: string }) =>
      `${vars.role} submitted for approval successfully`,
    pt: (vars: { role: string }) =>
      `${vars.role} enviado para aprovação com sucesso`,
  },
  CANNOT_CHANGE_OWN_STATUS: {
    en: 'You cannot change your own status',
    pt: 'Você não pode alterar seu próprio status',
  },
  ADMIN_NOT_FOUND_OR_UNAUTHORIZED: {
    en: 'Admin not found or unauthorized for this action',
    pt: 'Administrador não encontrado ou não autorizado para esta ação',
  },
  TARGET_USER_NOT_FOUND: {
    en: 'Target user not found',
    pt: 'Usuário de destino não encontrado',
  },
  USER_ALREADY_IN_STATUS: {
    en: (vars: { status: string }) => `User is already ${vars.status}`,
    pt: (vars: { status: string }) => `O usuário já está ${vars.status}`,
  },
  REMARKS_REQUIRED: {
    en: (vars: { status: string }) => `Remarks are required for ${vars.status}`,
    pt: (vars: { status: string }) =>
      `Justificativas são obrigatórias para ${vars.status}`,
  },
  STATUS_UPDATE_TRANSACTION_FAILED: {
    en: 'Failed to update user approval status due to transaction error',
    pt: 'Falha ao atualizar o status de aprovação do usuário devido a um erro de transação',
  },
  STATUS_UPDATE_SUCCESS: {
    en: (vars: { role: string; status: string }) =>
      `${vars.role} account has been ${vars.status} successfully`,
    pt: (vars: { role: string; status: string }) =>
      `A conta de ${vars.role} foi ${vars.status} com sucesso`,
  },
  DELETE_UNAPPROVED_DENIED: {
    en: (vars: { status: string }) =>
      `You are not approved to delete a user. Your account is ${vars.status}`,
    pt: (vars: { status: string }) =>
      `Você não está aprovado para excluir um usuário. Sua conta está ${vars.status}`,
  },
  USER_NOT_FOUND_OR_DELETED: {
    en: 'User not found or already deleted!',
    pt: 'Usuário não encontrado ou já excluído!',
  },
  CANNOT_DELETE_SUPER_ADMIN: {
    en: 'Cannot delete Super Admin user!',
    pt: 'Não é possível excluir o usuário Super Admin!',
  },
  DELETE_PERMISSION_DENIED: {
    en: 'You do not have permission to delete this user account!',
    pt: 'Você não tem permissão para excluir esta conta de usuário!',
  },
  DELETE_FLEET_PARTNER_DENIED: {
    en: 'You can only delete delivery partners registered under your fleet management!',
    pt: 'Você só pode excluir parceiros de entrega registrados sob a gestão da sua frota!',
  },
  SOFT_DELETE_TRANSACTION_FAILED: {
    en: 'Failed to execute soft delete due to transaction rollback',
    pt: 'Falha ao executar a exclusão lógica devido ao rollback da transação',
  },
  SOFT_DELETE_SUCCESS: {
    en: (vars: { role: string }) =>
      `${vars.role} account and profile deleted successfully`,
    pt: (vars: { role: string }) =>
      `Conta e perfil de ${vars.role} excluídos com sucesso`,
  },
  PERMANENT_DELETE_UNAPPROVED_DENIED: {
    en: (vars: { status: string }) =>
      `You are not approved to perform permanent deletion. Your account is ${vars.status}`,
    pt: (vars: { status: string }) =>
      `Você não está aprovado para realizar a exclusão permanente. Sua conta está ${vars.status}`,
  },
  PERMANENT_DELETE_NOT_FOUND: {
    en: 'User account not found or already permanently deleted!',
    pt: 'Conta de usuário não encontrada ou já excluída permanentemente!',
  },
  MUST_BE_SOFT_DELETED_FIRST: {
    en: 'User must be soft-deleted first before performing permanent deletion!',
    pt: 'O usuário deve ser excluído logicamente primeiro antes de realizar a exclusão permanente!',
  },
  PERMANENT_DELETE_TRANSACTION_FAILED: {
    en: 'Failed to execute permanent deletion due to transaction rollback',
    pt: 'Falha ao executar a exclusão permanente devido ao rollback da transação',
  },
  PERMANENT_DELETE_SUCCESS: {
    en: (vars: { role: string }) =>
      `${vars.role} account and profile permanently purged from DeliGo systems.`,
    pt: (vars: { role: string }) =>
      `Conta e perfil de ${vars.role} eliminados permanentemente dos sistemas DeliGo.`,
  },

  REFRESH_TOKEN_SUCCESS: {
    en: 'Access token retrieved successfully!',
    pt: 'Token de acesso recuperado com sucesso!',
  },
} as const;
