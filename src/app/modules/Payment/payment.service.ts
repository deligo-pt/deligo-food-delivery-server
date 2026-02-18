import axios from 'axios';
import Stripe from 'stripe';
import config from '../../config';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { CheckoutSummary } from '../Checkout/checkout.model';

export const stripe = new Stripe(config.stripe.stripe_secret_key as string);

// create stripe payment intent service
const createPaymentIntent = async (checkoutSummaryId: string) => {
  if (!checkoutSummaryId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Checkout summary not found');
  }

  const summary = await CheckoutSummary.findById(checkoutSummaryId);
  if (!summary) {
    throw new AppError(httpStatus.NOT_FOUND, 'Checkout summary not found');
  }

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

const createReduniqPayment = async (checkoutSummaryId: string) => {
  const summary = await CheckoutSummary.findById(checkoutSummaryId);
  if (!summary) throw new AppError(httpStatus.NOT_FOUND, 'Summary not found');

  if (!process.env.REDUNIQ_API_URL) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Reduniq API URL is not configured',
    );
  }

  const payload = {
    method: 'initPayment',
    api: {
      username: process.env.REDUNIQ_USERNAME,
      password: process.env.REDUNIQ_PASSWORD,
    },
    payment: {
      amount: Math.round(summary.payoutSummary.grandTotal * 100),
      action: 101, // 101 means immediate sale
      currency: '978', // EUR
      description: 'Order Payment',
    },
    order: {
      ref: checkoutSummaryId,
      amount: Math.round(summary.payoutSummary.grandTotal * 100),
      date: new Date().toISOString().slice(0, 19).replace('T', ' '),
    },
    returnUrlOk: `${process.env.FRONTEND_URL}/payment-success?token={token}&summaryId=${checkoutSummaryId}`,
    returnUrlError: `${process.env.FRONTEND_URL}/payment-failed?summaryId=${checkoutSummaryId}`,
    languageCode: 'pt',
  };

  const response = await axios.post(process.env.REDUNIQ_API_URL, payload);
  const { result, token, redirectUrl } = response.data;

  if (result.code !== '00000000') {
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
