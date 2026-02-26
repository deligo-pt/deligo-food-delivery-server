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

export const WalletControllers = {
  getAllWallets,
};
