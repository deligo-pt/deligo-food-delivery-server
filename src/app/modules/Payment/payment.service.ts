/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import config from '../../config';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { CheckoutSummary } from '../Checkout/checkout.model';
// create reduniq payment intent service
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
  createReduniqPayment,
};
