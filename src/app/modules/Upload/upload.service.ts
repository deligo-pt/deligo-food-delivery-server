// upload.service.ts
import { TImageFile } from '../../interfaces/image.interface';
import { uploadAndOptimizeImage } from '../../utils/storage';

const processUploadedFiles = async (files: TImageFile[]): Promise<string[]> => {
  if (!files || files.length === 0) return [];

  const uploadPromises = files.map(async (file: TImageFile) => {
    const imageUrl = await uploadAndOptimizeImage(
      file.buffer,
      file.originalname,
      file.fieldname,
    );
    return imageUrl;
  });

  const fileUrls = await Promise.all(uploadPromises);
  return fileUrls;
};

const processUploadedFilesWithMessage = async (files: TImageFile[]) => {
  const fileUrls = await processUploadedFiles(files);
  return {
    messageKey: 'FILES_UPLOADED_TO_RUSTFS_SUCCESS',
    data: fileUrls,
  };
};

export const UploadService = {
  processUploadedFiles,
  processUploadedFilesWithMessage,
};
