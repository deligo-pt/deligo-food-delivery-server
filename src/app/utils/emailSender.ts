// import * as fs from 'fs';
import fs from 'fs/promises';
import * as path from 'path';
import Handlebars from 'handlebars';
import nodemailer from 'nodemailer';
import config from '../config';
import AppError from '../errors/AppError';
import httpStatus from 'http-status';
import { RedisService } from '../config/redis';
import { EmailLog } from '../modules/log/emailLog.model';
import { ErrorLog } from '../modules/ErrorLog/errorLog.schema';

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

const persistEmailLog = async (payload: {
  to: string;
  subject: string;
  status: 'SUCCESS' | 'FAILED';
  providerMessageId?: string;
  providerResponse?: string;
  errorMessage?: string;
  errorCode?: string;
  errorStack?: string;
}) => {
  const safeTo =
    typeof payload.to === 'string' && payload.to.trim()
      ? payload.to.trim()
      : 'unknown@invalid.local';
  const safeSubject =
    typeof payload.subject === 'string' && payload.subject.trim()
      ? payload.subject.trim()
      : '(no-subject)';

  try {
    await EmailLog.create({
      to: safeTo,
      subject: safeSubject,
      status: payload.status,
      providerMessageId: payload.providerMessageId || '',
      providerResponse: payload.providerResponse || '',
      errorMessage: payload.errorMessage || '',
      errorCode: payload.errorCode || '',
      errorStack: payload.errorStack || '',
    });
  } catch (logError) {
    try {
      const err = logError as Error & { code?: string };

      await ErrorLog.create({
        message: `EmailLog persistence failed: ${err?.message || 'Unknown error'}`,
        stack: err?.stack || null,
        statusCode: 500,
        userId: null,
        requestDetails: {
          method: 'SYSTEM',
          url: 'EmailHelper.sendEmail',
          frontendUrl: null,
          ip: null,
          body: {
            emailLogPayload: {
              to: safeTo,
              subject: safeSubject,
              status: payload.status,
              providerMessageId: payload.providerMessageId || '',
              providerResponse: payload.providerResponse || '',
            },
            failure: {
              code: err?.code || '',
              message: err?.message || '',
            },
          },
        },
      });
    } catch (fallbackError) {
      void fallbackError;
    }
  }
};

const sendEmail = async (
  email: string,
  html: string,
  subject: string,
  options?: { shouldLog?: boolean },
) => {
  const shouldLog = options?.shouldLog !== false;

  try {
    const info = await transporter.sendMail({
      from: `"DeliGo" <${config.sender_email}>`,
      to: email,
      subject,
      html,
    });

    if (shouldLog) {
      await persistEmailLog({
        to: email,
        subject,
        status: 'SUCCESS',
        providerMessageId: info?.messageId,
        providerResponse: info?.response,
      });
    }

    return info;
  } catch (error) {
    const err = error as Error & {
      code?: string;
      response?: string;
      messageId?: string;
    };

    if (shouldLog) {
      await persistEmailLog({
        to: email,
        subject,
        status: 'FAILED',
        providerMessageId: err?.messageId,
        providerResponse: err?.response,
        errorMessage: err?.message || 'Unknown email sending error',
        errorCode: err?.code,
        errorStack: err?.stack,
      });
    }

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'FAILED_TO_SEND_EMAIL',
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
    void error;
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'EMAIL_CONTENT_GENERATION_FAILED',
      {
        message: (error as Error).message,
      },
    );
  }
};

export const EmailHelper = {
  sendEmail,
  createEmailContent,
  transporter,
};
