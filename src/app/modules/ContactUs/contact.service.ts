
import { IContact } from "./contact.interface";
import config from "../../config";
import { EmailHelper } from "../../utils/emailSender";

const createContact = async (payload: IContact) => {
    const { name, sender, message } = payload;

    // 1️⃣ Create Email HTML
    const html = await EmailHelper.createEmailContent(
        {
            name,
            sender,
            message,
        },
        "contact" // views/contact.template.hbs
    );

    // 2️⃣ Send Email to Author
    await EmailHelper.sendEmail(
        config.sender_email as string,
        html,
        "New Contact Form Message"
    );

    return {
        name,
        sender,
        message,
    };
};

export const ContactService = {
    createContact,
};
