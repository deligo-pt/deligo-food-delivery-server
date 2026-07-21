import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import AppError from '../errors/AppError';
import httpStatus from 'http-status';

export const uploadLocalFileToCloudinary = async (
  localFilePath: string,
  folder: string,
  publicId: string,
  resourceType: 'image' | 'raw' | 'auto' = 'auto',
): Promise<string> => {
  try {
    const stats = await fs.stat(localFilePath).catch(() => null);

    if (!stats) {
      throw new AppError(httpStatus.NOT_FOUND, 'FILE_NOT_FOUND_AT_PATH', {
        localFilePath,
      });
    }

    if (stats.size === 0) {
      await fs.unlink(localFilePath).catch(() => {});
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'EMPTY_FILE_CANNOT_BE_UPLOADED_TO_CLOUDINARY',
      );
    }

    const result = await cloudinary.uploader.upload(localFilePath, {
      folder,
      public_id: publicId,
      resource_type: resourceType,
      overwrite: true,
    });

    await fs.unlink(localFilePath).catch(() => {});

    return result.secure_url;
  } catch (error: unknown) {
    await fs.unlink(localFilePath).catch(() => {});
    void error;

    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'FILE_UPLOAD_FAILED', {
      message:
        error instanceof Error
          ? error.message
          : String(error || 'File upload failed'),
    });
  }
};
