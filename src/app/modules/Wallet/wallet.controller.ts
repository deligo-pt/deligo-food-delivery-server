import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthUser } from '../../constant/user.constant';
import { WalletServices } from './wallet.service';

// get all wallets controller
const getAllWallets = catchAsync(async (req, res) => {
  const result = await WalletServices.getAllWallets(
    req.query,
    req.user as AuthUser,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Wallets retrieved successfully',
    meta: result?.meta,
    data: result?.data,
  });
});

// get single wallet controller
const getSingleWallet = catchAsync(async (req, res) => {
  const walletId = req.params.walletId;
  const currentUser = req.user as AuthUser;
  const result = await WalletServices.getSingleWallet(walletId, currentUser);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Wallet retrieved successfully',
    data: result,
  });
});

// get my wallet controller
const getMyWallet = catchAsync(async (req, res) => {
  const currentUser = req.user as AuthUser;
  const result = await WalletServices.getMyWallet(currentUser);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Wallet retrieved successfully',
    data: result,
  });
});

export const WalletControllers = {
  getAllWallets,
  getSingleWallet,
  getMyWallet,
};
