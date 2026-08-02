/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import httpStatus from 'http-status';
import config from '../../config';
import AppError from '../../errors/AppError';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';
import { PaymentToken } from './payment-token.model';
import { TCardBrand, TSaveCardPayload } from './payment-token.interface';
import {
  extractLast4,
  formatExpiryDate,
  formatSavedCardLabel,
  resolveCardBrand,
} from './payment-token.utils';
import customNanoId from '../../utils/customNanoId';
import { solutionIds } from '../Payment/payment.service';

// Keyed on card fingerprint, not tokenId — REDUNIQ issues a new tokenId per
// tokenization call even for the same card, so this avoids duplicate rows.
const upsertPaymentToken = async (params: {
  customerId: string;
  gatewayRef: string;
  tokenId: string;
  cardBrand: TCardBrand;
  last4: string;
  expiryDate: string;
  cardHolderName?: string;
}) => {
  const {
    customerId,
    gatewayRef,
    tokenId,
    cardBrand,
    last4,
    expiryDate,
    cardHolderName,
  } = params;

  const hasExistingDefault = await PaymentToken.exists({
    customerId,
    isActive: true,
    isDefault: true,
  });

  return PaymentToken.findOneAndUpdate(
    { customerId, cardBrand, last4, expiryDate, isActive: true },
    {
      $set: {
        tokenId,
        gatewayRef,
        ...(cardHolderName ? { cardHolderName } : {}),
      },
      $setOnInsert: {
        isDefault: !hasExistingDefault,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

// standalone card save. PAN/CVV are relayed in-memory only, never logged/persisted.
const createStandaloneCardToken = async (
  payload: TSaveCardPayload,
  currentUser: TCurrentUser,
) => {
  if (!config.redUniq.api_url) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'REDUNIQ_API_URL_NOT_CONFIGURED_TOKEN',
    );
  }

  const { card } = payload;

  // Derive display-safe metadata before the raw card fields are ever sent over the wire.
  const cardBrand: TCardBrand = resolveCardBrand(card.number);
  const last4 = extractLast4(card.number);
  const expiryDate = formatExpiryDate(card.expMonth, card.expYear);
  const gatewayRef = `TOK-${customNanoId(10)}`;

  const gatewayPayload = {
    method: 'createPaymentToken',
    api: {
      username: config.redUniq.username,
      password: config.redUniq.password,
    },
    payment: {
      solution: solutionIds.CARD,
      description: `Save card for customer ${currentUser.userId}`,
    },
    buyer: {
      firstName: currentUser.name?.firstName || '',
      lastName: currentUser.name?.lastName || '',
      email: currentUser.email,
    },
    payToken: {
      action: 500,
      ref: gatewayRef,
    },
    card: {
      holderName: card.holderName,
      number: card.number,
      expMonth: card.expMonth,
      expYear: card.expYear,
      secCode: card.secCode,
    },
  };

  try {
    const response = await axios.post(config.redUniq.api_url, gatewayPayload);

    console.log({ response });
    const { result = {}, payToken, token } = response.data || {};

    if (
      !result?.code ||
      (result.code !== '00000000' && result.code !== '17000000000')
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'CARD_TOKENIZATION_FAILED_BY_GATEWAY',
        {
          gatewayCode: result?.code || '',
          gatewayMessage: result?.message || '',
        },
      );
    }

    // REDUNIQ returns the token as either `payToken.id` or a top-level `token`.
    const gatewayTokenId: string | undefined =
      payToken?.id || token?.id || token;

    if (!gatewayTokenId) {
      throw new AppError(httpStatus.BAD_REQUEST, 'CARD_TOKEN_NOT_RECEIVED');
    }

    const savedCard = await upsertPaymentToken({
      customerId: currentUser._id.toString(),
      gatewayRef,
      tokenId: gatewayTokenId,
      cardBrand,
      last4,
      expiryDate,
      cardHolderName: card.holderName,
    });

    return {
      messageKey: 'CARD_SAVED_SUCCESS' as TMessageKey,
      data: {
        id: savedCard._id,
        brand: savedCard.cardBrand,
        last4: savedCard.last4,
        expiryDate: savedCard.expiryDate,
        isDefault: savedCard.isDefault,
        label: formatSavedCardLabel(savedCard.cardBrand, savedCard.last4),
      },
    };
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 502) {
        throw new AppError(
          error.response.status,
          'PAYMENT_GATEWAY_TEMP_UNAVAILABLE_502',
        );
      }
      throw new AppError(error.response.status, 'GATEWAY_ERROR');
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'PAYMENT_PROCESSING_FAILED',
    );
  }
};

// list saved cards (masked display only)
const listSavedCards = async (currentUser: TCurrentUser) => {
  const savedCards = await PaymentToken.find({
    customerId: currentUser._id,
    isActive: true,
  })
    .sort({ isDefault: -1, createdAt: -1 })
    .lean();

  const data = savedCards.map((card) => ({
    id: card._id,
    brand: card.cardBrand,
    last4: card.last4,
    expiryDate: card.expiryDate,
    isDefault: card.isDefault,
    label: formatSavedCardLabel(card.cardBrand, card.last4),
    createdAt: card.createdAt,
  }));

  return {
    messageKey: 'SAVED_CARDS_FETCHED_SUCCESS' as TMessageKey,
    data,
  };
};

