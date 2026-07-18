import { globalCommonMessages } from '../constant/GlobalMessage/global.messages';
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
import { invoiceMessages } from '../modules/Invoice/invoice.message';
import { loginHistoryMessages } from '../modules/LoginHistory/loginHistory.messages';
import { notificationMessages } from '../modules/Notification/notification.messages';
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
  ...loginHistoryMessages,
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
  ...invoiceMessages,
} as const;

// Global type safe key
export type TMessageKey = keyof typeof localizedMessages;
