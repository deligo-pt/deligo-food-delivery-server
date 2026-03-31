/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import config from '../../config';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { CheckoutSummary } from '../Checkout/checkout.model';
import { AuthUser } from '../../constant/user.constant';
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
    //returnUrlOk: `deligocustomer://payment-result?status=success&summaryId=${checkoutSummaryId}`,
    //returnUrlError: `deligocustomer://payment-result?status=failed&summaryId=${checkoutSummaryId}`,
    returnUrlOk: `${config.frontend_urls.frontend_url_test_payment}/payment-success?summaryId=${checkoutSummaryId}`,
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

export const PaymentServices = {
  createReduniqPayment,
  handlePaymentFailure,
};
