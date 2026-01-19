import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TaxService } from './tax.service';

// create tax controller
const createTax = catchAsync(async (req, res) => {
  const result = await TaxService.createTax(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Tax created successfully',
    data: result,
  });
});

export const TaxController = {
  createTax,
};
