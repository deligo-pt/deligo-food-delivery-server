import { addonMessages } from '../modules/Add-Ons/addOns.messages';
import { adminMessages } from '../modules/Admin/admin.messages';
import { agreementMessages } from '../modules/Agreement/agreement.messages';
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
} as const;

export const localizedMessages = {
  ...globalCommonMessages,
  ...authMessages,
  ...addonMessages,
  ...adminMessages,
  ...agreementMessages,
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
  ...transactionMessages,
  ...uploadMessages,
  ...vendorMessages,
  ...walletMessages,
  ...zoneMessages,
} as const;

// Global type safe key
export type TMessageKey = keyof typeof localizedMessages;
