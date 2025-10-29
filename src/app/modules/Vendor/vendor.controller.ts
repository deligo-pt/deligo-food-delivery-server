import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { VendorServices } from './vendor.service';

// Vendor Update Controller
const vendorUpdate = catchAsync(async (req, res) => {
  const result = await VendorServices.vendorUpdate(req.params.id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Vendor updated successfully',
    data: result,
  });
});

// vendor delete controller
const vendorDelete = catchAsync(async (req, res) => {
  const result = await VendorServices.vendorDelete(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

export const VendorControllers = {
  vendorUpdate,
  vendorDelete,
};
