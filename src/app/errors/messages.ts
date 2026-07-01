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
    en: 'Something went wrong on the server!',
    pt: 'Algo deu errado no servidor!',
  },
  UNKNOWN_SERVER_ERROR: {
    en: 'Unknown Server Error',
    pt: 'Erro desconhecido do servidor',
  },

  // --- MULTER FILE UPLOAD ERRORS ---
  FILE_TOO_LARGE: {
    en: 'File size is too large. Maximum limit is 5MB.',
    pt: 'O tamanho do arquivo é muito grande. O limite máximo é de 5MB.',
  },
  FILE_COUNT_EXCEEDED: {
    en: 'You cannot upload more than 5 files at a time.',
    pt: 'Você não pode enviar mais de 5 arquivos por vez.',
  },
  UNEXPECTED_FILE_FIELD: {
    en: 'Unexpected field. Please check the key name (e.g., "files").',
    pt: 'Campo inesperado. Por favor, verifique o nome da chave (ex: "files").',
  },
  BULKGATE_CONFIGURATION_MISSING: {
    en: 'Bulkgate configuration is missing',
    pt: 'A configuracao do Bulkgate esta ausente',
  },
  BULKGATE_VERIFY_OTP_FAILED: {
    en: (vars: { message: string }) =>
      vars.message || 'Failed to verify OTP with Bulkgate',
    pt: (vars: { message: string }) =>
      vars.message || 'Falha ao verificar OTP com Bulkgate',
  },
  BULKGATE_OTP_SEND_FAILED: {
    en: (vars: { error: string }) => vars.error || 'Bulkgate OTP send failed',
    pt: (vars: { error: string }) =>
      vars.error || 'Falha ao enviar OTP com Bulkgate',
  },
  INVALID_OTP_REQUEST_ID: {
    en: 'Invalid OTP request ID',
    pt: 'ID de solicitacao de OTP invalido',
  },
  BULKGATE_RESEND_OTP_FAILED: {
    en: (vars: { message: string }) =>
      vars.message || 'Failed to resend OTP with Bulkgate',
    pt: (vars: { message: string }) =>
      vars.message || 'Falha ao reenviar OTP com Bulkgate',
  },
  USER_ID_MUST_BE_PROVIDED: {
    en: 'User id must be provided',
    pt: 'O id do usuario deve ser fornecido',
  },
  EMAIL_MUST_BE_PROVIDED: {
    en: 'Email must be provided',
    pt: 'O email deve ser fornecido',
  },
  UNAUTHORIZED_ROLE: {
    en: (vars: { role: string }) => `Unauthorized role: ${vars.role}`,
    pt: (vars: { role: string }) => `Perfil nao autorizado: ${vars.role}`,
  },
  NO_USER_FOUND_WITH_ID: {
    en: (vars: { userId: string }) => `No user found with ID "${vars.userId}".`,
    pt: (vars: { userId: string }) =>
      `Nenhum usuario encontrado com o ID "${vars.userId}".`,
  },
  NO_USER_FOUND_WITH_EMAIL: {
    en: (vars: { email: string }) =>
      `No user found with email "${vars.email}".`,
    pt: (vars: { email: string }) =>
      `Nenhum usuario encontrado com o email "${vars.email}".`,
  },
  FAILED_TO_SEND_EMAIL: {
    en: 'Failed to send email',
    pt: 'Falha ao enviar email',
  },
  EMAIL_CONTENT_GENERATION_FAILED: {
    en: (vars: { message: string }) => vars.message,
    pt: (vars: { message: string }) => vars.message,
  },
  FILE_NOT_FOUND_AT_PATH: {
    en: (vars: { localFilePath: string }) =>
      `File not found at path: ${vars.localFilePath}`,
    pt: (vars: { localFilePath: string }) =>
      `Arquivo nao encontrado no caminho: ${vars.localFilePath}`,
  },
  EMPTY_FILE_CANNOT_BE_UPLOADED_TO_CLOUDINARY: {
    en: 'Empty file cannot be uploaded to Cloudinary',
    pt: 'Arquivo vazio nao pode ser enviado ao Cloudinary',
  },
  FILE_UPLOAD_FAILED: {
    en: (vars: { message: string }) => vars.message || 'File upload failed',
    pt: (vars: { message: string }) =>
      vars.message || 'Falha no envio de arquivo',
  },
  GOOGLE_API_ERROR: {
    en: (vars: { status: string }) => `Google API Error: ${vars.status}`,
    pt: (vars: { status: string }) => `Erro da API do Google: ${vars.status}`,
  },
  RATE_LIMIT_EXCEEDED: {
    en: (vars: { messagePrefix: string; secondsLeft: number }) =>
      `${vars.messagePrefix} Please try again after ${vars.secondsLeft} seconds.`,
    pt: (vars: { messagePrefix: string; secondsLeft: number }) =>
      `${vars.messagePrefix} Tente novamente apos ${vars.secondsLeft} segundos.`,
  },
  INVALID_JSON_DATA: {
    en: 'Invalid JSON data',
    pt: 'Dados JSON invalidos',
  },
  PROVIDE_REQUIRED_DATA_OR_IMAGE_FORM_DATA: {
    en: 'Please provide required data or an image file as form data',
    pt: 'Forneca os dados necessarios ou um arquivo de imagem como form-data',
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
  ...offerMessages,
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
