import express from 'express';
import { USER_ROLE } from '../User/user.constant';
import auth from '../../middlewares/auth';
import { VendorControllers } from './vendor.controller';

const router = express.Router();

// Vendor update Route
router.patch('/:id', auth(USER_ROLE.VENDOR), VendorControllers.vendorUpdate);

// vendor delete Route
router.delete('/:id', auth(USER_ROLE.VENDOR), VendorControllers.vendorDelete);

export const VendorRoutes = router;
