import mongoose from 'mongoose';
import config from '../config';

export const dropIndex = async (collectionName: string, indexName: string) => {
  const collection = mongoose.connection.collection(collectionName);

  if (config.NODE_ENV === 'development') {
    console.log(`Checking "${indexName}" index in "${collectionName}"...`);
  }

  const indexes = await collection.indexes();
  const exists = indexes.some((idx) => idx.name === indexName);

  if (!exists) {
    if (config.NODE_ENV === 'development') {
      console.log(`Index "${indexName}" does not exist. Skipping...`);
    }
    return;
  }

  if (config.NODE_ENV === 'development') {
    console.log(`Dropping index "${indexName}"...`);
  }

  await collection.dropIndex(indexName);

  if (config.NODE_ENV === 'development') {
    console.log(`Successfully removed "${indexName}"`);
  }
};
