import { Router } from 'express';
import { AIContentGeneratorController } from './aiContentGenerator.controller';
import validateRequest from '../../middlewares/validateRequest';
import { AIContentGeneratorValidation } from './aiContentGenerator.validation';
import auth from '../../middlewares/auth';

const router = Router();

router.post(
  '/generate-product-description',
  auth('VENDOR', 'SUB_VENDOR', 'ADMIN', 'SUPER_ADMIN'),
  validateRequest(
    AIContentGeneratorValidation.generateProductDescriptionValidationSchema,
  ),
  AIContentGeneratorController.generateProductDescription,
);

export const AIContentGeneratorRoutes = router;
