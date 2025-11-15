import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { RatingValidation } from './rating.validation';
import { RatingControllers } from './rating.controller';
import auth from '../../middlewares/auth';

const router = Router();

// create rating
router.post(
  '/create-rating',
  auth('CUSTOMER', 'DELIVERY_PARTNER', 'VENDOR', 'FLEET_MANAGER'),
  validateRequest(RatingValidation.ratingValidationSchema),
  RatingControllers.createRating
);

// get all ratings
router.get(
  '/get-all-ratings',
  auth('ADMIN', 'SUPER_ADMIN', 'DELIVERY_PARTNER', 'FLEET_MANAGER', 'VENDOR'),
  RatingControllers.getAllRatings
);

export const RatingRoutes = router;
