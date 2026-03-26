import { TImageFile } from '../../interfaces/image.interface';

/**
 * Service to handle post-upload logic if needed.
 * Since multer-storage-cloudinary handles the upload,
 * we just extract the secure_url from the file object.
 */
const processUploadedFiles = async (files: TImageFile[]): Promise<string[]> => {
  // Extracting the path (Cloudinary URL) from each uploaded file object
  const fileUrls = files.map((file: TImageFile) => file.path);
  return fileUrls;
};

export const UploadService = {
  processUploadedFiles,
};
