import { cloudinaryUpload } from '../config/cloudinary.config';
import { TImageFiles } from '../interfaces/image.interface';

export const deleteImageFromCloudinary = (files: TImageFiles) => {
  const publicIds: string[] = [];

  // If files is an array (as in req.files)
  if (Array.isArray(files)) {
    for (const file of files) {
      if (file.filename) publicIds.push(file.filename);
    }
  } else {
    // If files is an object (as in req.files from multer.fields)
    for (const file of Object.values(files)) {
      if (Array.isArray(file)) {
        for (const image of file) {
          if (image.filename) publicIds.push(image.filename);
        }
      } else if (
        file &&
        typeof file === 'object' &&
        'filename' in file &&
        typeof (file as { filename?: string }).filename === 'string'
      ) {
        publicIds.push((file as { filename: string }).filename);
      }
    }
  }

  return new Promise((resolve, reject) => {
    cloudinaryUpload.api.delete_resources(
      publicIds,
      { resource_type: 'image' },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
  });
};

export const deleteSingleImageFromCloudinary = async (imageUrl: string) => {
  const publicId = imageUrl.split('/').pop()?.split('.')[0];
  if (!publicId) return;

  return new Promise((resolve, reject) => {
    cloudinaryUpload.api.delete_resources(
      [publicId],
      { resource_type: 'image' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
  });
};
