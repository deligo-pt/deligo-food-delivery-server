/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import config from '../../config';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { CheckoutSummary } from '../Checkout/checkout.model';
import { Order } from '../Order/order.model';
import { ORDER_STATUS } from '../Order/order.constant';
import {
  TIngredientOrder,
  TIngredientOrderDetail,
} from '../Ingredient-Order/ing-order.interface';
import mongoose from 'mongoose';
import { Vendor } from '../Vendor/vendor.model';
import { Ingredient } from '../Ingredients/ingredients.model';
import { IngredientOrder } from '../Ingredient-Order/ing-order.model';
import { GlobalSettingsService } from '../GlobalSetting/globalSetting.service';
import { TPaymentMethod } from '../../constant/GlobalInterface/payment.interface';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';
import { EmailHelper } from '../../utils/emailSender';
import { TLanguageCode } from '../../constant/GlobalInterface/language.interface';
import { OrderServices } from '../Order/order.service';
import { PaymentToken } from '../Payment-Token/payment-token.model';
import { PaymentTokenServices } from '../Payment-Token/payment-token.service';

export const solutionIds = {
  CARD: '113',
  MB_WAY: '110',
  APPLE_PAY: '115',
  PAYPAL: '105',
  GOOGLE_PAY: '114',
  OTHER: null,
};

export const REDUNIQ_SUCCESS_CODES = new Set([
  '00000000',
  '17000000000',
  '900000000',
  '13000000000',
]);

export const isRedUniqSuccess = (result: any, transaction: any) =>
  transaction?.status === '1' || REDUNIQ_SUCCESS_CODES.has(result?.code);

export const isTokenizablePaymentMethod = (method: TPaymentMethod) =>
  method === 'CARD';

const getReduniqNotificationUrl = () =>
  config.backend_base_url
    ? `${config.backend_base_url}/payment/reduniq/notification`
    : undefined;

const sendRefundSuccessEmail = async (
  order: any,
  refundTransactionId?: string | null,
) => {
  try {
    const customer = order.customerId as any;
    const customerEmail = customer?.email;

    if (!customerEmail) return;

    const customerName =
      [customer?.name?.firstName, customer?.name?.lastName]
        .filter(Boolean)
        .join(' ') || 'Customer';

    const emailHtml = await EmailHelper.createEmailContent(
      {
        user: customerName,
        orderId: order.orderId,
        refundAmount: Number(order.payoutSummary?.grandTotal || 0).toFixed(2),
        refundTransactionId: refundTransactionId || 'N/A',
        currentYear: new Date().getFullYear(),
        date: new Date().toDateString(),
      },
      'refund-success',
    );

    await EmailHelper.sendEmail(
      customerEmail,
      emailHtml,
      `Your refund for order #${order.orderId} has been processed`,
      { shouldLog: false },
    );
  } catch (error) {
    void error;
  }
};

const performRedUniqDoVoid = async (transactionId: string, comment: string) => {
  const payload = {
    method: 'doVoid',
    api: {
      username: config.redUniq.username,
      password: config.redUniq.password,
    },
    transaction: { id: transactionId },
    comment,
  };

  const response = await axios.post(config.redUniq.api_url as string, payload);
  return response.data;
};

