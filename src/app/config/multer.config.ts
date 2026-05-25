import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { cloudinaryUpload } from './cloudinary.config';

const removeExtension = (filename: string) => {
  return filename.split('.').slice(0, -1).join('.');
};

const storage = new CloudinaryStorage({
  cloudinary: cloudinaryUpload,
  params: {
    public_id: (_req, file) => {
      const cleanName = removeExtension(file.originalname)
        .toLowerCase()
        .replace(/[^\w-]/g, '-');

      return (
        Math.random().toString(36).substring(2) +
        '-' +
        Date.now() +
        '-' +
        file.fieldname +
        '-' +
        cleanName
      );
    },
  },
});
export const multerUpload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});
