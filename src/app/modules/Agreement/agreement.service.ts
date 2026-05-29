import { Agreement } from './agreement.model';
import {
  AGREEMENT_STATUS,
  TAgreementStatus,
  TInitiateAgreementPayload,
} from './agreement.interface';
import { agreementPdfService } from './agreement.pdf.service';
import { saveSignatureImage } from './agreement.utils';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import generateOtp from '../../utils/generateOtp';
import { EmailHelper } from '../../utils/emailSender';
import { RedisService } from '../../config/redis';
import { uploadLocalFileToCloudinary } from '../../utils/uploadToCloudinary';
import { sendAgreementSignedEmail } from '../../helpers/sendAgreementSignedEmail';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { TAuthUser } from '../AuthUser/authUser.interface';

const initiateAgreement = async (
  payload: TInitiateAgreementPayload,
  currentUser: TAuthUser,
) => {
  const normalizedEmail = payload.email.toLowerCase();

  // 1. Check if agreement already exists
  let agreement = await Agreement.findOne({
    email: normalizedEmail,
  });

  // 2. Statuses that should block creating/resending
  const blockedStatuses: TAgreementStatus[] = [
    AGREEMENT_STATUS.VERIFIED,
    AGREEMENT_STATUS.DRAFT,
    AGREEMENT_STATUS.SIGNED,
    AGREEMENT_STATUS.EMAILED,
  ];

  // 3. If agreement already exists and is verified/completed, block request
  if (
    agreement &&
    agreement.isEmailVerified &&
    blockedStatuses.includes(agreement.status)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'An agreement already exists for this email.',
    );
  }

  // 4. If agreement exists but email is not verified,
  // update the record and resend OTP
  if (agreement && !agreement.isEmailVerified) {
    agreement.establishmentName = payload.establishmentName;
    agreement.contactNumber = payload.contactNumber;
    agreement.nif = payload.nif;
    agreement.status = AGREEMENT_STATUS.PENDING_VERIFICATION;
    agreement.isEmailVerified = false;

    await agreement.save();
  } else if (!agreement) {
    // 5. Create new agreement if none exists
    agreement = await Agreement.create({
      ...payload,
      email: normalizedEmail,
      status: AGREEMENT_STATUS.PENDING_VERIFICATION,
      isEmailVerified: false,
      draftPdfPath: null,
      createdBy: currentUser._id,
    });
  }

  // At this point, agreement is guaranteed to exist
  if (!agreement) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create agreement.',
    );
  }

  // 6. Generate OTP
  const { otp } = generateOtp();

  // 7. Save OTP in Redis (10 minutes)
  await RedisService.set(`agreement-otp:${agreement.email}`, otp, 600);

  // 8. Generate email HTML
  const html = await EmailHelper.createEmailContent(
    {
      establishmentName: agreement.establishmentName,
      otp,
      date: new Date().toLocaleDateString('en-GB'),
      currentYear: new Date().getFullYear(),
    },
    'agreement-otp',
  );

  // 9. Send email
  await EmailHelper.sendEmail(
    agreement.email,
    html,
    'DeliGo Email Verification Code',
  );

  // 10. Return response
  return {
    message: 'Verification code sent successfully.',
    data: {
      agreementId: agreement._id,
      email: agreement.email,
      status: agreement.status,
      isEmailVerified: agreement.isEmailVerified,
    },
  };
};

// Verify Agreement OTP
const verifyAgreementOtp = async (
  payload: { email: string; otp: string },
  currentUser: TAuthUser,
) => {
  const { email, otp } = payload;
  const normalizedEmail = email.toLowerCase();
  // 1. Validate input
  if (!email || !otp) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Agreement Email and OTP are required',
    );
  }

  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(currentUser.role);

  // 2. Find agreement
  const agreement = await Agreement.findOne({ email: normalizedEmail });

  if (!agreement) {
    throw new AppError(httpStatus.NOT_FOUND, 'Agreement not found');
  }

  if (
    !isAdmin &&
    agreement?.createdBy?.toString() !== currentUser._id.toString()
  ) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'You are not authorized to perform this action',
    );
  }

  // 3. Check if already verified
  if (agreement.isEmailVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Email is already verified');
  }

  // 4. Get OTP from Redis
  const redisOtpKey = `agreement-otp:${normalizedEmail}`;
  const storedOtp = await RedisService.get<string>(redisOtpKey);

  // 5. Validate OTP
  if (!storedOtp || String(storedOtp) !== String(otp)) {
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP');
  }

  // 6. Remove OTP from Redis
  await RedisService.del(redisOtpKey);

  // 7. Mark email as verified
  agreement.isEmailVerified = true;
  agreement.emailVerifiedAt = new Date();
  agreement.status = AGREEMENT_STATUS.VERIFIED;

  // 8. Generate draft PDF
  const localDraftPdfPath = await agreementPdfService.generateDraftPdf(
    {
      establishmentName: agreement.establishmentName,
      email: agreement.email,
      contactNumber: agreement.contactNumber,
      nif: agreement.nif,
    },
    agreement._id.toString(),
  );

  const draftPdfUrl = await uploadLocalFileToCloudinary(
    localDraftPdfPath,
    'agreements',
    `draft-${agreement._id}`,
    'raw',
  );

  agreement.draftPdfPath = draftPdfUrl;
  // 9. Update agreement
  agreement.status = AGREEMENT_STATUS.DRAFT;

  await agreement.save();

  // 10. Return response
  return {
    message: 'Email verified and agreement generated successfully',
    data: {
      agreementId: agreement._id,
      email: agreement.email,
      isEmailVerified: agreement.isEmailVerified,
      status: agreement.status,
      draftPdfPath: agreement.draftPdfPath,
    },
  };
};

