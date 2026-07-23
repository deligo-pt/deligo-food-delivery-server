import { AgreementService } from './agreement.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

const initiateAgreement = catchAsync(async (req, res) => {
  const payload = req.body;
  const currentUser = req.user as TCurrentUser;
  const result = await AgreementService.initiateAgreement(payload, currentUser);

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Initiated Agreement',
    target: payload?.establishmentName || payload?.email,
    type: 'INFO',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

const verifyAgreementOtp = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await AgreementService.verifyAgreementOtp(
    req.body,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Verified Agreement OTP',
    target: req.body?.email,
    type: 'INFO',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

const resendAgreementOtp = catchAsync(async (req, res) => {
  const currentUser = req.user as TCurrentUser;
  const result = await AgreementService.resendAgreementOtp(
    req.body.email,
    currentUser,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Resent Agreement OTP',
    target: req.body?.email,
    type: 'WARNING',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

const signAgreement = catchAsync(async (req, res) => {
  const { agreementId } = req.params;
  const currentUser = req.user as TCurrentUser;
  const result = await AgreementService.signAgreement(
    agreementId,
    req.body,
    currentUser,
  );

  // 👈 Activity Log Integration
  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Signed Agreement',
    target: `Agreement #${agreementId}`,
    type: 'INFO',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// GET Controller (No Log Needed)
const getAgreementById = catchAsync(async (req, res) => {
  const result = await AgreementService.getAgreementById(
    req.params.agreementId,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
    data: result?.data,
  });
});

// GET Controller (No Log Needed)
const getAllAgreements = catchAsync(async (req, res) => {
  const result = await AgreementService.getAllAgreements(
    req.query,
    req.user as TCurrentUser,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    variables: result?.variables,
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
