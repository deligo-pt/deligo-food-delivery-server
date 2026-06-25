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

const globalErrorHandler: ErrorRequestHandler = async (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Something went wrong on the server!';
  let errorSources: TErrorSources = [
    {
      path: '',
      message: 'Something went wrong on the server!',
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

    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size is too large. Maximum limit is 5MB.';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'You cannot upload more than 5 files at a time.';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected field. Please check the key name (e.g., "files").';
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
    message = err.message;
    errorSources = [
      {
        path: '',
        message: err?.message,
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

      const frontendUrl = req.headers.referer || req.headers.origin || null;

      await ErrorLog.create({
        message: message || err?.message || 'Unknown Server Error',
        stack: err?.stack || null,
        statusCode,
        userId: (req as any).user?.userId || null,
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

  //ultimate return
  return res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    err,
    ...(config.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default globalErrorHandler;
