import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TransactionServices } from './transaction.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';

// get all transactions
const getMyTransactions = catchAsync(async (req, res) => {
  const result = await TransactionServices.getMyTransactions(
    req.user as TCurrentUser,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    meta: result?.meta,
    data: result?.data,
  });
});

// get transaction by transactionId
const getTransactionById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await TransactionServices.getTransactionById(id as string);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

export const TransactionController = {
  getMyTransactions,
  getTransactionById,
};
