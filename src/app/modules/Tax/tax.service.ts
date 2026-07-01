/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { TTax } from './tax.interface';
import { Tax } from './tax.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { flattenObject } from '../../utils/flattenObject';
import { TMessageKey } from '../../errors/messages';

const checkExistingTax = async (
  taxCode: string,
  taxRate: number,
  countryID: string,
  currentTaxId?: string,
): Promise<TTax | null> => {
  if (!taxCode || taxRate === undefined || !countryID) {
    return null;
  }

  const query: any = {
    countryID,
    isActive: true,
    $or: [{ taxCode: taxCode }, { taxRate: Number(taxRate) }],
  };

  if (currentTaxId) {
    query._id = { $ne: currentTaxId };
  }

  const existingTax = await Tax.findOne(query).select(
    'taxName taxCode taxRate countryID',
  );

  return existingTax ? (existingTax.toObject() as TTax) : null;
};

// Create Tax Service
const createTax = async (payload: TTax) => {
  const isDuplicate = await checkExistingTax(
    payload.taxCode,
    payload.taxRate,
    payload.countryID || 'PRT',
  );

  if (isDuplicate) {
    throw new AppError(
      httpStatus.CONFLICT,
      'TAX_CODE_OR_RATE_ALREADY_EXISTS_IN_COUNTRY',
      {
        taxCode: payload.taxCode,
        taxRate: payload.taxRate,
        countryID: payload.countryID || 'PRT',
      },
    );
  }

  if (payload.taxName && payload.taxName.en) {
    const existingName = await Tax.findOne({
      'taxName.en': { $regex: new RegExp(`^${payload.taxName.en}$`, 'i') },
      isDeleted: false,
    });

    if (existingName) {
      throw new AppError(
        httpStatus.CONFLICT,
        'TAX_CONFIGURATION_NAME_ALREADY_EXISTS',
      );
    }
  }

  if (payload.taxRate === 0) {
    const reason = payload.taxExemptionReason;
    const hasReasonText = reason && (reason.en?.trim() || reason.pt?.trim());

    if (!payload.taxExemptionCode?.trim() || !hasReasonText) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'TAX_RATE_ZERO_REQUIRES_EXEMPTION_COMPLIANCE',
      );
    }
  }

  const result = await Tax.create(payload);

  return {
    messageKey: 'TAX_CREATED_SUCCESS' as TMessageKey,
    data: result,
  };
};

// Update Tax Service
const updateTax = async (taxId: string, payload: Partial<TTax>) => {
  const isExist = await Tax.findById(taxId);
  if (!isExist) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'TAX_RECORD_NOT_FOUND_WITH_EXCLAMATION',
    );
  }

  if (payload.taxCode || payload.taxRate !== undefined) {
    const isDuplicate = await checkExistingTax(
      payload.taxCode || isExist.taxCode,
      payload.taxRate !== undefined ? payload.taxRate : isExist.taxRate,
      payload.countryID || isExist.countryID,
      taxId,
    );

    if (isDuplicate) {
      throw new AppError(
        httpStatus.CONFLICT,
        'TAX_CONFLICT_CODE_OR_RATE_EXISTS',
      );
    }
  }

  const finalRate =
    payload.taxRate !== undefined ? payload.taxRate : isExist.taxRate;
  if (finalRate === 0) {
    const exemptionCode = payload.taxExemptionCode || isExist.taxExemptionCode;
    const exemptionReason =
      payload.taxExemptionReason || isExist.taxExemptionReason;

    const hasReasonText =
      exemptionReason &&
      (exemptionReason.en?.trim() || exemptionReason.pt?.trim());

    if (!exemptionCode?.trim() || !hasReasonText) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'TAX_RATE_ZERO_REQUIRES_EXEMPTION',
      );
    }
  }

  const flattenedPayload = flattenObject(payload);

  const result = await Tax.findByIdAndUpdate(
    taxId,
    { $set: flattenedPayload },
    {
      new: true,
      runValidators: false,
    },
  );

  return {
    messageKey: 'TAX_UPDATED_SUCCESS' as TMessageKey,
    data: result,
  };
};

// Get all taxes service
const getAllTaxes = async (query: Record<string, unknown>) => {
  const taxes = new QueryBuilder(Tax.find(), query)
    .search(['taxName.en', 'taxName.pt'])
    .filter()
    .sort()
    .paginate()
    .fields();
  const meta = await taxes.countTotal();
  const data = await taxes.modelQuery;
  return {
    messageKey: 'TAXES_RETRIEVED_SUCCESS' as TMessageKey,
    meta,
    data,
  };
};

// Get single tax service
const getSingleTax = async (taxId: string) => {
  const result = await Tax.findById(taxId);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'TAX_RECORD_WITH_ID_NOT_FOUND', {
      taxId,
    });
  }
  return {
    messageKey: 'TAX_RETRIEVED_SUCCESS' as TMessageKey,
    data: result,
  };
};

// soft delete  tax service
const softDeleteTax = async (taxId: string) => {
  const result = await Tax.findById(taxId);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'TAX_RECORD_WITH_ID_NOT_FOUND', {
      taxId,
    });
  }
  if (result.isActive) {
    throw new AppError(
      httpStatus.CONFLICT,
      'ACTIVE_TAX_CANNOT_BE_DELETED_DEACTIVATE_FIRST',
    );
  }

  result.isDeleted = true;
  await result.save();

  return {
    messageKey: 'TAX_SOFT_DELETED_SUCCESS' as TMessageKey,
    data: null,
  };
};

// permanently delete  tax service
const permanentDeleteTax = async (taxId: string) => {
  const result = await Tax.findById(taxId);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'TAX_RECORD_WITH_ID_NOT_FOUND', {
      taxId,
    });
  }

  if (!result.isDeleted) {
    throw new AppError(
      httpStatus.CONFLICT,
      'TAX_NOT_SOFT_DELETED_SOFT_DELETE_FIRST',
    );
  }

  await Tax.findByIdAndDelete(taxId);

  return {
    messageKey: 'TAX_PERMANENTLY_DELETED_SUCCESS' as TMessageKey,
    data: null,
  };
};

export const TaxService = {
  createTax,
  updateTax,
  getAllTaxes,
  getSingleTax,
  softDeleteTax,
  permanentDeleteTax,
};
