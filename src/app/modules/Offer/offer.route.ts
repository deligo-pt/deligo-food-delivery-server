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

// Update Offer
router.patch(
  '/:offerId',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR'),
  validateRequest(OfferValidation.updateOfferValidation),
  OfferControllers.updateOffer
);

// getApplicableOffer
router.post(
  '/get-applicable-offer',
  auth('CUSTOMER'),
  validateRequest(OfferValidation.getApplicableOfferValidation),
  OfferControllers.getApplicableOffer
);

// Get All Offers
router.get(
  '/',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR', 'CUSTOMER'),
  OfferControllers.getAllOffers
);

// Get Single Offer
router.get(
  '/:offerId',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR', 'CUSTOMER'),
  OfferControllers.getSingleOffer
);

// Soft Delete Offer
router.delete(
  '/soft-delete/:offerId',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR', 'SUB_VENDOR'),
  OfferControllers.softDeleteOffer
);

// Permanent Delete Offer
router.delete(
  '/permanent-delete/:offerId',
  auth('ADMIN', 'SUPER_ADMIN', 'VENDOR'),
  OfferControllers.permanentDeleteOffer
);

export const OfferRoutes = router;
