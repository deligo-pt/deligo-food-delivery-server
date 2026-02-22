import axios from 'axios';
import Stripe from 'stripe';
import config from '../../config';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { CheckoutSummary } from '../Checkout/checkout.model';

export const stripe = new Stripe(config.stripe.stripe_secret_key as string);

// create stripe payment intent service
const createPaymentIntent = async (
  checkoutSummaryId: string,
  paymentMethod?: 'CARD' | 'MB_WAY',
) => {
  if (!checkoutSummaryId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Checkout summary not found');
  }

  const summary = await CheckoutSummary.findById(checkoutSummaryId);
  if (!summary) {
    throw new AppError(httpStatus.NOT_FOUND, 'Checkout summary not found');
  }

  if (summary.isConvertedToOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Checkout summary already converted to order',
    );
  }

  summary.paymentMethod = paymentMethod;
  await summary.save();

  const paymentIntentPayload: Stripe.PaymentIntentCreateParams = {
    amount: Math.round(summary.payoutSummary.grandTotal * 100),
    currency: 'eur',
    description: 'Order Payment',
    metadata: {
      checkoutSummaryId: checkoutSummaryId,
      customerId: summary.customerId.toString(),
      vendorId: summary.vendorId.toString(),
    },
    payment_method_types: ['card'],
  };

  if (summary?.customerEmail) {
    paymentIntentPayload.receipt_email = summary.customerEmail;
  }

  // Create PaymentIntent
  const paymentIntent =
    await stripe.paymentIntents.create(paymentIntentPayload);

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
};

const createReduniqPayment = async (
  checkoutSummaryId: string,
  paymentMethod: 'CARD' | 'MB_WAY' | 'APPLE_PAY' | 'OTHER',
) => {
  const summary = await CheckoutSummary.findById(checkoutSummaryId);
  if (!summary) throw new AppError(httpStatus.NOT_FOUND, 'Summary not found');

  if (summary.isConvertedToOrder) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Checkout summary already converted to order',
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

  console.log(response.data);

  if (response.data.token) {
    summary.paymentMethod = paymentMethod;
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

export const PaymentServices = {
  createPaymentIntent,
  createReduniqPayment,
};
