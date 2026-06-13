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
      throw new AppError(
        httpStatus.NOT_FOUND,
        `File not found at path: ${localFilePath}`,
      );
    }

    if (stats.size === 0) {
      await fs.unlink(localFilePath).catch(() => {});
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Empty file cannot be uploaded to Cloudinary',
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
  } catch (error: any) {
    await fs.unlink(localFilePath).catch(() => {});

    console.error('Cloudinary Upload Failed:', error.message || error);

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || 'File upload failed',
    );
  }
};
