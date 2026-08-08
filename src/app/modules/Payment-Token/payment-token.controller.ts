import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PaymentTokenServices } from './payment-token.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

// save card standalone (profile management flow)
const createStandaloneCardToken = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await PaymentTokenServices.createStandaloneCardToken(
    req.body,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Saved a new payment card',
    target: `Customer #${currentUser?.userId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// list saved cards
const listSavedCards = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await PaymentTokenServices.listSavedCards(currentUser);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// disable / remove a saved card
const disableSavedCard = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await PaymentTokenServices.disableSavedCard(
    currentUser,
    req.params.paymentTokenId,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Removed a saved payment card',
    target: `Payment Token #${req.params.paymentTokenId}`,
    type: 'WARNING',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

export const PaymentTokenController = {
  createStandaloneCardToken,
  listSavedCards,
  disableSavedCard,
};
