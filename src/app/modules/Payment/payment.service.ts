/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import config from '../../config';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { CheckoutSummary } from '../Checkout/checkout.model';
import { TIngredientOrder } from '../Ingredient-Order/ing-order.interface';
import mongoose from 'mongoose';
import { Vendor } from '../Vendor/vendor.model';
import { Ingredient } from '../Ingredients/ingredients.model';
import { IngredientOrder } from '../Ingredient-Order/ing-order.model';
import { calculateGoggleRoadDistance } from '../../utils/calculateGoggleRoadDistance';
import { GlobalSettingsService } from '../GlobalSetting/globalSetting.service';
import { Admin } from '../Admin/admin.model';
import { TPaymentMethod } from '../../constant/GlobalInterface/payment.interface';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';

const solutionIds = {
  CARD: '117',
  MB_WAY: '110',
  APPLE_PAY: '115',
  PAYPAL: '105',
  GOOGLE_PAY: '114',
  OTHER: null,
};

// create redUniq payment intent service
const createRedUniqPayment = async (
  checkoutSummaryId: string,
  paymentMethod: TPaymentMethod,
) => {
  const summary = await CheckoutSummary.findById(checkoutSummaryId);
  if (!summary) throw new AppError(httpStatus.NOT_FOUND, 'Summary not found');

  if (summary.isConvertedToOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Checkout summary already converted to order',
    );
  }

  if (summary.paymentStatus === 'PROCESSING') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Payment already in process for this checkout.',
    );
  }

  if (summary.paymentStatus === 'PAID') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Payment already completed for this checkout',
    );
  }

  if (!config.redUniq.api_url) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'RedUniq API URL is not configured',
    );
  }

  const payload = {
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

  try {
    const response = await axios.post(config.redUniq.api_url, payload);

    const { result = {}, token, redirectUrl } = response.data || {};

    if (
      !result?.code ||
      (result.code !== '00000000' && result.code !== '17000000000')
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        result?.message || 'Payment initiation failed by gateway',
      );
    }

    if (token) {
      summary.paymentMethod = paymentMethod;
      summary.paymentStatus = 'PROCESSING';
      await summary.save();
    }

    return {
      redirectUrl,
      paymentToken: token,
    };
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      const errorMessage =
        error.response.status === 502
          ? 'Payment Gateway is temporarily unavailable (502 Bad Gateway)'
          : error.response.data?.message || 'Gateway Error';

      throw new AppError(error.response.status, errorMessage);
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || 'Something went wrong during payment processing',
    );
  }
};

// handle payment failure
const handlePaymentFailure = async (
  checkoutSummaryId: string,
  currentUser: TCurrentUser,
) => {
  const summary = await CheckoutSummary.findById(checkoutSummaryId);

  if (!summary) throw new AppError(httpStatus.NOT_FOUND, 'Summary not found');

  if (summary.customerId.toString() !== currentUser._id.toString()) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'You are not authorized to view',
    );
  }

  if (!summary.isConvertedToOrder) {
    summary.paymentStatus = 'FAILED';
    await summary.save();
  }

  return { message: 'Payment status reset successfully' };
};

// create ingredients payment service
const createIngredientRedUniqPayment = async (
  payload: TIngredientOrder,
  currentUser: TCurrentUser,
) => {
  const { orderDetails, paymentMethod } = payload;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const vendorInfo = await Vendor.findById(currentUser._id).session(session);
    const ingredient = await Ingredient.findById(
      payload.orderDetails?.ingredient,
    ).session(session);

    if (!vendorInfo) {
      throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
    }
    if (!ingredient) {
      throw new AppError(httpStatus.NOT_FOUND, 'Ingredient not found');
    }

    if (orderDetails.totalQuantity > ingredient?.stock) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Ingredient stock not available',
      );
    }

    if (orderDetails.totalQuantity < ingredient.minOrder!) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Minimum order quantity is ${ingredient.minOrder}`,
      );
    }

    const globalSettings = await GlobalSettingsService.getGlobalSettings();
    const ingredientOrderData = globalSettings?.ingredientOrder;

    const vendorCity =
      vendorInfo.businessLocation?.city?.trim().toLowerCase() || '';

    let deliveryChargeBase = 0;

    if (vendorCity === 'lisbon' || vendorCity === 'lisboa') {
      deliveryChargeBase =
        ingredientOrderData?.deliveryChargeInsideLisbon || 20;
    } else {
      deliveryChargeBase =
        ingredientOrderData?.deliveryChargeOutsideLisbon || 30;
    }

    deliveryChargeBase = Number(deliveryChargeBase.toFixed(2));

    const vatRate = ingredientOrderData?.vatRate || 0;
    const deliveryVatAmount = Number(
      ((deliveryChargeBase * vatRate) / 100).toFixed(2),
    );
    const deliveryChargeTotal = Number(
      (deliveryChargeBase + deliveryVatAmount).toFixed(2),
    );

    const totalIngredientCost =
      payload.orderDetails.totalQuantity * Number(ingredient.price);
    const grandTotal = Number(
      (totalIngredientCost + deliveryChargeTotal).toFixed(2),
    );

    const paymentMethod = payload.paymentMethod as TPaymentMethod;

    // Create order within transaction
    const [newOrder] = await IngredientOrder.create(
      [
        {
          orderDetails: {
            ...payload.orderDetails,
            totalAmount: totalIngredientCost,
          },
          paymentMethod: paymentMethod,
          vendor: currentUser._id,
          deliveryAddress: vendorInfo.businessLocation,
          delivery: {
            charge: deliveryChargeBase,
            vatRate: Number(ingredientOrderData?.vatRate || 0),
            vatAmount: deliveryVatAmount,
            totalDeliveryCharge: deliveryChargeTotal,
          },
          grandTotal,
          paymentStatus: 'PROCESSING',
          orderStatus: 'PENDING',
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
        description: `Ingredient Order via ${paymentMethod}`,
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

    if (result.code === '00000000') {
      newOrder.transactionId = token;
      await newOrder.save({ session });

      await session.commitTransaction();

      return {
        redirectUrl: redirectUrl,
        paymentToken: token,
      };
    } else {
      throw new Error('Payment initiation failed');
    }
  } catch (error: unknown) {
    await session.abortTransaction();
    const errorMessage =
      error instanceof Error ? error.message : 'Transaction failed';
    throw new AppError(httpStatus.BAD_REQUEST, errorMessage);
  } finally {
    session.endSession();
  }
};

export const PaymentServices = {
  createRedUniqPayment,
  handlePaymentFailure,
  createIngredientRedUniqPayment,
};
