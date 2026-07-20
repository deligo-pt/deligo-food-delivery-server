import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
  DeleteObjectsCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import config from '../config';
import fs from 'fs';

const endpoint = config.rustfs.endpoint;
const accessKeyId = config.rustfs.accessKeyId;
const secretAccessKey = config.rustfs.secretAccessKey;
const bucketName = config.rustfs.bucketName;

if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
  throw new Error('Missing RustFS configuration in environment variables.');
}

const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: endpoint,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
  forcePathStyle: true,
});

const removeExtension = (filename: string): string => {
  return filename.split('.').slice(0, -1).join('.');
};

export const uploadAndOptimizeImage = async (
  fileBuffer: Buffer,
  originalName: string,
  fieldname: string,
): Promise<string> => {
  try {
    const optimizedBuffer: Buffer = await sharp(fileBuffer)
      .resize(800, 600, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const cleanName = removeExtension(originalName)
      .toLowerCase()
      .replace(/[^\w-]/g, '-');

    const randomString = Math.random().toString(36).substring(2);

    const fileName = `uploads/${randomString}-${Date.now()}-${fieldname}-${cleanName}.webp`;

    const uploadParams: PutObjectCommandInput = {
      Bucket: bucketName,
      Key: fileName,
      Body: optimizedBuffer,
      ContentType: 'image/webp',
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    return `${endpoint}/${bucketName}/${fileName}`;
  } catch (error) {
    console.error('RustFS Upload Error:', error);
    throw new Error('Failed to upload and optimize image to RustFS.');
  }
};

const extractKeyFromUrl = (imageUrl: string): string | null => {
  try {
    const searchString = `/${bucketName}/`;
    const index = imageUrl.indexOf(searchString);
    if (index === -1) return null;

    return imageUrl.substring(index + searchString.length);
  } catch (error) {
    return null;
  }
};

export const deleteSingleImageFromRustFS = async (
  imageUrl: string,
): Promise<void> => {
  try {
    const fileKey = extractKeyFromUrl(imageUrl);
    if (!fileKey) return;

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      }),
    );
    console.log(`Successfully deleted image from RustFS: ${fileKey}`);
  } catch (error) {
    console.error('RustFS Single Delete Error:', error);
    throw new Error('Failed to delete image from RustFS.');
  }
};

export const deleteMultipleImagesFromRustFS = async (
  imageUrls: string[],
): Promise<void> => {
  try {
    const objectsToDelete = imageUrls
      .map((url) => {
        const key = extractKeyFromUrl(url);
        return key ? { Key: key } : null;
      })
      .filter((obj): obj is { Key: string } => obj !== null);

    if (objectsToDelete.length === 0) return;

    await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: objectsToDelete,
          Quiet: true,
        },
      }),
    );
    console.log(
      `Successfully deleted ${objectsToDelete.length} images from RustFS.`,
    );
  } catch (error) {
    console.error('RustFS Multiple Delete Error:', error);
    throw new Error('Failed to delete multiple images from RustFS.');
  }
};

export const uploadLocalFileToRustFS = async (
  localPath: string,
  folder: string,
  fileNameWithoutExt: string,
  contentType: string,
): Promise<string> => {
  try {
    const fileBuffer = fs.readFileSync(localPath);

    const ext = contentType === 'application/pdf' ? 'pdf' : 'png';
    const fileName = `${folder}/${fileNameWithoutExt}.${ext}`;

    const uploadParams: PutObjectCommandInput = {
      Bucket: bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType,
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }

    return `${endpoint}/${bucketName}/${fileName}`;
  } catch (error) {
    console.error('RustFS Local File Upload Error:', error);
    throw new Error('Failed to upload file to RustFS.');
  }
};
