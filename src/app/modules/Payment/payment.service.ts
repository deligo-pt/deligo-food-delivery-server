import Stripe from 'stripe';
import config from '../../config';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { CheckoutSummary } from '../Checkout/checkout.model';

export const stripe = new Stripe(config.stripe_secret_key as string);

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
    amount: Math.round(summary.subTotal * 100),
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
  const paymentIntent = await stripe.paymentIntents.create(
    paymentIntentPayload
  );

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
};

export const PaymentServices = {
  createPaymentIntent,
};
