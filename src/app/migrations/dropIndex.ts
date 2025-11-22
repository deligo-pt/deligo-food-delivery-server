import mongoose from 'mongoose';

export const dropIndex = async (collectionName: string, indexName: string) => {
  const collection = mongoose.connection.collection(collectionName);

  console.log(`Checking "${indexName}" index in "${collectionName}"...`);

  const indexes = await collection.indexes();
  const exists = indexes.some((idx) => idx.name === indexName);

  if (!exists) {
    console.log(`Index "${indexName}" does not exist. Skipping...`);
    return;
  }

  console.log(`Dropping index "${indexName}"...`);
  await collection.dropIndex(indexName);

  console.log(`Successfully removed "${indexName}"`);
};
