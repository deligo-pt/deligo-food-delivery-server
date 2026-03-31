/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import config from '../../config';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { CheckoutSummary } from '../Checkout/checkout.model';
import { AuthUser } from '../../constant/user.constant';
import { IIngredientOrder, TPaymentMethod } from '../Ingredient-Order/ing-order.interface';
import mongoose from 'mongoose';
import { Vendor } from '../Vendor/vendor.model';
import { Ingredient } from '../Ingredients/ingredients.model';
import { IngredientOrder } from '../Ingredient-Order/ing-order.model';
import { calculateGoggleRoadDistance } from '../../utils/calculateGoggleRoadDistance';
import { GlobalSettingsService } from '../GlobalSetting/globalSetting.service';
import { Admin } from '../Admin/admin.model';

// create reduniq payment intent service
const createReduniqPayment = async (
  checkoutSummaryId: string,
  paymentMethod:
    | 'CARD'
    | 'MB_WAY'
    | 'APPLE_PAY'
    | 'PAYPAL'
    | 'GOOGLE_PAY'
    | 'OTHER',
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

  if (!config.reduniq.api_url) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Reduniq API URL is not configured',
    );
  }

  const solutionIds = {
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
      username: config.reduniq.username,
      password: config.reduniq.password,
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
    returnUrlOk: `${config.frontend_urls.frontend_url_test_payment}/payment-success?token={token}&summaryId=${checkoutSummaryId}`,
    returnUrlError: `${config.frontend_urls.frontend_url_test_payment}/payment-failed?summaryId=${checkoutSummaryId}`,
    languageCode: 'pt',
  };

  const response = await axios.post(config.reduniq.api_url, payload);
  const { result, token, redirectUrl } = response.data;

  if (response.data.token) {
    summary.paymentMethod = paymentMethod;
    summary.paymentStatus = 'PROCESSING';
    await summary.save();
  }

  if (result.code !== '00000000' && result.code !== '17000000000') {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Payment initiation failed',
    );
  }

  return {
    redirectUrl,
    paymentToken: token,
  };
};

// handle payment failure
const handlePaymentFailure = async (
  checkoutSummaryId: string,
  currentUser: AuthUser,
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
const createIngredientRequniqPayment = async (
  payload: IIngredientOrder,
  currentUser: AuthUser
) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const vendorInfo = await Vendor.findById(currentUser._id).session(session);
    const ingredient = await Ingredient.findById(payload.orderDetails?.ingredient).session(session);
    const adminInfo = await Admin.findOne({ role: "SUPER_ADMIN" }).select("address").session(session);

    if (!vendorInfo) {
      throw new AppError(httpStatus.NOT_FOUND, 'Vendor not found');
    }
    if (!ingredient) {
      throw new AppError(httpStatus.NOT_FOUND, 'Ingredient not found');
    }

    const vendorCoords = vendorInfo.currentSessionLocation?.coordinates as [number, number];

    // 3. Calculate Distance and Delivery Charges
    const distanceData = await calculateGoggleRoadDistance(
      adminInfo?.address?.longitude as number,
      adminInfo?.address?.latitude as number,
      vendorCoords[0],
      vendorCoords[1],
    );

    const globalSettings = await GlobalSettingsService.getGlobalSettings();
    const BASE_FIXED_DELIVERY_CHARGE = globalSettings?.baseDeliveryCharge || 0;

    const deliveryChargeBase = distanceData.meters <= 1000
      ? BASE_FIXED_DELIVERY_CHARGE
      : Number((distanceData.meters * (globalSettings?.deliveryChargePerMeter || 0)).toFixed(2));

    const totalIngredientCost = payload.orderDetails.totalQuantity * Number(ingredient.price);
    const grandTotal = Number((totalIngredientCost + deliveryChargeBase).toFixed(2));

    const paymentMethod = payload.paymentMethod as TPaymentMethod;
    const solutionIds = {
      CARD: '117',
      MB_WAY: '110',
      APPLE_PAY: '115',
      PAYPAL: '105',
      GOOGLE_PAY: '114',
      OTHER: null,
    };

    // Create order within transaction
    const [newOrder] = await IngredientOrder.create(
      [{
        ...payload,
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
      }],
      { session }
    );

    const orderPayload = {
      method: 'initPayment',
      api: {
        username: config.reduniq.username,
        password: config.reduniq.password
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
      returnUrlOk: `${config.frontend_urls.frontend_url_test_payment}/payment-success?orderId=${newOrder._id}`,
      returnUrlError: `${config.frontend_urls.frontend_url_test_payment}/payment-failed?orderId=${newOrder._id}`,
    };

    const response = await axios.post(config.reduniq.api_url as string, orderPayload);
    const { result, token, redirectUrl } = response.data;


    if (result.code === '00000000') {
      newOrder.transactionId = token;
      await newOrder.save({ session });

      await session.commitTransaction();

      return {
        redirectUrl: redirectUrl,
        paymentToken: token,
        adminInfo
      };
    } else {
      throw new Error('Payment initiation failed');
    }
  } catch (error: unknown) {
    await session.abortTransaction();
    const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
    throw new AppError(httpStatus.BAD_REQUEST, errorMessage);
  } finally {
    session.endSession();
  }
};

export const PaymentServices = {
  createReduniqPayment,
  handlePaymentFailure,
  createIngredientRequniqPayment
};
