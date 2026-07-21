import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TGlobalSettings } from './globalSetting.interface';
import { GlobalSettings } from './globalSetting.model';
import { ClientSession } from 'mongoose';
import { flattenObject } from '../../utils/flattenObject';

// create global settings service
const createGlobalSettings = async (
  payload: Partial<TGlobalSettings>,
  currentUser: TCurrentUser,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'NOT_APPROVED_STATUS_TEMPLATE', {
      status: currentUser.status,
    });
  }

  // --------------------------------------------------
  // Ensure only ONE settings document exists
  // --------------------------------------------------
  const existingSettings = await GlobalSettings.findOne();
  if (existingSettings) {
    throw new AppError(
      httpStatus.CONFLICT,
      'SETTINGS_ALREADY_EXIST_UPDATE_INSTEAD',
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
      'PLATFORM_COMMISSION_RANGE_INVALID',
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

  return {
    messageKey: 'SETTINGS_CREATED_SUCCESS',
    data: settings,
  };
};

// update global settings service
const updateGlobalSettings = async (
  payload: Partial<TGlobalSettings>,
  currentUser: TCurrentUser,
) => {
  if (!['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
    throw new AppError(httpStatus.FORBIDDEN, 'ONLY_ADMIN_CAN_UPDATE');
  }

  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'NOT_APPROVED_STATUS_TEMPLATE', {
      status: currentUser.status,
    });
  }

  // --------------------------------------------------
  // Find existing settings (must exist)
  // --------------------------------------------------
  const existingSettings = await GlobalSettings.findOne();

  if (!existingSettings) {
    throw new AppError(httpStatus.NOT_FOUND, 'SETTINGS_NOT_FOUND_CREATE_FIRST');
  }

  // --------------------------------------------------
  // Payout business validations
  // --------------------------------------------------
  if (payload.payout) {
    // Payout days validation logic
    const isAutoGenerate =
      payload.payout.autoGenerate ?? existingSettings.payout?.autoGenerate;
    const days =
      payload.payout.payoutDays ?? existingSettings.payout?.payoutDays;

    if (isAutoGenerate && (!days || days.length === 0)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'PAYOUT_DAYS_REQUIRED_FOR_AUTOGENERATE',
      );
    }
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
      'PLATFORM_COMMISSION_RANGE_INVALID',
    );
  }

  if (Object.keys(payload).length === 0) {
    return {
      messageKey: 'SETTINGS_UPDATED_SUCCESS',
      data: existingSettings,
    };
  }

  // --------------------------------------------------
  // Meta info
  // --------------------------------------------------

  const flattenedPayload = flattenObject(payload);

  flattenedPayload['meta.updatedBy'] = currentUser._id;
  flattenedPayload['meta.updatedAt'] = new Date();
  // --------------------------------------------------
  // Update settings
  // --------------------------------------------------
  const updatedSettings = await GlobalSettings.findOneAndUpdate(
    {},
    { $set: flattenedPayload },
    {
      new: true,
      runValidators: true,
    },
  );

  return {
    messageKey: 'SETTINGS_UPDATED_SUCCESS',
    data: updatedSettings,
  };
};

const getGlobalSettingsForAdmin = async (currentUser: TCurrentUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'NOT_APPROVED_STATUS_TEMPLATE', {
      status: currentUser.status,
    });
  }

  if (!['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
    throw new AppError(httpStatus.FORBIDDEN, 'ONLY_ADMIN_CAN_ACCESS');
  }

  // --------------------------------------------------
  // Fetch settings
  // --------------------------------------------------
  const settings = await GlobalSettings.findOne().lean();

  if (!settings) {
    throw new AppError(httpStatus.NOT_FOUND, 'SETTINGS_NOT_FOUND');
  }

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Global Settings' },
    data: settings,
  };
};

// get for checkout
const getGlobalSettings = async (session?: ClientSession) => {
  const result = await GlobalSettings.findOne({})
    .select('commission delivery order rewards ingredientsOrder')
    .session(session as ClientSession);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'SETTINGS_NOT_FOUND');
  }
  return {
    platformCommissionPercent: result?.commission?.platformPercent,
    platformCommissionVatRate: result?.commission?.platformVatRate,
    fleetManagerCommissionPercent: result?.commission?.fleetManagerPercent,
    serviceCharge: result?.commission?.serviceCharge,
    baseDeliveryCharge: result?.delivery?.baseCharge,
    deliveryChargePerKm: result?.delivery?.chargePerKm,
    deliveryVatRate: result?.delivery?.vatRate,
    customerNearestVendorRadiusKm: result?.order?.nearestVendorRadiusKm,
    rewards: result?.rewards,
    ingredientOrder: result?.ingredientsOrder,
  };
};

export const GlobalSettingsService = {
  createGlobalSettings,
  updateGlobalSettings,
  getGlobalSettingsForAdmin,
  getGlobalSettings,
};