// Initiate Payment with Option to Save Card (Checkout Flow)
const createRedUniqPayment = async (
  checkoutSummaryId: string,
  paymentMethod: TPaymentMethod,
  saveCard = false,
) => {
  const summary = await CheckoutSummary.findById(checkoutSummaryId);
  if (!summary)
    throw new AppError(httpStatus.NOT_FOUND, 'CHECKOUT_SUMMARY_NOT_FOUND');

  if (summary.isConvertedToOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'CHECKOUT_SUMMARY_ALREADY_CONVERTED',
    );
  }

  if (summary.paymentStatus === 'PROCESSING') {
    throw new AppError(httpStatus.BAD_REQUEST, 'PAYMENT_ALREADY_IN_PROCESS');
  }

  if (summary.paymentStatus === 'PAID') {
    throw new AppError(httpStatus.BAD_REQUEST, 'PAYMENT_ALREADY_COMPLETED');
  }

  if (!config.redUniq.api_url) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'REDUNIQ_API_URL_NOT_CONFIGURED',
    );
  }

  // Silently ignore saveCard for non-tokenizable methods instead of failing checkout.
  const willSaveCard = saveCard && isTokenizablePaymentMethod(paymentMethod);

  const payload: Record<string, any> = {
    method: 'initPayment',
    api: {
      username: config.redUniq.username,
      password: config.redUniq.password,
    },
    payment: {
      amount: Math.round(summary.payoutSummary.grandTotal * 100),
      action: 101, // 101 means immediate sale
      currency: '978', // EUR
      solution: paymentMethod !== 'OTHER' ? solutionIds[paymentMethod] : null,
      description: `Order Payment via ${paymentMethod}`,
    },

    order: {
      ref: checkoutSummaryId,
      amount: Math.round(summary.payoutSummary.grandTotal * 100),
      date: new Date().toISOString().slice(0, 19).replace('T', ' '),
    },
    returnUrlOk: `${config.frontend_urls.payment}/payment-success?summaryId=${checkoutSummaryId}`,
    returnUrlError: `${config.frontend_urls.payment}/payment-failed?summaryId=${checkoutSummaryId}`,
    languageCode: 'pt',
  };

  // Backs up the client-driven /orders/create-order confirmation (Endpoint 4).
  const notificationUrl = getReduniqNotificationUrl();
  if (notificationUrl) {
    payload.notificationUrl = notificationUrl;
  }

  // action: 500 = create a reusable card token; card is entered on REDUNIQ's hosted page.
  if (willSaveCard) {
    payload.payToken = {
      action: 500,
      ref: checkoutSummaryId,
    };
  }

  try {
    const response = await axios.post(config.redUniq.api_url, payload);

    const { result = {}, token, redirectUrl } = response.data || {};

    if (
      !result?.code ||
      (result.code !== '00000000' && result.code !== '17000000000')
    ) {
      console.error('REDUNIQ initPayment rejected:', response.data);
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'PAYMENT_INITIATION_FAILED_BY_GATEWAY',
        {
          gatewayCode: result?.code || '',
          gatewayMessage: result?.message || '',
        },
      );
    }

    if (token) {
      summary.paymentMethod = paymentMethod;
      summary.paymentStatus = 'PROCESSING';
      await summary.save();
    }

    return {
      messageKey: 'REDUNIQ_PAYMENT_SESSION_CREATED' as TMessageKey,
      data: {
        redirectUrl,
        paymentToken: token,
        cardWillBeSaved: willSaveCard,
      },
    };
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 502) {
        throw new AppError(
          error.response.status,
          'PAYMENT_GATEWAY_TEMP_UNAVAILABLE_502',
        );
      }

      throw new AppError(error.response.status, 'GATEWAY_ERROR');
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'PAYMENT_PROCESSING_FAILED',
    );
  }
};

