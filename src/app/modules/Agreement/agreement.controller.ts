import { AgreementService } from './agreement.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';

const initiateAgreement = catchAsync(async (req, res) => {
  const payload = req.body;
  const result = await AgreementService.initiateAgreement(payload);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: result?.data,
  });
});

const verifyAgreementOtp = catchAsync(async (req, res) => {
  const result = await AgreementService.verifyAgreementOtp(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: result?.data,
  });
});

const resendAgreementOtp = catchAsync(async (req, res) => {
  const result = await AgreementService.resendAgreementOtp(req.body.email);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: result?.data,
  });
});

const signAgreement = catchAsync(async (req, res) => {
  const { agreementId } = req.params;
  const { signatureImage } = req.body;
  const result = await AgreementService.signAgreement(
    agreementId,
    signatureImage,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Agreement signed successfully',
    data: result,
  });
});

const getAgreementById = catchAsync(async (req, res) => {
  const result = await AgreementService.getAgreementById(
    req.params.agreementId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Agreement retrieved successfully',
    data: result,
  });
});

export const AgreementController = {
  initiateAgreement,
  verifyAgreementOtp,
  resendAgreementOtp,
  signAgreement,
  getAgreementById,
};
