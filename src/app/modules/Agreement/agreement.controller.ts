import { AgreementService } from './agreement.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';

const initiateAgreement = catchAsync(async (req, res) => {
  const payload = req.body;
  const result = await AgreementService.initiateAgreement(
    payload,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: result?.data,
  });
});

const verifyAgreementOtp = catchAsync(async (req, res) => {
  const result = await AgreementService.verifyAgreementOtp(
    req.body,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: result?.data,
  });
});

const resendAgreementOtp = catchAsync(async (req, res) => {
  const result = await AgreementService.resendAgreementOtp(
    req.body.email,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: result?.data,
  });
});

const signAgreement = catchAsync(async (req, res) => {
  const { agreementId } = req.params;
  const result = await AgreementService.signAgreement(
    agreementId,
    req.body,
    req.user as TCurrentUser,
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
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    data: result?.data,
  });
});

const getAllAgreements = catchAsync(async (req, res) => {
  const result = await AgreementService.getAllAgreements(
    req.query,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result?.message,
    meta: result?.meta,
    data: result?.data,
  });
});

export const AgreementController = {
  initiateAgreement,
  verifyAgreementOtp,
  resendAgreementOtp,
  signAgreement,
  getAgreementById,
  getAllAgreements,
};
