import { z } from 'zod';

const MAX_UPLOAD_SIZE = 1024 * 1024 * 3; // 3MB
const ACCEPTED_FILE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'png',
  'jpeg',
  'jpg',
] as const;

const ImageFileZodSchema = z
  .object({
    fieldname: z.string({ required_error: 'Field name is required' }),
    originalname: z.string({ required_error: 'Original file name is required' }),
    encoding: z.string({ required_error: 'File encoding is required' }),
    mimetype: z.enum(ACCEPTED_FILE_TYPES, {
      required_error: 'File type is required',
      invalid_type_error: 'File type must be one of PNG or JPEG',
    }),
    path: z.string({ required_error: 'File path is required' }),
    size: z
      .number({ required_error: 'File size is required' })
      .refine(
        (size) => size <= MAX_UPLOAD_SIZE,
        'File size must be less than 3MB',
      ),
    filename: z.string({ required_error: 'File name is required' }),
  })
  .strict();

export const ImageFilesArrayZodSchema = z
  .object({
    files: z
      .record(z.string(), z.array(ImageFileZodSchema), {
        required_error: 'Files are required',
      })
      .refine((files) => {
        return Object.keys(files).length > 0;
      }, 'At least one image is required'),
  })
  .strict();
