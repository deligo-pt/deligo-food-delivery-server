// i want to use stripe card payment gateway here
import { Stripe } from 'stripe';
import config from '../../config';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

const stripe = new Stripe(config.stripe_secret_key as string);
// payment service to process payment
const processPayment = async (
  amount: number,
  currency: string,
  paymentMethodType: 'card' | 'mb_way',
  returnUrl?: string
) => {
  const finalAmount = amount * 100; // Convert to smallest currency unit
  if (finalAmount < 50) {
    throw new Error('Amount must be at least 0.50 in the selected currency.');
  }

  const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
    amount: finalAmount,
    currency,
    payment_method_types: [paymentMethodType],
  };

  // MB way requires a return_url
  if (paymentMethodType === 'mb_way') {
    if (!returnUrl) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Return URL is required for MB Way payments.'
      );
    }
    paymentIntentParams.confirm = true;
    paymentIntentParams.return_url = returnUrl;
  } else if (paymentMethodType === 'card') {
    paymentIntentParams.automatic_payment_methods = {
      enabled: true,
      allow_redirects: 'never',
    };
  }

  const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
  console.log(paymentIntent);
  return paymentIntent;
};
export const PaymentServices = {
  processPayment,
};
