import express from "express";
import { ContactController } from "./contact.controller";
import validateRequest from "../../middlewares/validateRequest";
import { contactValidation } from "./contact.validation";

const router = express.Router();

router.post(
    "/",
    validateRequest(contactValidation),
    ContactController.createContact
);

export const ContactRoutes = router;