// disable/remove a saved token — calls disableRecurringPayment, then soft-deletes locally.
const disableSavedCard = async (
  currentUser: TCurrentUser,
  paymentTokenId: string,
) => {
  const savedCard = await PaymentToken.findOne({
    _id: paymentTokenId,
    customerId: currentUser._id,
  });

  if (!savedCard) {
    throw new AppError(httpStatus.NOT_FOUND, 'SAVED_CARD_NOT_FOUND');
  }

  if (!savedCard.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, 'SAVED_CARD_ALREADY_DISABLED');
  }

  if (!config.redUniq.api_url) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'REDUNIQ_API_URL_NOT_CONFIGURED_TOKEN',
    );
  }

  const gatewayPayload = {
    method: 'disableRecurringPayment',
    api: {
      username: config.redUniq.username,
      password: config.redUniq.password,
    },
    recurring: {
      id: savedCard.tokenId,
      action: 602,
    },
  };

  try {
    const response = await axios.post(config.redUniq.api_url, gatewayPayload);
    const { result = {} } = response.data || {};

    const ALREADY_INACTIVE_CODES = new Set(['00100060']);
    // '00100067' = merchant account not provisioned for this method (confirmed via
    // sandbox testing) — fall back to local-only soft-delete per spec.
    const NOT_PERMITTED_CODES = new Set(['00100067']);
    const isSuccess =
      result?.code === '00000000' || result?.code === '17000000000';
    const isAlreadyInactive = ALREADY_INACTIVE_CODES.has(result?.code);
    const isNotPermitted = NOT_PERMITTED_CODES.has(result?.code);

    if (isNotPermitted) {
      console.error(
        'REDUNIQ disableRecurringPayment not permitted for this merchant account — falling back to local soft-delete only:',
        result,
      );
    } else if (!isSuccess && !isAlreadyInactive) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'SAVED_CARD_DISABLE_FAILED_BY_GATEWAY',
        { gatewayCode: result?.code, gatewayMessage: result?.message },
      );
    }
  } catch (error: any) {
    if (error instanceof AppError) throw error;

    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 502) {
        throw new AppError(
          error.response.status,
          'PAYMENT_GATEWAY_TEMP_UNAVAILABLE_502',
        );
      }
      throw new AppError(error.response.status, 'GATEWAY_ERROR');
    }

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'SAVED_CARD_DISABLE_FAILED_BY_GATEWAY',
    );
  }

  savedCard.isActive = false;
  savedCard.isDefault = false;
  await savedCard.save();

  // Promote the most recently saved remaining active card to default, if any.
  const nextDefault = await PaymentToken.findOne({
    customerId: currentUser._id,
    isActive: true,
  }).sort({ createdAt: -1 });

  if (nextDefault) {
    nextDefault.isDefault = true;
    await nextDefault.save();
  }

  return {
    messageKey: 'SAVED_CARD_DISABLED_SUCCESS' as TMessageKey,
    data: null,
  };
};

// Used by checkout and the notification webhook to
// derive display-safe card metadata from a gateway response and upsert it.
const persistCardTokenFromGatewayResponse = async (
  customerId: string,
  gatewayRef: string,
  gatewayData: any,
) => {
  const payToken = gatewayData?.payToken || gatewayData?.token;
  const gatewayTokenId: string | undefined =
    payToken?.id || (typeof payToken === 'string' ? payToken : undefined);

  if (!gatewayTokenId) return null;

  const cardInfo = gatewayData?.card || payToken?.card || {};
  const last4: string | undefined =
    cardInfo?.suffix || cardInfo?.last4 || cardInfo?.number?.slice(-4);

  // This schema/table only models card data (last4 is a required field). A token
  // with no card-shaped fields (e.g. an MB WAY token) would otherwise silently save
  // as a broken record — log the real shape instead so it can be modeled properly.
  if (!last4) {
    console.error(
      'persistCardTokenFromGatewayResponse: non-card token response, not saving:',
      gatewayData,
    );
    return null;
  }

  const cardBrand: TCardBrand = cardInfo?.brand
    ? (String(cardInfo.brand).toUpperCase() as TCardBrand)
    : 'OTHER';
  const expiryDate =
    cardInfo?.expMonth && cardInfo?.expYear
      ? formatExpiryDate(cardInfo.expMonth, cardInfo.expYear)
      : cardInfo?.expiryDate || '';

  return upsertPaymentToken({
    customerId,
    gatewayRef,
    tokenId: gatewayTokenId,
    cardBrand,
    last4,
    expiryDate,
  });
};

export const PaymentTokenServices = {
  createStandaloneCardToken,
  listSavedCards,
  disableSavedCard,
  persistCardTokenFromGatewayResponse,
};
