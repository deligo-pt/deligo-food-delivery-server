import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { catchAsync } from '../../utils/catchAsync';
import { SponsorshipServices } from './sponsorships.service';
import { TImageFile } from '../../interfaces/image.interface';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { TMessageKey } from '../../errors/messages';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

// create Sponsorship Controller
const createSponsorship = catchAsync(async (req, res) => {
  const file = req.file as TImageFile | undefined;
  const currentUser = req.user as TCurrentUser;
  const result = await SponsorshipServices.createSponsorship(
    req.body,
    currentUser,
    file?.path ?? null,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Created Sponsorship',
    target: req.body?.sponsorName || 'New Sponsorship',
    type: 'INFO',
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// update Sponsorship Controller
const updateSponsorship = catchAsync(async (req, res) => {
  const { id } = req.params;
  const file = req.file as TImageFile | undefined;
  const currentUser = req.user as TCurrentUser;

  const result = await SponsorshipServices.updateSponsorship(
    id,
    req.body,
    file?.path ?? null,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Updated Sponsorship',
    target: req.body?.sponsorName || `Sponsorship #${id}`,
    type: 'INFO',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// get all sponsorships controller
const getAllSponsorships = catchAsync(async (req, res) => {
  const result = await SponsorshipServices.getAllSponsorships(
    req.user as TCurrentUser,
    req.query,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    meta: result?.meta,
    data: result?.data,
  });
});
const getAllSponsorshipsPublic = catchAsync(async (req, res) => {
  const result = await SponsorshipServices.getAllSponsorshipsPublic(req.query);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    meta: result?.meta,
    data: result?.data,
  });
});

// get single sponsorships controller
const getSingleSponsorship = catchAsync(async (req, res) => {
  const result = await SponsorshipServices.getSingleSponsorship(
    req.user as TCurrentUser,
    req.params.id,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// soft delete Sponsorship Controller
const softDeleteSponsorship = catchAsync(async (req, res) => {
  const { id } = req.params;
  const currentUser = req?.user as TCurrentUser;
  const result = await SponsorshipServices.softDeletedSponsorship(
    currentUser,
    id,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Soft Deleted Sponsorship',
    target: `Sponsorship #${id}`,
    type: 'DANGER',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

// permanent delete Sponsorship Controller
const permanentDeleteSponsorship = catchAsync(async (req, res) => {
  const { id } = req.params;
  const currentUser = req?.user as TCurrentUser;
  const result = await SponsorshipServices.permanentDeleteSponsorship(
    currentUser,
    id,
  );

  createActivityLog({
    customUserId: currentUser?.userId,
    action: 'Permanently Deleted Sponsorship',
    target: `Sponsorship #${id}`,
    type: 'DANGER',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    messageKey: result?.messageKey as TMessageKey,
    data: result?.data,
  });
});

export const SponsorshipControllers = {
  createSponsorship,
  updateSponsorship,
  getAllSponsorships,
  getAllSponsorshipsPublic,
  getSingleSponsorship,
  softDeleteSponsorship,
  permanentDeleteSponsorship,
};
