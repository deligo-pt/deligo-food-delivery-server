import AppError from '../errors/AppError';
import { catchAsync } from '../utils/catchAsync';

export const parseBody = catchAsync(async (req, res, next) => {
  const hasFiles =
    req.files &&
    (Array.isArray(req.files)
      ? req.files.length > 0
      : Object.keys(req.files).length > 0);

  const hasData = req.body?.data;

  if (hasData) {
    req.body = JSON.parse(req.body.data);
    return next();
  }

  if (hasFiles && !hasData) {
    req.body = {};
    return next();
  }

  throw new AppError(
    400,
    'Please provide required data or an image file as form data'
  );
});
