import { Request, Response } from "express";
import httpStatus from "http-status";
import { ContactService } from "./contact.service";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";


const createContact = catchAsync(async (req, res) => {
    const result = await ContactService.createContact(req.body);

    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: 'Contact message sent successfully',
        data: result,
    });
});
export const ContactController = {
    createContact,
};
