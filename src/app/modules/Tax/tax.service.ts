/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { TTax } from './tax.interface';
import { Tax } from './tax.model';
import { QueryBuilder } from '../../builder/QueryBuilder';

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
    payload.countryID,
  );

  if (isDuplicate) {
    throw new AppError(
      httpStatus.CONFLICT,
      `A tax with code '${payload.taxCode}' or rate '${payload.taxRate}%' already exists in ${payload.countryID}.`,
    );
  }

  if (
    payload.taxRate === 0 &&
    (!payload.taxExemptionCode || !payload.taxExemptionReason)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Tax rate 0 requires a valid Tax Exemption Code and Reason for Portugal compliance.',
    );
  }

  const result = await Tax.create(payload);
  return result;
};

// Update Tax Service
const updateTax = async (taxId: string, payload: Partial<TTax>) => {
  const isExist = await Tax.findById(taxId);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Tax record not found!');
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
        `Conflict: Another tax with this code or rate already exists.`,
      );
    }
  }

  const finalRate =
    payload.taxRate !== undefined ? payload.taxRate : isExist.taxRate;
  if (finalRate === 0) {
    const exemptionCode = payload.taxExemptionCode || isExist.taxExemptionCode;
    const exemptionReason =
      payload.taxExemptionReason || isExist.taxExemptionReason;

    if (!exemptionCode || !exemptionReason) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Tax rate 0 requires a valid Tax Exemption Code and Reason.',
      );
    }
  }

  const result = await Tax.findByIdAndUpdate(taxId, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

// Get all taxes service
const getAllTaxes = async (query: Record<string, unknown>) => {
  const taxes = new QueryBuilder(Tax.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(['taxName']);
  const meta = await taxes.countTotal();
  const data = await taxes.modelQuery;
  return { meta, data };
};

// Get single tax service
const getSingleTax = async (taxId: string) => {
  const result = await Tax.findById(taxId);
  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `Tax record with ID '${taxId}' not found!`,
    );
  }
  return result;
};

// soft delete  tax service
const softDeleteTax = async (taxId: string) => {
  const result = await Tax.findById(taxId);
  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `Tax record with ID '${taxId}' not found!`,
    );
  }
  if (result.isActive) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Active tax cannot be deleted. Please deactivate first.',
    );
  }

  result.isDeleted = true;
  await result.save();

  return {
    message: 'Tax soft deleted successfully',
  };
};

// permanently delete  tax service
const permanentDeleteTax = async (taxId: string) => {
  const result = await Tax.findById(taxId);
  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `Tax record with ID '${taxId}' not found!`,
    );
  }

  if (!result.isDeleted) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Tax is not soft deleted. Please soft delete first.',
    );
  }

  await Tax.findByIdAndDelete(taxId);

  return {
    message: 'Tax permanently deleted successfully',
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
