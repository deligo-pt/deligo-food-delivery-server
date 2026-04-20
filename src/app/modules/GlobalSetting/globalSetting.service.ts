import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { AuthUser } from '../../constant/user.constant';
import { TGlobalSettings } from './globalSetting.interface';
import { GlobalSettings } from './globalSetting.model';
import { ClientSession } from 'mongoose';

// create global settings service
const createGlobalSettings = async (
  payload: Partial<TGlobalSettings>,
  currentUser: AuthUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${currentUser.status}`,
    );
  }

  // --------------------------------------------------
  // Ensure only ONE settings document exists
  // --------------------------------------------------
  const existingSettings = await GlobalSettings.findOne();
  if (existingSettings) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Global settings already exist. Please update instead.',
    );
  }

  // --------------------------------------------------
  // Basic sanity validations
  // --------------------------------------------------
  if (
    payload.commission?.platformPercent !== undefined &&
    (payload.commission?.platformPercent < 0 ||
      payload.commission?.platformPercent > 100)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Platform commission must be between 0 and 100',
    );
  }

  if (
    payload.system?.maxDiscountPercent !== undefined &&
    (payload.system?.maxDiscountPercent < 0 ||
      payload.system?.maxDiscountPercent > 100)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Max discount percent must be between 0 and 100',
    );
  }

  if (
    payload.commission?.deliveryPartnerPercent !== undefined &&
    (payload.commission?.deliveryPartnerPercent < 0 ||
      payload.commission?.deliveryPartnerPercent > 100)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Delivery partner commission must be between 0 and 100',
    );
  }

  // --------------------------------------------------
  // Meta info
  // --------------------------------------------------
  payload.meta = {
    ...payload.meta,
    updatedBy: currentUser._id,
  };

  // --------------------------------------------------
  // Create global settings
  // --------------------------------------------------
  const settings = await GlobalSettings.create(payload);

  return settings;
};

// update global settings service
const updateGlobalSettings = async (
  payload: Partial<TGlobalSettings>,
  currentUser: AuthUser,
) => {
  if (!['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only admin can update global settings',
    );
  }

  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${currentUser.status}`,
    );
  }

  // --------------------------------------------------
  // Find existing settings (must exist)
  // --------------------------------------------------
  const existingSettings = await GlobalSettings.findOne();

  if (!existingSettings) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Global settings not found. Please create first.',
    );
  }

  // --------------------------------------------------
  // Cross-field business validations (important)
  // --------------------------------------------------
  if (
    payload.commission?.platformPercent !== undefined &&
    (payload.commission?.platformPercent < 0 ||
      payload.commission?.platformPercent > 100)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Platform commission must be between 0 and 100',
    );
  }

  if (
    payload.system?.maxDiscountPercent !== undefined &&
    (payload.system?.maxDiscountPercent < 0 ||
      payload.system?.maxDiscountPercent > 100)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Max discount percent must be between 0 and 100',
    );
  }

  if (
    payload.delivery?.freeAbove !== undefined &&
    payload.delivery?.freeAbove < 0
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Free delivery amount cannot be negative',
    );
  }

  // --------------------------------------------------
  // Maintenance mode sanity
  // --------------------------------------------------
  if (
    payload.system?.isPlatformLive === false &&
    !payload.system?.maintenanceMessage &&
    !existingSettings.system?.maintenanceMessage
  ) {
    payload.system.maintenanceMessage =
      'We are under maintenance. Please try again later.';
  }

  // --------------------------------------------------
  // Meta info
  // --------------------------------------------------
  payload.meta = {
    ...payload.meta,
    updatedBy: currentUser._id,
  };

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
      `You are not approved. Status: ${currentUser.status}`,
    );
  }

  if (!['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'Only admin can access global settings',
    );
  }

  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Status: ${currentUser.status}`,
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

// get for checkout
const getGlobalSettings = async (session?: ClientSession) => {
  const result = await GlobalSettings.findOne({})
    .select('commission delivery order rewards')
    .session(session as ClientSession);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Global settings not found');
  }
  const perMeter = result?.delivery?.ChargePerKm / 1000;
  return {
    platformCommissionPercent: result?.commission?.platformPercent,
    platformCommissionVatRate: result?.commission?.platformVatRate,
    deliveryVatRate: result?.delivery?.vatRate,
    deliveryChargePerMeter: perMeter,
    fleetManagerCommissionPercent: result?.commission?.fleetManagerPercent,
    baseDeliveryCharge: result?.delivery?.baseCharge,
    customerNearestVendorRadiusKm: result?.order?.nearestVendorRadiusKm,
    rewards: result?.rewards,
  };
};

export const GlobalSettingsService = {
  createGlobalSettings,
  updateGlobalSettings,
  getGlobalSettingsForAdmin,
  getGlobalSettings,
};