// refund redUniq payment service
const refundRedUniqPayment = async (orderId: string) => {
  const order = await Order.findOne({
    orderId,
    isDeleted: false,
  }).populate('customerId', 'name email');

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, 'ORDER_NOT_FOUND');
  }

  if (!order.isPaid || order.paymentStatus !== 'PAID') {
    throw new AppError(httpStatus.BAD_REQUEST, 'PAYMENT_CANNOT_BE_REFUNDED');
  }

  if (
    order.orderStatus !== ORDER_STATUS.REJECTED &&
    order.orderStatus !== ORDER_STATUS.CANCELED
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, 'ORDER_NOT_ELIGIBLE_FOR_REFUND');
  }

  if (!order.transactionId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'TRANSACTION_ID_NOT_FOUND');
  }

  if (!config.redUniq.api_url) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'REDUNIQ_API_URL_NOT_CONFIGURED',
    );
  }

  const refundPayload = {
    method: 'doRefund',
    api: {
      username: config.redUniq.username,
      password: config.redUniq.password,
    },
    transaction: {
      id: order.transactionId,
    },
    payment: {
      amount: Math.round(order.payoutSummary.grandTotal * 100),
      action: 300,
    },
    comment: `Full refund for Order ${order.orderId}`,
  };

  try {
    const response = await axios.post(config.redUniq.api_url, refundPayload);
    const { result = {}, transaction = {} } = response.data || {};
    const isRefundSuccessful = isRedUniqSuccess(result, transaction);

    if (!isRefundSuccessful) {
      if (
        result?.code === '00100060' ||
        transaction?.status === '2' ||
        transaction?.status === '3'
      ) {
        const transactionId = order.transactionId as string;
        const voidResponse = await performRedUniqDoVoid(
          transactionId,
          `Void for Order ${order.orderId}`,
        );
        const { result: voidResult = {}, transaction: voidTxn = {} } =
          voidResponse || {};
        const isVoidSuccessful = isRedUniqSuccess(voidResult, voidTxn);

        if (!isVoidSuccessful) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            'REFUND_FAILED_BY_GATEWAY',
            {
              gatewayCode: voidResult?.code,
              gatewayMessage: voidResult?.message,
              transactionStatus: voidTxn?.status,
            },
          );
        }

        order.paymentStatus = 'REFUNDED';
        order.isPaid = false;
        await order.save();

        const voidRefundTransactionId = (voidTxn as any)?.id || null;
        sendRefundSuccessEmail(order, voidRefundTransactionId).catch((err) =>
          console.error('Refund email sending failed:', err),
        );

        return {
          messageKey: 'REDUNIQ_PAYMENT_REFUNDED' as TMessageKey,
          data: {
            refundTransactionId: voidRefundTransactionId,
            refundedBy: 'void',
          },
        };
      }

      throw new AppError(httpStatus.BAD_REQUEST, 'REFUND_FAILED_BY_GATEWAY', {
        gatewayCode: result?.code,
        gatewayMessage: result?.message,
        transactionStatus: transaction?.status,
      });
    }

    order.paymentStatus = 'REFUNDED';
    order.isPaid = false;
    await order.save();

    const refundTransactionId = (transaction as any)?.id || null;
    sendRefundSuccessEmail(order, refundTransactionId).catch((err) =>
      console.error('Refund email sending failed:', err),
    );

    return {
      messageKey: 'REDUNIQ_PAYMENT_REFUNDED' as TMessageKey,
      data: {
        refundTransactionId,
      },
    };
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 502) {
        throw new AppError(
          error.response.status,
          'PAYMENT_GATEWAY_TEMP_UNAVAILABLE_502',
        );
      }

      throw new AppError(error.response.status, 'GATEWAY_ERROR');
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'PAYMENT_PROCESSING_FAILED',
    );
  }
};

