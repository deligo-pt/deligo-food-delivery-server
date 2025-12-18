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

  // Create PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(summary.finalAmount * 100),
    currency: 'eur',
    description: 'Order Payment',
    metadata: {
      checkoutSummaryId: checkoutSummaryId,
      customerId: summary.customerId.toString(),
      vendorId: summary.vendorId.toString(),
    },
    receipt_email: summary.customerEmail,
    payment_method_types: ['card'],
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
};

export const PaymentServices = {
  createPaymentIntent,
};
