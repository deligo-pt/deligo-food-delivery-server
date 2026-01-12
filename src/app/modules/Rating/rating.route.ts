import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { RatingValidation } from './rating.validation';
import { RatingControllers } from './rating.controller';
import auth from '../../middlewares/auth';

const router = Router();

// create rating
router.post(
  '/create-rating',
  auth('CUSTOMER', 'DELIVERY_PARTNER'),
  validateRequest(RatingValidation.createRatingValidationSchema),
  RatingControllers.createRating
);

// get all ratings
router.get(
  '/get-all-ratings',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'DELIVERY_PARTNER',
    'FLEET_MANAGER',
    'VENDOR',
    'SUB_VENDOR'
  ),
  RatingControllers.getAllRatings
);

router.get(
  '/get-rating-summary',
  auth(
    'ADMIN',
    'SUPER_ADMIN',
    'DELIVERY_PARTNER',
    'FLEET_MANAGER',
    'VENDOR',
    'SUB_VENDOR'
  ),
  RatingControllers.getRatingSummary
);

export const RatingRoutes = router;
