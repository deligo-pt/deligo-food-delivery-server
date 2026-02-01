import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { SponsorshipValidation } from './sponsorships.validation';
import { SponsorshipControllers } from './sponsorships.controller';
import auth from '../../middlewares/auth';
import { multerUpload } from '../../config/multer.config';
import { parseBody } from '../../middlewares/bodyParser';

const router = Router();

// create sponsorship route
router.post(
  '/create-sponsorship',
  auth('ADMIN', 'SUPER_ADMIN'),
  multerUpload.single('file'),
  parseBody,
  validateRequest(SponsorshipValidation.createSponsorshipValidationSchema),
  SponsorshipControllers.createSponsorship,
);

// update sponsorship route
router.patch(
  '/update-sponsorship/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  multerUpload.single('file'),
  parseBody,
  validateRequest(SponsorshipValidation.updateSponsorshipValidationSchema),
  SponsorshipControllers.updateSponsorship,
);

// get all sponsorships route
router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN', 'CUSTOMER'),
  SponsorshipControllers.getAllSponsorships,
);

// get single sponsorship route
router.get(
  '/:id',
  auth('ADMIN', 'SUPER_ADMIN', 'CUSTOMER'),
  SponsorshipControllers.getSingleSponsorship,
);

// soft delete sponsorship route
router.delete(
  '/soft-delete/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  SponsorshipControllers.softDeleteSponsorship,
);

// permanent delete sponsorship route
router.delete(
  '/permanent-delete/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  SponsorshipControllers.permanentDeleteSponsorship,
);

export const SponsorshipsRoutes = router;