// Resend Agreement OTP
const resendAgreementOtp = async (email: string, currentUser: TAuthUser) => {
  // 1. Validate input
  if (!email) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Agreement Email is required');
  }
  const normalizedEmail = email.toLowerCase();

  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(currentUser.role);

  // 2. Find agreement
  const agreement = await Agreement.findOne({ email: normalizedEmail });

  if (!agreement) {
    throw new AppError(httpStatus.NOT_FOUND, 'Agreement not found');
  }

  if (
    !isAdmin &&
    agreement?.createdBy?.toString() !== currentUser._id.toString()
  ) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'You are not authorized to perform this action',
    );
  }

  // 3. Prevent resend if already verified
  if (agreement.isEmailVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Email is already verified');
  }

  // 4. Generate new OTP
  const { otp } = generateOtp();

  // 5. Save OTP in Redis (5 minutes)
  const redisOtpKey = `agreement-otp:${normalizedEmail}`;
  await RedisService.set(redisOtpKey, otp, 300);

  // 6. Generate email template
  const emailHtml = await EmailHelper.createEmailContent(
    {
      otp,
      currentYear: new Date().getFullYear(),
      date: new Date().toDateString(),
      user: agreement.establishmentName,
    },
    'agreement-otp',
  );

  // 7. Send email
  await EmailHelper.sendEmail(
    normalizedEmail,
    emailHtml,
    'Verify your email for DeliGo Agreement',
  );

  // 8. Return response
  return {
    message: 'OTP resent successfully. Please check your email.',
    data: {
      agreementId: agreement._id,
      email: normalizedEmail,
    },
  };
};

const signAgreement = async (
  agreementId: string,
  signatureImage: string,
  currentUser: TAuthUser,
) => {
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(currentUser.role);
  const agreement = await Agreement.findById(agreementId);

  if (!agreement) {
    throw new AppError(httpStatus.NOT_FOUND, 'Agreement not found');
  }

  if (
    !isAdmin &&
    agreement?.createdBy?.toString() !== currentUser._id.toString()
  ) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'You are not authorized to perform this action',
    );
  }

  if (agreement.status !== AGREEMENT_STATUS.DRAFT) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Agreement is not ready for signing',
    );
  }

  if (!agreement.isEmailVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please verify your email first',
    );
  }

  const localSignaturePath = await saveSignatureImage(
    signatureImage,
    agreement._id.toString(),
  );

  const signatureUrl = await uploadLocalFileToCloudinary(
    localSignaturePath,
    'signatures',
    `signature-${agreement._id}`,
    'image',
  );

  const localSignedPdfPath = await agreementPdfService.generateSignedPdf(
    {
      establishmentName: agreement.establishmentName,
      email: agreement.email,
      contactNumber: agreement.contactNumber,
      nif: agreement.nif,
      signatureImage,
    },
    agreement._id.toString(),
  );

  const signedPdfUrl = await uploadLocalFileToCloudinary(
    localSignedPdfPath,
    'agreements',
    `signed-${agreement._id}`,
    'raw',
  );

  agreement.signaturePath = signatureUrl;
  agreement.signedPdfPath = signedPdfUrl;
  agreement.status = AGREEMENT_STATUS.SIGNED;
  agreement.signedAt = new Date();

  await agreement.save();

  // Send final agreement email
  await sendAgreementSignedEmail({
    to: agreement.email,
    establishmentName: agreement.establishmentName,
    pdfUrl: agreement.signedPdfPath,
  });

  // Update email status
  agreement.status = AGREEMENT_STATUS.EMAILED;
  agreement.emailedAt = new Date();

  await agreement.save();

  return {
    agreementId: agreement._id,
    signedPdfPath: agreement.signedPdfPath,
    status: agreement.status,
  };
};

const getAgreementById = async (
  agreementId: string,
  currentUser: TAuthUser,
) => {
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(currentUser.role);
  const agreement = await Agreement.findById(agreementId);

  if (!agreement) {
    throw new AppError(httpStatus.NOT_FOUND, 'Agreement not found');
  }

  if (
    !isAdmin &&
    agreement?.createdBy?.toString() !== currentUser._id.toString()
  ) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'You are not authorized to view this agreement',
    );
  }

  return {
    message: 'Agreement retrieved successfully',
    data: agreement,
  };
};

const getAllAgreements = async (
  query: Record<string, unknown>,
  currentUser: TAuthUser,
) => {
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  if (!isAdmin) {
    query.createdBy = currentUser._id;
  }

  const agreements = new QueryBuilder(Agreement.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(['email', 'establishmentName']);

  const [meta, data] = await Promise.all([
    agreements.countTotal(),
    agreements.modelQuery,
  ]);

  return {
    message: 'Agreements retrieved successfully',
    data,
    meta,
  };
};

export const AgreementService = {
  initiateAgreement,
  verifyAgreementOtp,
  resendAgreementOtp,
  signAgreement,
  getAgreementById,
  getAllAgreements,
};
