import { Router } from 'express';
import { AIContentGeneratorController } from './aiContentGenerator.controller';
import validateRequest from '../../middlewares/validateRequest';
import { AIContentGeneratorValidation } from './aiContentGenerator.validation';
import auth from '../../middlewares/auth';

const router = Router();

router.post(
  '/generate-product-description',
  validateRequest(
    AIContentGeneratorValidation.generateProductDescriptionValidationSchema,
  ),
  auth('VENDOR', 'SUB_VENDOR', 'ADMIN', 'SUPER_ADMIN')(),
  AIContentGeneratorController.generateProductDescription,
);

export const AIContentGeneratorRoutes = router;
