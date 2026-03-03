import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthUser } from '../../constant/user.constant';
import { TransactionServices } from './transaction.service';

const getMyTransactions = catchAsync(async (req, res) => {
    const result = await TransactionServices.getMyTransactions(
        req.user as AuthUser
    );

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: 'Transactions fetched successfully',
        data: result,
    });
});


export const TransactionController = {
    getMyTransactions
};