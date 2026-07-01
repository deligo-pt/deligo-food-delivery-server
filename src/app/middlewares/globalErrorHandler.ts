/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import config from '../config';
import AppError from '../errors/AppError';
import handleCastError from '../errors/handleCastError';
import handleValidationError from '../errors/handleValidationError';
import handleZodError from '../errors/handleZodError';
import handleDuplicateError from '../errors/handlerDuplicateError';
import { TErrorSources } from '../interfaces/error.interface';
import { TImageFiles } from '../interfaces/image.interface';
import { deleteImageFromCloudinary } from '../utils/deleteImage';
import multer from 'multer';
import { ErrorLog } from '../modules/ErrorLog/errorLog.schema';
import { localizedMessages, TMessageKey } from '../errors/messages';

type TMessageFunction = (
  vars: Record<string, string | number | boolean>,
) => string;

const globalErrorHandler: ErrorRequestHandler = async (err, req, res, next) => {
  const lang = (req as unknown as { lang?: 'en' | 'pt' }).lang || 'en';

  let statusCode = 500;

  let message: string =
    localizedMessages.SOMETHING_WENT_WRONG[lang] ||
    localizedMessages.SOMETHING_WENT_WRONG['en'];

  let errorSources: TErrorSources = [
    {
      path: '',
      message,
    },
  ];

  if (req.files && Object.keys(req.files).length > 0) {
    try {
      await deleteImageFromCloudinary(req.files as TImageFiles);
    } catch (deleteError) {
      console.error('Failed to delete images:', deleteError);
    }
  }

  if (err instanceof multer.MulterError) {
    statusCode = 400;
    let errorKey: TMessageKey = 'SOMETHING_WENT_WRONG';

    if (err.code === 'LIMIT_FILE_SIZE') {
      errorKey = 'FILE_TOO_LARGE';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      errorKey = 'FILE_COUNT_EXCEEDED';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      errorKey = 'UNEXPECTED_FILE_FIELD';
    }

    const target = localizedMessages[errorKey];
    if (target) {
      const msgTemplate = target[lang] || target['en'];
      message =
        typeof msgTemplate === 'function'
          ? (msgTemplate as () => string)()
          : (msgTemplate as string);
    } else {
      message = err.message;
    }

    errorSources = [
      {
        path: err.field as string,
        message: message,
      },
    ];
  } else if (err instanceof ZodError) {
    const simplifiedError = handleZodError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (err?.name === 'ValidationError') {
    const simplifiedError = handleValidationError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (err?.name === 'CastError') {
    const simplifiedError = handleCastError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (err?.code === 11000) {
    const simplifiedError = handleDuplicateError(err);
    statusCode = simplifiedError?.statusCode;
    message = simplifiedError?.message;
    errorSources = simplifiedError?.errorSources;
  } else if (err instanceof AppError) {
    statusCode = err?.statusCode;

    const target = localizedMessages[err.errorKey];
    if (target) {
      const msgTemplate = target[lang] || target['en'];

      message =
        typeof msgTemplate === 'function'
          ? (msgTemplate as TMessageFunction)(err.variables || {})
          : (msgTemplate as string);
    } else {
      message = err.message;
    }

    errorSources = [
      {
        path: '',
        message: message,
      },
    ];
  } else if (err instanceof Error) {
    message = err.message;
    errorSources = [
      {
        path: '',
        message: err?.message,
      },
    ];
  }

  if (statusCode >= 500) {
    try {
      const sanitizedBody = req.body ? { ...req.body } : {};
      if (sanitizedBody.password) sanitizedBody.password = '********';
      if (sanitizedBody.oldPassword) sanitizedBody.oldPassword = '********';
      const frontendUrl =
        req.headers.host || req.headers.referer || req.headers.origin || null;

      const serverErrorFallback = localizedMessages.UNKNOWN_SERVER_ERROR
        ? localizedMessages.UNKNOWN_SERVER_ERROR['en']
        : 'Unknown Server Error';

      await ErrorLog.create({
        message: message || err?.message || serverErrorFallback,
        stack: err?.stack || null,
        statusCode,
        userId:
          (req as unknown as { user?: { userId: string } }).user?.userId ||
          null,
        requestDetails: {
          method: req.method,
          url: req.originalUrl,
          frontendUrl,
          ip: req.ip || req.headers['x-forwarded-for'] || '',
          body: Object.keys(sanitizedBody).length ? sanitizedBody : null,
        },
      });
    } catch (dbLoggingError) {
      console.error('Database Error Logging Failed:', dbLoggingError);
    }
  }

  // ultimate return
  return res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    err,
    stack: config.NODE_ENV === 'development' ? err?.stack : null,
  });
};

export default globalErrorHandler;
