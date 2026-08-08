import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { TSponsorship } from './sponsorships.interface';
import { Sponsorship } from './sponsorships.model';
import { deleteSingleImageFromCloudinary } from '../../utils/deleteImage';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';

// Create sponsorship
const createSponsorship = async (
  payload: TSponsorship,
  currentUser: TCurrentUser,
  bannerImage: string | null,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'NOT_APPROVED_WITH_STATUS', {
      status: currentUser.status,
    });
  }

  if (payload.bannerImage) {
    throw new AppError(httpStatus.BAD_REQUEST, 'BANNER_IMAGE_MUST_BE_FILE');
  }

  const isExist = await Sponsorship.findOne({
    sponsorName: payload.sponsorName,
    startDate: payload.startDate,
  });

  if (isExist) {
    throw new AppError(
      httpStatus.CONFLICT,
      'SPONSORSHIP_CAMPAIGN_ALREADY_EXISTS_SAME_START_DATE',
    );
  }

  const sponsorshipData = {
    ...payload,
    bannerImage,
  };
  const result = await Sponsorship.create(sponsorshipData);
  return {
    messageKey: 'COMMON_CREATED_SUCCESS' as TMessageKey,
    variables: { entity: 'Sponsorship Campaign' },
    data: result,
  };
};

// Update sponsorship by id
const updateSponsorship = async (
  id: string,
  payload: Partial<TSponsorship>,
  bannerImage: string | null,
) => {
  const isExist = await Sponsorship.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'SPONSORSHIP_NOT_FOUND');
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
        'CAMPAIGN_WITH_SAME_NAME_AND_START_DATE_EXISTS',
      );
    }
  }

  if (bannerImage) {
    const oldPhoto = isExist.bannerImage;
    if (oldPhoto) {
      deleteSingleImageFromCloudinary(oldPhoto).catch((err) => {
        void err;
      });
    }
    payload.bannerImage = bannerImage;
  }

  const result = await Sponsorship.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return {
    messageKey: 'COMMON_UPDATED_SUCCESS' as TMessageKey,
    variables: { entity: 'Sponsorship Details' },
    data: result,
  };
};

// get all sponsorships
const getAllSponsorships = async (
  currentUser: TCurrentUser,
  query: Record<string, unknown>,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'COMMON_ACCESS_DENIED');
  }
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  if (!isAdmin) {
    query.isDeleted = false;
    query.isActive = true;
  }
  const sponsorships = new QueryBuilder(Sponsorship.find(), query)
    .search(['sponsorName', 'sponsorType'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [meta, data] = await Promise.all([
    sponsorships.countTotal(),
    sponsorships.modelQuery,
  ]);

  return {
    messageKey: 'COMMON_RETRIEVED_SUCCESS' as TMessageKey,
    variables: { entity: 'Sponsorships' },
    meta,
    data,
  };
};
const getAllSponsorshipsPublic = async (query: Record<string, unknown>) => {
  query.isDeleted = false;
  query.isActive = true;

  const sponsorships = new QueryBuilder(Sponsorship.find(), query)
    .search(['sponsorName', 'sponsorType'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const [meta, data] = await Promise.all([
    sponsorships.countTotal(),
    sponsorships.modelQuery,
  ]);

  return {
    messageKey: 'COMMON_RETRIEVED_SUCCESS' as TMessageKey,
    variables: { entity: 'Sponsorships' },
    meta,
    data,
  };
};

// get single sponsorship
const getSingleSponsorship = async (currentUser: TCurrentUser, id: string) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'COMMON_ACCESS_DENIED');
  }
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  const sponsorship = await Sponsorship.findById(id);
  if (!sponsorship) {
    throw new AppError(httpStatus.NOT_FOUND, 'SPONSORSHIP_NOT_FOUND');
  }
  if (!isAdmin) {
    if (sponsorship.isDeleted || !sponsorship.isActive) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'SPONSORSHIP_NOT_FOUND_OR_DELETED',
      );
    }
  }
  return {
    messageKey: 'DATA_LOAD_SUCCESS' as TMessageKey,
    variables: { entity: 'Sponsorship' },
    data: sponsorship,
  };
};

// soft deleted sponsorship
const softDeletedSponsorship = async (
  currentUser: TCurrentUser,
  id: string,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'COMMON_ACCESS_DENIED');
  }

  const isExist = await Sponsorship.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'SPONSORSHIP_NOT_FOUND');
  }

  if (isExist.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'SPONSORSHIP_ALREADY_DELETED');
  }

  await Sponsorship.findByIdAndUpdate(
    { _id: id },
    { isDeleted: true, isActive: false },
    {
      new: true,
    },
  );

  return {
    messageKey: 'COMMON_SOFT_DELETED_SUCCESS' as TMessageKey,
    variables: { entity: 'Sponsorship Campaign' },
    data: null,
  };
};

// permanent delete sponsorship
const permanentDeleteSponsorship = async (
  currentUser: TCurrentUser,
  id: string,
) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(httpStatus.FORBIDDEN, 'COMMON_ACCESS_DENIED');
  }
  const isExist = await Sponsorship.findById(id);
  if (!isExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'SPONSORSHIP_NOT_FOUND');
  }
  if (!isExist.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'DEACTIVATION_REQUIRED_FIRST');
  }
  await Sponsorship.findByIdAndDelete(id);
  return {
    messageKey: 'COMMON_PERMANENTLY_DELETED_SUCCESS' as TMessageKey,
    variables: { entity: 'Sponsorship' },
    data: null,
  };
};

export const SponsorshipServices = {
  createSponsorship,
  updateSponsorship,
  getAllSponsorships,
  getAllSponsorshipsPublic,
  getSingleSponsorship,
  softDeletedSponsorship,
  permanentDeleteSponsorship,
};
