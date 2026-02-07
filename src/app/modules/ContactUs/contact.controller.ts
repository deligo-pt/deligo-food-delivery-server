import { Request, Response } from "express";
import httpStatus from "http-status";
import { ContactService } from "./contact.service";

const createContact = async (req: Request, res: Response) => {
    const result = await ContactService.createContact(req.body);

    res.status(httpStatus.CREATED).json({
        success: true,
        message: "Contact message sent successfully",
        data: result,
    });
};

export const ContactController = {
    createContact,
};
