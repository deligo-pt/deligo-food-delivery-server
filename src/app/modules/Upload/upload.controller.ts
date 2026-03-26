import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UploadService } from './upload.service';
import { TImageFile } from '../../interfaces/image.interface';

const uploadFiles = catchAsync(async (req, res) => {
  const files = req.files as TImageFile[];

  // Get the Cloudinary URLs from the service
  const urls = await UploadService.processUploadedFiles(files);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Files uploaded to Cloudinary successfully',
    data: urls, // Frontend will use these URLs for Support sendMessage API
  });
});

export const UploadControllers = {
  uploadFiles,
};
