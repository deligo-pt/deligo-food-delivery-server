import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { WalletServices } from './wallet.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';

// get all wallets controller
const getAllWallets = catchAsync(async (req, res) => {
  const result = await WalletServices.getAllWallets(
    req.query,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    meta: result?.meta,
    data: result?.data,
  });
});

// get single wallet controller
const getSingleWallet = catchAsync(async (req, res) => {
  const walletId = req.params.walletId;
  const currentUser = req.user as TCurrentUser;
  const result = await WalletServices.getSingleWallet(walletId, currentUser);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// get my wallet controller
const getMyWallet = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await WalletServices.getMyWallet(currentUser);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

export const WalletControllers = {
  getAllWallets,
  getSingleWallet,
  getMyWallet,
};
