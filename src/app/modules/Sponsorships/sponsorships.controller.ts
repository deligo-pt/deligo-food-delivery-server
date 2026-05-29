import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { catchAsync } from '../../utils/catchAsync';
import { SponsorshipServices } from './sponsorships.service';
import { TImageFile } from '../../interfaces/image.interface';
import { TAuthUser } from '../AuthUser/authUser.interface';

// create Sponsorship Controller
const createSponsorship = catchAsync(async (req, res) => {
  const file = req.file as TImageFile | undefined;
  const result = await SponsorshipServices.createSponsorship(
    req.body,
    req.user as TAuthUser,
    file?.path ?? null,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Sponsorship created successfully',
    data: result,
  });
});

// update Sponsorship Controller
const updateSponsorship = catchAsync(async (req, res) => {
  const { id } = req.params;
  const file = req.file as TImageFile | undefined;

  const result = await SponsorshipServices.updateSponsorship(
    id,
    req.body,
    file?.path ?? null,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Sponsorship updated successfully',
    data: result,
  });
});

// get all sponsorships controller
const getAllSponsorships = catchAsync(async (req, res) => {
  const result = await SponsorshipServices.getAllSponsorships(
    req.user as TAuthUser,
    req.query,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Sponsorships retrieved successfully',
    meta: result?.meta,
    data: result?.data,
  });
});

// get single sponsorships controller
const getSingleSponsorship = catchAsync(async (req, res) => {
  const result = await SponsorshipServices.getSingleSponsorship(
    req.user as TAuthUser,
    req.params.id,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Sponsorship retrieved successfully',
    data: result,
  });
});

// soft delete Sponsorship Controller
const softDeleteSponsorship = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await SponsorshipServices.softDeletedSponsorship(
    req?.user as TAuthUser,
    id,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// permanent delete Sponsorship Controller
const permanentDeleteSponsorship = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await SponsorshipServices.permanentDeleteSponsorship(
    req?.user as TAuthUser,
    id,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

export const SponsorshipControllers = {
  createSponsorship,
  updateSponsorship,
  getAllSponsorships,
  getSingleSponsorship,
  softDeleteSponsorship,
  permanentDeleteSponsorship,
};
