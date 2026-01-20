import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import { catchAsync } from '../utils/catchAsync';

export const parseBody = catchAsync(async (req, res, next) => {
  const singleFile = req.file;
  const multipleFiles = req.files;
  const hasFiles =
    !!singleFile ||
    (Array.isArray(multipleFiles) && multipleFiles.length > 0) ||
    (multipleFiles &&
      typeof multipleFiles === 'object' &&
      Object.keys(multipleFiles).length > 0);

  const hasData = req.body?.data;

  if (hasData) {
    try {
      req.body = JSON.parse(req.body.data);
      return next();
    } catch (error) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Invalid JSON data');
    }
  }

  if (hasFiles && !hasData) {
    req.body = {};
    return next();
  }

  throw new AppError(
    httpStatus.BAD_REQUEST,
    'Please provide required data or an image file as form data',
  );
});
