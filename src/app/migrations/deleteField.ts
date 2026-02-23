import mongoose from 'mongoose';
import config from '../config';

type TDeleteFieldOptions = {
  collectionName: string;
  fieldName: string;
};

export const deleteField = async ({
  collectionName,
  fieldName,
}: TDeleteFieldOptions) => {
  const col = mongoose.connection.collection(collectionName);

  if (config.NODE_ENV === 'development') {
    console.log(`Deleting field "${fieldName}" from "${collectionName}"...`);
  }

  const result = await col.updateMany(
    { [fieldName]: { $exists: true } },
    { $unset: { [fieldName]: '' } },
  );

  if (config.NODE_ENV === 'development') {
    console.log(
      `Deleted field "${fieldName}" from ${result.modifiedCount} documents.`,
    );
  }
};
