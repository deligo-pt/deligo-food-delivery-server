import multer from 'multer';

const storage = multer.memoryStorage();

export const multerUpload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});
