import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TransactionServices } from './transaction.service';
import { TAuthUser } from '../AuthUser/authUser.interface';

// get all transactions
const getMyTransactions = catchAsync(async (req, res) => {
  const result = await TransactionServices.getMyTransactions(
    req.user as TAuthUser,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Transactions fetched successfully',
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
    message: 'Transactions fetched successfully',
    data: result,
  });
});

export const TransactionController = {
  getMyTransactions,
  getTransactionById,
};
