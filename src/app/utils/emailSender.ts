import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import nodemailer from 'nodemailer';
import config from '../config';
import AppError from '../errors/AppError';
import httpStatus from 'http-status';

Handlebars.registerHelper('eq', (a, b) => a === b);

const sendEmail = async (email: string, html: string, subject: string) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: config.sender_email,
      pass: config.sender_app_password,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    await transporter.sendMail({
      from: `"DeliGo" <${config.sender_email}>`,
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error('Nodemailer Error:', error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to send email'
    );
  }
};

const createEmailContent = async (data: object, templateType: string) => {
  try {
    const templatePath = path.join(
      process.cwd(),
      'views',
      `${templateType}.template.hbs`
    );

    console.log('Looking for email template at:', templatePath);

    if (!fs.existsSync(templatePath)) {
      console.error(`Template not found at: ${templatePath}`);
      throw new Error(
        `Email template '${templateType}' not found in views folder.`
      );
    }

    const content = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(content);

    return template(data);
  } catch (error) {
    console.error('Template Generation Error:', (error as Error).message);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      (error as Error).message
    );
  }
};

export const EmailHelper = {
  sendEmail,
  createEmailContent,
};
