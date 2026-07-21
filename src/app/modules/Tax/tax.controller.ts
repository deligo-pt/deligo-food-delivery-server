import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { TaxService } from './tax.service';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { formatTaxResponse } from './tax.utils';
import { TMessageKey } from '../../errors/messages';

// create tax controller
const createTax = catchAsync(async (req, res) => {
  const result = await TaxService.createTax(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// update tax controller
const updateTax = catchAsync(async (req, res) => {
  const { taxId } = req.params;
  const result = await TaxService.updateTax(taxId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// get all taxes controller
const getAllTaxes = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await TaxService.getAllTaxes(req.query);

  let formattedData;
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role);
  if (isAdmin) {
    formattedData = result.data;
  } else {
    formattedData = formatTaxResponse(result.data, req.lang);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    meta: result?.meta,
    data: formattedData,
  });
});

// get single tax controller
const getSingleTax = catchAsync(async (req, res) => {
  const { taxId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await TaxService.getSingleTax(taxId);

  let formattedData;
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role);
  if (isAdmin) {
    formattedData = result.data;
  } else {
    formattedData = formatTaxResponse(result.data, req.lang);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: formattedData,
  });
});

// soft delete tax controller
const softDeleteTax = catchAsync(async (req, res) => {
  const { taxId } = req.params;
  const result = await TaxService.softDeleteTax(taxId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// permanent delete tax controller
const permanentDeleteTax = catchAsync(async (req, res) => {
  const { taxId } = req.params;
  const result = await TaxService.permanentDeleteTax(taxId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

export const TaxController = {
  createTax,
  updateTax,
  getAllTaxes,
  getSingleTax,
  softDeleteTax,
  permanentDeleteTax,
};
