import { Agreement } from './agreement.model';
import {
  AGREEMENT_STATUS,
  TInitiateAgreementPayload,
} from './agreement.interface';
import { agreementPdfService } from './agreement.pdf.service';
import { saveSignatureImage } from './agreement.utils';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import generateOtp from '../../utils/generateOtp';
import { EmailHelper } from '../../utils/emailSender';
import { RedisService } from '../../config/redis';

const initiateAgreement = async (payload: TInitiateAgreementPayload) => {
  const normalizedEmail = payload.email.toLowerCase();

  // 1. Check if agreement already exists
  const existingAgreement = await Agreement.findOne({
    email: normalizedEmail,
  });

  if (existingAgreement) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'An agreement already exists for this email.',
    );
  }

  // 2. Create agreement with pending verification status
  const agreement = await Agreement.create({
    ...payload,
    email: normalizedEmail,
    status: AGREEMENT_STATUS.PENDING_VERIFICATION,
    isEmailVerified: false,
    draftPdfPath: null,
  });

  // 3. Generate OTP
  const { otp } = generateOtp();

  // 4. Save OTP in Redis (10 minutes)
  await RedisService.set(`agreement-otp:${agreement.email}`, otp, 600);

  // 5. Generate email HTML from template
  const html = await EmailHelper.createEmailContent(
    {
      establishmentName: agreement.establishmentName,
      otp,
      expiryMinutes: 10,
    },
    'agreement-otp',
  );

  // 6. Send email
  await EmailHelper.sendEmail(
    normalizedEmail,
    html,
    'DeliGo Email Verification Code',
  );

  // 7. Return response
  return {
    message: 'Verification code sent successfully.',
    data: {
      agreementId: agreement._id,
      email: agreement.email,
      status: agreement.status,
    },
  };
};

// Verify Agreement OTP
const verifyAgreementOtp = async (payload: { email: string; otp: string }) => {
  const { email, otp } = payload;
  const normalizedEmail = email.toLowerCase();
  // 1. Validate input
  if (!email || !otp) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Agreement Email and OTP are required',
    );
  }

  // 2. Find agreement
  const agreement = await Agreement.findOne({ email: normalizedEmail });

  if (!agreement) {
    throw new AppError(httpStatus.NOT_FOUND, 'Agreement not found');
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
  const draftPdfPath = await agreementPdfService.generateDraftPdf(
    {
      establishmentName: agreement.establishmentName,
      email: agreement.email,
      contactNumber: agreement.contactNumber,
      nif: agreement.nif,
    },
    agreement._id.toString(),
  );

  // 9. Update agreement
  agreement.draftPdfPath = draftPdfPath;
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
const resendAgreementOtp = async (email: string) => {
  // 1. Validate input
  if (!email) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Agreement Email is required');
  }
  const normalizedEmail = email.toLowerCase();

  // 2. Find agreement
  const agreement = await Agreement.findOne({ email: normalizedEmail });

  if (!agreement) {
    throw new AppError(httpStatus.NOT_FOUND, 'Agreement not found');
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

const signAgreement = async (agreementId: string, signatureImage: string) => {
  const agreement = await Agreement.findById(agreementId);

  if (!agreement) {
    throw new AppError(httpStatus.NOT_FOUND, 'Agreement not found');
  }

  if (!agreement.isEmailVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Please verify your email first',
    );
  }

  // Save signature file (optional, for record keeping)
  const signaturePath = await saveSignatureImage(
    signatureImage,
    agreement._id.toString(),
  );

  // IMPORTANT: Pass the ORIGINAL Base64 string to the PDF service
  const signedPdfPath = await agreementPdfService.generateSignedPdf(
    {
      establishmentName: agreement.establishmentName,
      email: agreement.email,
      contactNumber: agreement.contactNumber,
      nif: agreement.nif,
      signatureImage, // <-- Base64 Data URL
    },
    agreement._id.toString(),
  );

  agreement.signaturePath = signaturePath;
  agreement.signedPdfPath = signedPdfPath;
  agreement.status = AGREEMENT_STATUS.SIGNED;
  agreement.signedAt = new Date();

  await agreement.save();

  return {
    agreementId: agreement._id,
    signedPdfPath,
    status: agreement.status,
  };
};

const getAgreementById = async (agreementId: string) => {
  const agreement = await Agreement.findById(agreementId);

  if (!agreement) {
    throw new AppError(httpStatus.NOT_FOUND, 'Agreement not found');
  }

  return {
    message: 'Agreement retrieved successfully',
    data: agreement,
  };
};

export const AgreementService = {
  initiateAgreement,
  verifyAgreementOtp,
  resendAgreementOtp,
  getAgreementById,
  signAgreement,
};
