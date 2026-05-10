import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';

export const uploadLocalFileToCloudinary = async (
  localFilePath: string,
  folder: string,
  publicId: string,
  resourceType: 'image' | 'raw' | 'auto' = 'auto',
): Promise<string> => {
  const result = await cloudinary.uploader.upload(localFilePath, {
    folder,
    public_id: publicId,
    resource_type: resourceType,
    overwrite: true,
  });

  // Delete temporary local file
  await fs.unlink(localFilePath).catch(() => {});

  return result.secure_url;
};
