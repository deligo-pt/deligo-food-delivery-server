/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';

type TAddFieldInput = {
  collectionName: string;
  fieldName: string;
  defaultValue: any;
};

export const addMissingField = async ({
  collectionName,
  fieldName,
  defaultValue,
}: TAddFieldInput) => {
  const collection = mongoose.connection.collection(collectionName);

  console.log(`Adding missing field "${fieldName}" to old documents...`);

  await collection.updateMany(
    { [fieldName]: { $exists: false } },
    { $set: { [fieldName]: defaultValue } }
  );

  console.log(`Field "${fieldName}" added successfully!`);
};
