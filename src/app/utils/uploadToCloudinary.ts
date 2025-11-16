import { cloudinaryUpload } from '../config/cloudinary.config';

export const uploadToCloudinary = (fileBuffer: Buffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    cloudinaryUpload.uploader
      .upload_stream({ folder: 'products' }, (error, result) => {
        if (error) return reject(error);
        resolve(result?.secure_url as string);
      })
      .end(fileBuffer);
  });
};
