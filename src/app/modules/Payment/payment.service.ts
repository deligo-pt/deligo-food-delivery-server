import Stripe from 'stripe';
import config from '../../config';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { CheckoutSummary } from '../Order/checkoutSummary.model';

const stripe = new Stripe(config.stripe_secret_key as string);

const createPaymentSession = async (checkoutSummaryId: string) => {
  if (!checkoutSummaryId) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Checkout summary not found');
  }
  const summary = await CheckoutSummary.findById({ _id: checkoutSummaryId });
  console.log({ summary });
  if (!summary) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Checkout summary not found');
  }
  // const checkoutData = await getCheckoutSummary(checkoutSummaryId);

  // const session = await stripe.checkout.sessions.create({
  //   mode: 'payment',
  //   payment_method_types: ['card'],

  //   line_items: checkoutData.items.map((item: TCheckoutItem) => ({
  //     price_data: {
  //       currency: 'eur',
  //       product_data: { name: item.name },
  //       unit_amount: Math.round(item.price * 100),
  //     },
  //     quantity: item.quantity,
  //   })),

  //   success_url: `${config.frontend_url}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
  //   cancel_url: `${config.frontend_url}/payment-cancel`,

  //   metadata: {
  //     customerId,
  //     checkoutData: JSON.stringify(checkoutData),
  //   },
  // });

  // return { url: session.url };
};

export const PaymentServices = {
  createPaymentSession,
};