// pay with saved token — synchronous, no redirect, finalizes the order immediately.
const payWithSavedToken = async (
  checkoutSummaryId: string,
  paymentTokenId: string,
  currentUser: TCurrentUser,
  lang: TLanguageCode = 'en',
) => {
  const summary = await CheckoutSummary.findById(checkoutSummaryId);
  if (!summary)
    throw new AppError(httpStatus.NOT_FOUND, 'CHECKOUT_SUMMARY_NOT_FOUND');

  if (summary.customerId.toString() !== currentUser._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, 'UNAUTHORIZED_TO_VIEW');
  }

  if (summary.isConvertedToOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'CHECKOUT_SUMMARY_ALREADY_CONVERTED',
    );
  }

  if (summary.paymentStatus === 'PROCESSING') {
    throw new AppError(httpStatus.BAD_REQUEST, 'PAYMENT_ALREADY_IN_PROCESS');
  }

  if (summary.paymentStatus === 'PAID') {
    throw new AppError(httpStatus.BAD_REQUEST, 'PAYMENT_ALREADY_COMPLETED');
  }

  const savedCard = await PaymentToken.findOne({
    _id: paymentTokenId,
    customerId: currentUser._id,
    isActive: true,
  });

  if (!savedCard) {
    throw new AppError(httpStatus.NOT_FOUND, 'SAVED_CARD_NOT_FOUND');
  }

  const existingVendor = await Vendor.findById(summary.vendorId).lean();
  if (!existingVendor) {
    throw new AppError(httpStatus.NOT_FOUND, 'VENDOR_NOT_FOUND');
  }

  if (!config.redUniq.api_url) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'REDUNIQ_API_URL_NOT_CONFIGURED',
    );
  }

  const payload: Record<string, any> = {
    method: 'doPaymentToken',
    api: {
      username: config.redUniq.username,
      password: config.redUniq.password,
    },
    payment: {
      amount: Math.round(summary.payoutSummary.grandTotal * 100),
      action: 101,
      description: `One-click order payment via saved ${savedCard.cardBrand} card`,
    },
    order: {
      ref: checkoutSummaryId,
      amount: Math.round(summary.payoutSummary.grandTotal * 100),
      date: new Date().toISOString().slice(0, 19).replace('T', ' '),
    },
    payToken: {
      id: savedCard.tokenId,
      action: 503,
    },
  };

  const notificationUrl = getReduniqNotificationUrl();
  if (notificationUrl) {
    payload.notificationUrl = notificationUrl;
  }

  summary.paymentMethod = 'CARD';
  summary.paymentStatus = 'PROCESSING';
  await summary.save();

  try {
    const response = await axios.post(config.redUniq.api_url, payload);

    const { result = {}, transaction = {} } = response.data || {};

    if (!isRedUniqSuccess(result, transaction)) {
      summary.paymentStatus = 'FAILED';
      await summary.save();

      throw new AppError(httpStatus.BAD_REQUEST, 'SAVED_TOKEN_PAYMENT_FAILED', {
        gatewayCode: result?.code,
        gatewayMessage: result?.message,
      });
    }

    const transactionId = transaction?.id;
    if (!transactionId) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'PAYMENT_TOKEN_NOT_RECEIVED',
      );
    }

    // finalizeCheckoutIntoOrder marks the summary PAID/converted itself — no separate save needed.
    return await OrderServices.finalizeCheckoutIntoOrder(
      summary,
      existingVendor,
      transactionId,
      currentUser,
      lang,
    );
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }

    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 502) {
        throw new AppError(
          error.response.status,
          'PAYMENT_GATEWAY_TEMP_UNAVAILABLE_502',
        );
      }
      throw new AppError(error.response.status, 'GATEWAY_ERROR');
    }

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'PAYMENT_PROCESSING_FAILED',
    );
  }
};

// webhook handler. Never trusts the POSTed status — re-verifies via
const handleReduniqNotification = async (body: any) => {
  const checkoutSummaryId: string | undefined =
    body?.order?.ref || body?.ref || body?.transaction?.ref;
  const notificationToken: string | undefined =
    body?.token || body?.transaction?.token;

  if (!checkoutSummaryId) return;

  const summary = await CheckoutSummary.findById(checkoutSummaryId);
  if (!summary || summary.isConvertedToOrder) return;

  let paymentData = body;

  if (notificationToken && config.redUniq.api_url) {
    const verifyPayload = {
      method: 'getResult',
      api: {
        username: config.redUniq.username,
        password: config.redUniq.password,
      },
      token: notificationToken,
    };

    const verifyRes = await axios.post(config.redUniq.api_url, verifyPayload);
    paymentData = verifyRes.data;
  }

  const transaction = paymentData?.transaction || {};

  if (transaction?.status !== '4') {
    summary.paymentStatus = 'FAILED';
    await summary.save();
    return;
  }

  if (summary.paymentMethod === 'CARD') {
    await PaymentTokenServices.persistCardTokenFromGatewayResponse(
      summary.customerId.toString(),
      checkoutSummaryId,
      paymentData,
    ).catch((err) =>
      console.error('Notification card token persistence failed:', err),
    );
  }

  const existingVendor = await Vendor.findById(summary.vendorId).lean();
  if (!existingVendor) return;

  try {
    await OrderServices.finalizeCheckoutIntoOrder(
      summary,
      existingVendor,
      transaction.id,
      { _id: summary.customerId } as TCurrentUser,
      'en',
    );
  } catch (err: any) {
    if (err?.code !== 11000) {
      console.error('Webhook order finalization failed:', err);
    }
  }
};

// handle payment failure
const handlePaymentFailure = async (
  checkoutSummaryId: string,
  currentUser: TCurrentUser,
) => {
  const summary = await CheckoutSummary.findById(checkoutSummaryId);

  if (!summary)
    throw new AppError(httpStatus.NOT_FOUND, 'CHECKOUT_SUMMARY_NOT_FOUND');

  if (summary.customerId.toString() !== currentUser._id.toString()) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'NOT_AUTHORIZED_TO_VIEW');
  }

  if (!summary.isConvertedToOrder) {
    summary.paymentStatus = 'FAILED';
    await summary.save();
  }

  return {
    messageKey: 'PAYMENT_STATUS_RESET_SUCCESS' as TMessageKey,
    data: null,
  };
};

