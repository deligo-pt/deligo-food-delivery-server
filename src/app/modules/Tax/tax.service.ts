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

export const TaxService = {
  createTax,
  getAllTaxes,
  getSingleTax,
};
