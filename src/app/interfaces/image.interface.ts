import { Express } from 'express';

export type TImageFiles = { [fieldname: string]: Express.Multer.File[] };

export type TImageFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
  path?: string;
  filename?: string;
};
