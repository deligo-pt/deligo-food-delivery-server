// import * as fs from 'fs';
import fs from 'fs/promises';
import * as path from 'path';
import Handlebars from 'handlebars';
import nodemailer from 'nodemailer';
import config from '../config';
import AppError from '../errors/AppError';
import httpStatus from 'http-status';
import { RedisService } from '../config/redis';

Handlebars.registerHelper('eq', (a, b) => a === b);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  pool: true,
  auth: {
    user: config.sender_email,
    pass: config.sender_app_password,
  },
  tls: {
    rejectUnauthorized: false,
  },
});
const sendEmail = async (email: string, html: string, subject: string) => {
  try {
    return await transporter.sendMail({
      from: `"DeliGo" <${config.sender_email}>`,
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error('Nodemailer Error:', error);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to send email',
    );
  }
};

const createEmailContent = async (data: object, templateType: string) => {
  try {
    const redisKey = `email_template:${templateType}`;

    let templateSource = await RedisService.get<string>(redisKey);

    if (!templateSource) {
      const templatePath = path.join(
        process.cwd(),
        'views',
        `${templateType}.template.hbs`,
      );

      try {
        templateSource = await fs.readFile(templatePath, 'utf8');

        await RedisService.set(redisKey, templateSource, 86400);
      } catch (err) {
        throw new Error(`Email template '${templateType}' not found.`);
      }
    }

    const template = Handlebars.compile(templateSource);
    return template(data);
  } catch (error) {
    console.error('Template Generation Error:', (error as Error).message);
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      (error as Error).message,
    );
  }
};

export const EmailHelper = {
  sendEmail,
  createEmailContent,
};
