import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UploadService } from './upload.service';
import { TImageFile } from '../../interfaces/image.interface';

const uploadFiles = catchAsync(async (req, res) => {
  const files = req.files as TImageFile[];

  const result = await UploadService.processUploadedFilesWithMessage(files);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.data,
  });
});

export const UploadControllers = {
  uploadFiles,
};
