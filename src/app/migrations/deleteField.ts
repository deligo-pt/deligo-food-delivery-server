import mongoose from 'mongoose';

type TDeleteFieldOptions = {
  collectionName: string;
  fieldName: string;
};

export const deleteField = async ({
  collectionName,
  fieldName,
}: TDeleteFieldOptions) => {
  const col = mongoose.connection.collection(collectionName);

  console.log(`Deleting field "${fieldName}" from "${collectionName}"...`);

  const result = await col.updateMany(
    { [fieldName]: { $exists: true } },
    { $unset: { [fieldName]: '' } }
  );

  console.log(
    `Deleted field "${fieldName}" from ${result.modifiedCount} documents.`
  );
};