// create ingredients payment service
const createIngredientRedUniqPayment = async (
  payload: TIngredientOrder,
  currentUser: TCurrentUser,
) => {
  const { orderDetails, paymentMethod, deliveryAddress } = payload;

  if (!orderDetails || orderDetails.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'ORDER_DETAILS_EMPTY');
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const vendorInfo = await Vendor.findById(currentUser._id).session(session);
    if (!vendorInfo) {
      throw new AppError(httpStatus.NOT_FOUND, 'VENDOR_NOT_FOUND');
    }

    const pendingOrders = await IngredientOrder.find({
      vendorId: currentUser._id,
      paymentStatus: 'PROCESSING',
      orderStatus: 'PENDING',
    })
      .setOptions({ skipFilter: true })
      .session(session);

    for (const oldOrder of pendingOrders) {
      if (oldOrder.isDeleted) {
        await IngredientOrder.deleteOne({ _id: oldOrder._id }).session(session);
        continue;
      }

      for (const item of oldOrder.orderDetails) {
        await Ingredient.findByIdAndUpdate(
          item.ingredientId,
          { $inc: { stock: item.quantity } },
          { session },
        );
      }

      await IngredientOrder.deleteOne({ _id: oldOrder._id }).session(session);
    }

    const processedOrderDetails: TIngredientOrderDetail[] = [];
    let totalOriginalPrice = 0;
    let totalProductDiscount = 0;
    let totalTaxAmount = 0;

    for (const item of orderDetails) {
      const ingredient = await Ingredient.findOne({
        _id: item.ingredientId,
        isDeleted: false,
      })
        .populate('tax')
        .session(session);

      if (!ingredient) {
        throw new AppError(httpStatus.NOT_FOUND, 'INGREDIENT_NOT_FOUND', {
          ingredientId: String(item.ingredientId),
        });
      }

      if (item.quantity > ingredient.stock) {
        throw new AppError(httpStatus.BAD_REQUEST, 'STOCK_NOT_AVAILABLE', {
          name: ingredient.name,
          stock: ingredient.stock,
        });
      }

      if (item.quantity < (ingredient.minOrder || 1)) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          'MINIMUM_ORDER_QUANTITY_REQUIRED',
          { name: ingredient.name, minOrder: ingredient.minOrder || 1 },
        );
      }

      let activePrice = ingredient.price;
      if (ingredient.bulkDiscount && ingredient.bulkDiscount.length > 0) {
        const applicableDiscount = ingredient.bulkDiscount
          .filter((d) => item.quantity >= d.minQty)
          .sort((a, b) => b.minQty - a.minQty)[0];

        if (applicableDiscount) {
          activePrice = applicableDiscount.discountPrice;
        }
      }

      const itemOriginalCost = item.quantity * ingredient.price;
      const itemActualCostBeforeTax = item.quantity * activePrice;
      const itemDiscount = itemOriginalCost - itemActualCostBeforeTax;

      const taxRate = (ingredient.tax as any)?.taxRate || 0;
      const itemTaxAmount = Number(
        ((itemActualCostBeforeTax * taxRate) / 100).toFixed(2),
      );
      const itemTotalAmount = Number(
        (itemActualCostBeforeTax + itemTaxAmount).toFixed(2),
      );

      ingredient.stock =
        (Number(ingredient.stock) || 0) - Number(item.quantity);
      await ingredient.save({ session });

      processedOrderDetails.push({
        ingredientId: ingredient._id,
        name: ingredient.name,
        sku: ingredient.sku,
        unit: ingredient.unit,
        quantity: item.quantity,
        pricePerUnit: activePrice,
        taxRate: taxRate,
        taxAmount: itemTaxAmount,
        totalAmount: itemTotalAmount,
      });

      totalOriginalPrice += itemOriginalCost;
      totalProductDiscount += itemDiscount;
      totalTaxAmount += itemTaxAmount;
    }

    const globalSettings = await GlobalSettingsService.getGlobalSettings();
    const ingredientOrderSettings = globalSettings?.ingredientOrder;
    const vendorCity =
      vendorInfo.businessLocation?.city?.trim().toLowerCase() || '';

    let deliveryChargeBase = 0;
    if (vendorCity === 'lisbon' || vendorCity === 'lisboa') {
      deliveryChargeBase =
        ingredientOrderSettings?.deliveryChargeInsideLisbon || 20;
    } else {
      deliveryChargeBase =
        ingredientOrderSettings?.deliveryChargeOutsideLisbon || 30;
    }

    deliveryChargeBase = Number(deliveryChargeBase.toFixed(2));
    const deliveryVatRate = globalSettings?.deliveryVatRate || 0;
    const deliveryVatAmount = Number(
      ((deliveryChargeBase * deliveryVatRate) / 100).toFixed(2),
    );
    const deliveryChargeTotal = Number(
      (deliveryChargeBase + deliveryVatAmount).toFixed(2),
    );

    const taxableAmount = Number(
      (totalOriginalPrice - totalProductDiscount).toFixed(2),
    );
    totalTaxAmount = Number(totalTaxAmount.toFixed(2));

    const grandTotal = Number(
      (taxableAmount + totalTaxAmount + deliveryChargeTotal).toFixed(2),
    );

    const [newOrder] = await IngredientOrder.create(
      [
        {
          vendorId: currentUser._id,
          orderDetails: processedOrderDetails,
          deliveryAddress: deliveryAddress || vendorInfo.businessLocation,
          delivery: {
            charge: deliveryChargeBase,
            vatRate: deliveryVatRate,
            vatAmount: deliveryVatAmount,
            totalDeliveryCharge: deliveryChargeTotal,
          },
          orderCalculation: {
            totalOriginalPrice: Number(totalOriginalPrice.toFixed(2)),
            totalProductDiscount: Number(totalProductDiscount.toFixed(2)),
            taxableAmount,
            totalTaxAmount,
          },
          grandTotal,
          paymentMethod,
          orderStatus: 'PENDING',
          paymentStatus: 'PROCESSING',
          isDeleted: false,
        },
      ],
      { session },
    );

    const orderPayload = {
      method: 'initPayment',
      api: {
        username: config.redUniq.username,
        password: config.redUniq.password,
      },
      payment: {
        amount: Math.round(grandTotal * 100),
        action: 101,
        currency: '978',
        solution: paymentMethod !== 'OTHER' ? solutionIds[paymentMethod] : null,
        description: `Ingredient Order Reference: ${newOrder._id}`,
      },
      order: {
        ref: newOrder._id.toString(),
        amount: Math.round(grandTotal * 100),
        date: new Date().toISOString().slice(0, 19).replace('T', ' '),
      },
      returnUrlOk: `${config.frontend_urls.vendor}/vendor/ingredients/orders/payment-success?orderId=${newOrder._id}`,
      returnUrlError: `${config.frontend_urls.vendor}/vendor/ingredients/orders/payment-failed?orderId=${newOrder._id}`,
    };

    const response = await axios.post(
      config.redUniq.api_url as string,
      orderPayload,
    );
    const { result, token, redirectUrl } = response.data;

    if (
      !result?.code ||
      (result.code !== '00000000' && result.code !== '17000000000')
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'REDUNIQ_PAYMENT_INITIATION_FAILED',
      );
    }

    if (!token) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'PAYMENT_TOKEN_NOT_RECEIVED',
      );
    }

    if (token) {
      newOrder.transactionId = token;
      await newOrder.save({ session });

      await session.commitTransaction();

      return {
        messageKey: 'INGREDIENT_REDUNIQ_PAYMENT_SESSION_CREATED' as TMessageKey,
        data: {
          redirectUrl: redirectUrl,
          paymentToken: token,
        },
      };
    } else {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'REDUNIQ_PAYMENT_INITIATION_FAILED',
      );
    }
  } catch (error: unknown) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(httpStatus.BAD_REQUEST, 'TRANSACTION_FAILED');
  } finally {
    session.endSession();
  }
};

export const PaymentServices = {
  createRedUniqPayment,
  payWithSavedToken,
  handleReduniqNotification,
  refundRedUniqPayment,
  handlePaymentFailure,
  createIngredientRedUniqPayment,
};
