import { Schema } from 'mongoose';

export const localizedSchema = new Schema(
  {
    en: { type: String, required: true },
    pt: { type: String, required: true },
  },
  { _id: false },
);
