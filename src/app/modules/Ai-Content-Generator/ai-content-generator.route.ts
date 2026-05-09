import { Router } from 'express';
import { AIContentGeneratorController } from './aiContentGenerator.controller';
import validateRequest from '../../middlewares/validateRequest';
import { AIContentGeneratorValidation } from './aiContentGenerator.validation';

const router = Router();

router.post(
  '/generate-product-description',
  validateRequest(
    AIContentGeneratorValidation.generateProductDescriptionValidationSchema,
  ),
  AIContentGeneratorController.generateProductDescription,
);

export const AIContentGeneratorRoutes = router;
