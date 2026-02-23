import mongoose from 'mongoose';
import config from '../config';

export const listIndexes = async (collectionName: string) => {
  const collection = mongoose.connection.collection(collectionName);

  if (config.NODE_ENV === 'development') {
    console.log(`Fetching indexes from "${collectionName}"...`);
  }

  const indexes = await collection.indexes();

  if (config.NODE_ENV === 'development') {
    console.log('Available Indexes:');
  }

  console.table(indexes);

  return indexes;
};
