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

// update tax controller
const updateTax = catchAsync(async (req, res) => {
  const { taxId } = req.params;
  const result = await TaxService.updateTax(taxId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tax updated successfully',
    data: result,
  });
});

// get all taxes controller
const getAllTaxes = catchAsync(async (req, res) => {
  const result = await TaxService.getAllTaxes(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Taxes retrieved successfully',
    data: result,
  });
});

// get single tax controller
const getSingleTax = catchAsync(async (req, res) => {
  const { taxId } = req.params;
  const result = await TaxService.getSingleTax(taxId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tax retrieved successfully',
    data: result,
  });
});

export const TaxController = {
  createTax,
  updateTax,
  getAllTaxes,
  getSingleTax,
};
