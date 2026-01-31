import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { catchAsync } from '../../utils/catchAsync';
import { SponsorshipServices } from './sponsorships.service';
import { AuthUser } from '../../constant/user.constant';
import { TImageFile } from '../../interfaces/image.interface';

// create Sponsorship Controller
const createSponsorship = catchAsync(async (req, res) => {
  const file = req.file as TImageFile | undefined;
  const result = await SponsorshipServices.createSponsorship(
    req.body,
    req.user as AuthUser,
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
    req.user as AuthUser,
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
    req.user as AuthUser,
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
    req?.user as AuthUser,
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
    req?.user as AuthUser,
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
