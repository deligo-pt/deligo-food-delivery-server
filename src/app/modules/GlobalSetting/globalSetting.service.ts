import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { AuthUser } from '../../constant/user.constant';
import { TGlobalSettings } from './globalSetting.interface';
import { GlobalSettings } from './globalSetting.model';

// create global settings service
const createGlobalSettings = async (
  payload: Partial<TGlobalSettings>,
  currentUser: AuthUser
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${currentUser.status}`
    );
  }

  // --------------------------------------------------
  // Ensure only ONE settings document exists
  // --------------------------------------------------
  const existingSettings = await GlobalSettings.findOne();
  if (existingSettings) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Global settings already exist. Please update instead.'
    );
  }

  // --------------------------------------------------
  // Basic sanity validations
  // --------------------------------------------------
  if (
    payload.platformCommissionPercent !== undefined &&
    (payload.platformCommissionPercent < 0 ||
      payload.platformCommissionPercent > 100)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Platform commission must be between 0 and 100'
    );
  }

  if (
    payload.maxDiscountPercent !== undefined &&
    (payload.maxDiscountPercent < 0 || payload.maxDiscountPercent > 100)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Max discount percent must be between 0 and 100'
    );
  }

  if (
    payload.deliveryPartnerCommissionPercent !== undefined &&
    (payload.deliveryPartnerCommissionPercent < 0 ||
      payload.deliveryPartnerCommissionPercent > 100)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Delivery partner commission must be between 0 and 100'
    );
  }

  // --------------------------------------------------
  // Meta info
  // --------------------------------------------------
  payload.updatedBy = currentUser._id.toString();

  // --------------------------------------------------
  // Create global settings
  // --------------------------------------------------
  const settings = await GlobalSettings.create(payload);

  return settings;
};

// update global settings service
const updateGlobalSettings = async (
  payload: Partial<TGlobalSettings>,
  currentUser: AuthUser
) => {
  if (!['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only admin can update global settings'
    );
  }

  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${currentUser.status}`
    );
  }

  // --------------------------------------------------
  // Find existing settings (must exist)
  // --------------------------------------------------
  const existingSettings = await GlobalSettings.findOne();

  if (!existingSettings) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Global settings not found. Please create first.'
    );
  }

  // --------------------------------------------------
  // Cross-field business validations (important)
  // --------------------------------------------------
  if (
    payload.platformCommissionPercent !== undefined &&
    (payload.platformCommissionPercent < 0 ||
      payload.platformCommissionPercent > 100)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Platform commission must be between 0 and 100'
    );
  }

  if (
    payload.maxDiscountPercent !== undefined &&
    (payload.maxDiscountPercent < 0 || payload.maxDiscountPercent > 100)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Max discount percent must be between 0 and 100'
    );
  }

  if (
    payload.freeDeliveryAbove !== undefined &&
    payload.freeDeliveryAbove < 0
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Free delivery amount cannot be negative'
    );
  }

  // --------------------------------------------------
  // Maintenance mode sanity
  // --------------------------------------------------
  if (
    payload.isPlatformLive === false &&
    !payload.maintenanceMessage &&
    !existingSettings.maintenanceMessage
  ) {
    payload.maintenanceMessage =
      'We are under maintenance. Please try again later.';
  }

  // --------------------------------------------------
  // Meta info
  // --------------------------------------------------
  payload.updatedBy = currentUser._id.toString();

  // --------------------------------------------------
  // Update settings (single document)
  // --------------------------------------------------
  const updatedSettings = await GlobalSettings.findOneAndUpdate({}, payload, {
    new: true,
    runValidators: true,
  });

  return updatedSettings;
};

const getGlobalSettingsForAdmin = async (currentUser: AuthUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${currentUser.status}`
    );
  }

  if (!['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only admin can access global settings'
    );
  }

  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${currentUser.status}`
    );
  }

  // --------------------------------------------------
  // Fetch settings
  // --------------------------------------------------
  const settings = await GlobalSettings.findOne().lean();

  if (!settings) {
    throw new AppError(httpStatus.NOT_FOUND, 'Global settings not found');
  }

  return settings;
};

// get per meter rate
const getPerMeterRate = async () => {
  const result = await GlobalSettings.findOne({}).select('deliveryChargePerKm');
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Global settings not found');
  }
  const perMeter = result?.deliveryChargePerKm / 1000;
  return perMeter;
};

export const GlobalSettingsService = {
  createGlobalSettings,
  updateGlobalSettings,
  getGlobalSettingsForAdmin,
  getPerMeterRate,
};
