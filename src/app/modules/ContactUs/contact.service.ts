import config from '../../config';
import { EmailHelper } from '../../utils/emailSender';
import { TContact } from './contact.interface';

const createContact = async (payload: TContact) => {
  const { name, sender, message } = payload;

  // Create Email HTML
  const html = await EmailHelper.createEmailContent(
    {
      name,
      sender,
      message,
    },
    'contact', // views/contact.template.hbs
  );

  // Send Email to Author
  await EmailHelper.sendEmail(
    config.sender_email as string,
    html,
    'New Contact Form Message',
  );

  return {
    message: 'Contact message sent successfully',
    data: {
      name,
      sender,
      message,
    },
  };
};

export const ContactService = {
  createContact,
};
