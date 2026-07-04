import { addonMessages } from '../modules/Add-Ons/addOns.messages';
import { adminMessages } from '../modules/Admin/admin.messages';
import { agreementMessages } from '../modules/Agreement/agreement.messages';
import { aiContentMessages } from '../modules/Ai-Content-Generator/ai-content-generator.messages';
import { analyticsMessages } from '../modules/Analytics/analytics.messages';
import { analyticsSecondMessages } from '../modules/Analytics/analyticsSecond.messages';
import { authMessages } from '../modules/Auth/auth.messages';
import { cartMessages } from '../modules/Cart/cart.messages';
import { businessCategoryMessages } from '../modules/Category/businessCategory.messages';
import { cuisineCategoryMessages } from '../modules/Category/cuisineCategory.messages';
import { productCategoryMessages } from '../modules/Category/productCategory.messages';
import { checkoutMessages } from '../modules/Checkout/checkout.messages';
import { contactMessages } from '../modules/ContactUs/contact.messages';
import { customerMessages } from '../modules/Customer/customer.messages';
import { deliveryPartnerMessages } from '../modules/Delivery-Partner/delivery-partner.messages';
import { fleetManagerMessages } from '../modules/Fleet-Manager/fleet-manager.messages';
import { globalSettingMessages } from '../modules/GlobalSetting/globalSetting.messages';
import { ingredientOrderMessages } from '../modules/Ingredient-Order/ing-order.messages';
import { ingredientsMessages } from '../modules/Ingredients/ingredients.messages';
import { notificationMessages } from '../modules/Notification/notificationMessages';
import { offerMessages } from '../modules/Offer/offer.messages';
import { orderMessages } from '../modules/Order/order.messages';
import { paymentMessages } from '../modules/Payment/payment.messages';
import { payoutMessages } from '../modules/Payout/payout.messages';
import { permissionMessages } from '../modules/Permission/permission.messages';
import { pointsMessages } from '../modules/Points/points.messages';
import { productMessages } from '../modules/Product/product.messages';
import { profileMessages } from '../modules/Profile/profile.messages';
import { ratingMessages } from '../modules/Rating/rating.messages';
import { referralMessages } from '../modules/Referral/referral.messages';
import { restrictedItemsMessages } from '../modules/RestrictedItems/restrictedItems.messages';
import { sosMessages } from '../modules/Sos/sos.messages';
import { sponsorshipsMessages } from '../modules/Sponsorships/sponsorships.messages';
import { supportMessages } from '../modules/Support/support.messages';
import { taxMessages } from '../modules/Tax/tax.messages';
import { testMessages } from '../modules/Test/test.messages';
import { transactionMessages } from '../modules/Transaction/transaction.messages';
import { uploadMessages } from '../modules/Upload/upload.messages';
import { vendorMessages } from '../modules/Vendor/vendor.messages';
import { walletMessages } from '../modules/Wallet/wallet.messages';
import { zoneMessages } from '../modules/Zone/zone.messages';

const globalCommonMessages = {
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
    en: 'Data loaded successfully.',
    pt: 'Dados carregados com sucesso.',
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
} as const;

export const localizedMessages = {
  ...globalCommonMessages,
  ...authMessages,
  ...addonMessages,
  ...adminMessages,
  ...agreementMessages,
  ...aiContentMessages,
  ...analyticsMessages,
  ...analyticsSecondMessages,
  ...cartMessages,
  ...businessCategoryMessages,
  ...cuisineCategoryMessages,
  ...productCategoryMessages,
  ...checkoutMessages,
  ...contactMessages,
  ...customerMessages,
  ...deliveryPartnerMessages,
  ...fleetManagerMessages,
  ...globalSettingMessages,
  ...ingredientOrderMessages,
  ...ingredientsMessages,
  ...notificationMessages,
  ...offerMessages, // eto toko done
  ...orderMessages,
  ...paymentMessages,
  ...payoutMessages,
  ...permissionMessages,
  ...pointsMessages,
  ...productMessages,
  ...profileMessages,
  ...ratingMessages,
  ...referralMessages,
  ...restrictedItemsMessages,
  ...sosMessages,
  ...sponsorshipsMessages,
  ...supportMessages,
  ...taxMessages,
  ...testMessages,
  ...transactionMessages,
  ...uploadMessages,
  ...vendorMessages,
  ...walletMessages,
  ...zoneMessages,
} as const;

// Global type safe key
export type TMessageKey = keyof typeof localizedMessages;
