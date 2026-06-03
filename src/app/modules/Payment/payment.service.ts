/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import config from '../../config';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { CheckoutSummary } from '../Checkout/checkout.model';
import { IIngredientOrder } from '../Ingredient-Order/ing-order.interface';
import mongoose from 'mongoose';
import { Vendor } from '../Vendor/vendor.model';
import { Ingredient } from '../Ingredients/ingredients.model';
import { IngredientOrder } from '../Ingredient-Order/ing-order.model';
import { GlobalSettingsService } from '../GlobalSetting/globalSetting.service';
import { Admin } from '../Admin/admin.model';
import { TPaymentMethod } from '../../constant/GlobalInterface/payment.interface';
import { TAuthUser } from '../AuthUser/authUser.interface';
import { calculateGoogleRoadDistance } from '../../utils/calculateGoggleRoadDistance';

// create redUniq payment intent service
const createRedUniqPayment = async (
  checkoutSummaryId: string,
  paymentMethod: TPaymentMethod,
) => {
  if (!config.redUniq?.api_url) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'RedUniq API URL is not configured in environment settings',
    );
  }

  const summary = await CheckoutSummary.findOneAndUpdate(
    {
      _id: checkoutSummaryId,
      isConvertedToOrder: false,
      paymentStatus: { $nin: ['PROCESSING', 'PAID'] },
    },
    {
      $set: { paymentStatus: 'PROCESSING', paymentMethod: paymentMethod },
    },
    { new: true },
  );

  if (!summary) {
    const existingSummary =
      await CheckoutSummary.findById(checkoutSummaryId).lean();
    if (!existingSummary)
      throw new AppError(httpStatus.NOT_FOUND, 'Checkout summary not found');
    if (existingSummary.isConvertedToOrder)
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Checkout already converted to order',
      );
    if (existingSummary.paymentStatus === 'PROCESSING')
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Payment already in process for this checkout. Please wait.',
      );
    if (existingSummary.paymentStatus === 'PAID')
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Payment already completed for this checkout',
      );

    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Unable to initiate payment session',
    );
  }

  const solutionIds: Record<string, string | null> = {
    CARD: '117',
    MB_WAY: '110',
    APPLE_PAY: '115',
    PAYPAL: '105',
    GOOGLE_PAY: '114',
    OTHER: null,
  };

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
    returnUrlOk: `${config.frontend_urls.frontend_url_test_payment}/payment-success?summaryId=${checkoutSummaryId}`,
    returnUrlError: `${config.frontend_urls.frontend_url_test_payment}/payment-failed?summaryId=${checkoutSummaryId}`,
    languageCode: 'pt',
  };

  try {
    const response = await axios.post(config.redUniq.api_url, payload, {
      timeout: 15000,
    });

    const responseData = response.data || {};
    const { result, token, redirectUrl } = responseData;

    const successCodes = ['00000000', '17000000000'];
    if (!result || !successCodes.includes(result.code)) {
      await CheckoutSummary.findByIdAndUpdate(checkoutSummaryId, {
        $set: { paymentStatus: 'PENDING' },
      });

      throw new AppError(
        httpStatus.BAD_REQUEST,
        `RedUniq Gate rejection: ${result?.message || 'Payment initiation failed'}`,
      );
    }

    return {
      redirectUrl,
      paymentToken: token,
    };
  } catch (error: any) {
    await CheckoutSummary.findByIdAndUpdate(checkoutSummaryId, {
      $set: { paymentStatus: 'PENDING' },
    });

    console.error(
      '[Payment Gateway Error] RedUniq initialization failed:',
      error.message,
    );
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.response?.data?.result?.message ||
        'Payment provider gateway connection timeout/failed',
    );
  }
};

// handle payment failure
const handlePaymentFailure = async (
  checkoutSummaryId: string,
  currentUser: TAuthUser,
) => {
  const customerId = currentUser._id.toString();

  const summary = await CheckoutSummary.findOneAndUpdate(
    {
      _id: checkoutSummaryId,
      customerId: customerId,
      isConvertedToOrder: false,
    },
    {
      $set: { paymentStatus: 'FAILED' },
    },
    { new: true },
  );

  if (!summary) {
    const existingSummary =
      await CheckoutSummary.findById(checkoutSummaryId).lean();
    if (!existingSummary) {
      throw new AppError(httpStatus.NOT_FOUND, 'Checkout summary not found');
    }
    if (existingSummary.customerId.toString() !== customerId) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        'You are not authorized to perform this action',
      );
    }
    if (existingSummary.isConvertedToOrder) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Cannot reset payment status. Checkout already converted to an order.',
      );
    }
  }

  return {
    success: true,
    message:
      'Payment status reset to failed successfully. User can re-attempt payment.',
  };
};

// create ingredients payment service
const createIngredientRedUniqPayment = async (
  payload: IIngredientOrder,
  currentUser: TAuthUser,
) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const vendorInfo = await Vendor.findById(currentUser.userObjectId)
      .select('businessLocation')
      .session(session);
    const ingredient = await Ingredient.findById(
      payload.orderDetails?.ingredient,
    ).session(session);
    const adminInfo = await Admin.findOne({ role: 'SUPER_ADMIN' })
      .select('address')
      .session(session);

    if (!vendorInfo) {
      throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
    }
    if (!ingredient) {
      throw new AppError(httpStatus.NOT_FOUND, 'Ingredient not found');
    }

    const vendorCoords = vendorInfo.businessLocation;

    // 3. Calculate Distance and Delivery Charges
    const distanceData = await calculateGoogleRoadDistance(
      adminInfo?.address?.longitude as number,
      adminInfo?.address?.latitude as number,
      vendorCoords?.longitude as number,
      vendorCoords?.latitude as number,
    );

    const globalSettings = await GlobalSettingsService.getGlobalSettings();
    const BASE_FIXED_DELIVERY_CHARGE = globalSettings?.baseDeliveryCharge || 0;

    const deliveryChargeBase =
      distanceData.meters <= 1000
        ? BASE_FIXED_DELIVERY_CHARGE
        : Number(
            (
              distanceData.meters *
              (globalSettings?.deliveryChargePerMeter || 0)
            ).toFixed(2),
          );

    const totalIngredientCost =
      payload.orderDetails.totalQuantity * Number(ingredient.price);
    const grandTotal = Number(
      (totalIngredientCost + deliveryChargeBase).toFixed(2),
    );

    const paymentMethod = payload.paymentMethod as TPaymentMethod;
    const solutionIds: Record<string, string | null> = {
      CARD: '117',
      MB_WAY: '110',
      APPLE_PAY: '115',
      PAYPAL: '105',
      GOOGLE_PAY: '114',
      OTHER: null,
    };

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
            distance: Number(distanceData.km.toFixed(2)),
            estimatedTime: distanceData.durationMinutes,
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
      returnUrlOk: `${config.frontend_urls.frontend_url_test}/vendor/ingredients/orders/payment-success?orderId=${newOrder._id}`,
      returnUrlError: `${config.frontend_urls.frontend_url_test}/vendor/ingredients/orders/payment-failed?orderId=${newOrder._id}`,
    };

    const response = await axios.post(
      config.redUniq.api_url as string,
      orderPayload,
    );
    const { result, token, redirectUrl } = response.data;
    const successCodes = ['00000000', '17000000000'];

    if (result && successCodes.includes(result.code)) {
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
