import { Router } from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { OfferValidation } from './offer.validation';
import auth from '../../middlewares/auth';
import { OfferControllers } from './offer.controller';

const router = Router();

// Create Offer
router.post(
  '/create-offer',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR'),
  validateRequest(OfferValidation.createOfferValidation),
  OfferControllers.createOffer
);

// Get All Offers
router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR'),
  OfferControllers.getAllOffers
);

export const OfferRoutes = router;
