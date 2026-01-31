import httpStatus from 'http-status';
import { AuthUser } from '../../constant/user.constant';
import AppError from '../../errors/AppError';
import { TSponsorship } from './sponsorships.interface';
import { Sponsorship } from './sponsorships.model';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { QueryBuilder } from '../../builder/QueryBuilder';

// Create sponsorship
const createSponsorship = async (
  payload: TSponsorship,
  currentUser: AuthUser,
  bannerImage: string | null,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved. Your account is ${currentUser.status}`,
    );
  }

  if (payload.bannerImage) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Banner image must be uploaded as a file, not in text.',
    );
  }

  const isExist = await Sponsorship.findOne({
    sponsorName: payload.sponsorName,
    startDate: payload.startDate,
  });

  if (isExist) {
    throw new AppError(
      httpStatus.CONFLICT,
      'This sponsorship campaign already exists for the same start date.',
    );
  }

  const sponsorshipData = {
    ...payload,
    bannerImage,
  };
  const result = await Sponsorship.create(sponsorshipData);
  return result;
};

// Update sponsorship by id
const updateSponsorship = async (
  id: string,
  payload: Partial<TSponsorship>,
  bannerImage: string | null,
) => {
  const isExist = await Sponsorship.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Sponsorship not found');
  }

  if (payload.sponsorName || payload.startDate) {
    const duplicate = await Sponsorship.findOne({
      _id: { $ne: id },
      sponsorName: payload.sponsorName || isExist.sponsorName,
      startDate: payload.startDate || isExist.startDate,
    });

    if (duplicate) {
      throw new AppError(
        httpStatus.CONFLICT,
        'Another campaign with same name and start date already exists',
      );
    }
  }

  if (bannerImage) {
    const oldPhoto = isExist.bannerImage;
    if (oldPhoto) {
      deleteSingleImageFromCloudinary(oldPhoto).catch((err) => {
        console.log(err);
      });
    }
    payload.bannerImage = bannerImage;
  }

  const result = await Sponsorship.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

// get all sponsorships
const getAllSponsorships = async (
  currentUser: AuthUser,
  query: Record<string, unknown>,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view sponsorships. Your account is ${currentUser.status}`,
    );
  }
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  if (!isAdmin) {
    query.isDeleted = false;
    query.isActive = true;
  }
  const sponsorships = new QueryBuilder(Sponsorship.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(['sponsorName', 'sponsorType']);

  const [meta, data] = await Promise.all([
    sponsorships.countTotal(),
    sponsorships.modelQuery,
  ]);

  return { meta, data };
};

// get single sponsorship
const getSingleSponsorship = async (currentUser: AuthUser, id: string) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view sponsorships. Your account is ${currentUser.status}`,
    );
  }
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  const sponsorship = await Sponsorship.findById(id);
  if (!sponsorship) {
    throw new AppError(httpStatus.NOT_FOUND, 'Sponsorship not found');
  }
  if (!isAdmin) {
    if (sponsorship.isDeleted || !sponsorship.isActive) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Sponsorship is not found or deleted',
      );
    }
  }
  return sponsorship;
};

// soft deleted sponsorship
const softDeletedSponsorship = async (currentUser: AuthUser, id: string) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view sponsorships. Your account is ${currentUser.status}`,
    );
  }

  const isExist = await Sponsorship.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Sponsorship not found');
  }

  if (isExist.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'Sponsorship is already deleted');
  }

  await Sponsorship.findByIdAndUpdate(
    { _id: id },
    { isDeleted: true, isActive: false },
    {
      new: true,
    },
  );

  return { message: 'Sponsorship deleted successfully' };
};

// permanent delete sponsorship
const permanentDeleteSponsorship = async (
  currentUser: AuthUser,
  id: string,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view sponsorships. Your account is ${currentUser.status}`,
    );
  }
  const isExist = await Sponsorship.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'Sponsorship not found');
  }
  if (!isExist.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'Please soft delete first');
  }
  await Sponsorship.findByIdAndDelete(id);
  return {
    message: 'Sponsorship deleted permanently',
  };
};

export const SponsorshipServices = {
  createSponsorship,
  updateSponsorship,
  getAllSponsorships,
  getSingleSponsorship,
  softDeletedSponsorship,
  permanentDeleteSponsorship,
};
