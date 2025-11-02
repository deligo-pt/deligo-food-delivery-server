import express from 'express';
import auth from '../../middlewares/auth';
import { AgentControllers } from './agent.controller';
import validateRequest from '../../middlewares/validateRequest';
import { multerUpload } from '../../config/multer.config';
import { AgentValidation } from './agent.validation';

const router = express.Router();

// Agent update Route
router.patch(
  '/:id',
  auth('AGENT', 'SUPER_ADMIN', 'ADMIN'),
  validateRequest(AgentValidation.agentUpdateValidationSchema),
  AgentControllers.agentUpdate
);

// agent doc image upload route
router.patch(
  '/:id/docImage',
  auth('AGENT', 'SUPER_ADMIN', 'ADMIN'),
  multerUpload.single('file'),
  AgentControllers.agentDocImageUpload
);

// submit agent for approval Route
router.patch(
  '/:id/submitForApproval',
  auth('AGENT', 'SUPER_ADMIN', 'ADMIN'),
  AgentControllers.submitAgentForApproval
);

// agent delete Route
router.delete(
  '/:id',
  auth('AGENT', 'SUPER_ADMIN', 'ADMIN'),
  AgentControllers.agentDelete
);

router.get('/', auth('ADMIN', 'SUPER_ADMIN'), AgentControllers.getAllAgents);
router.get(
  '/:id',
  auth('ADMIN', 'SUPER_ADMIN'),
  AgentControllers.getSingleAgent
);

export const AgentRoutes = router;
