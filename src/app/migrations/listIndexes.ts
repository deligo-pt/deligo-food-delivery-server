import mongoose from 'mongoose';

export const listIndexes = async (collectionName: string) => {
  const collection = mongoose.connection.collection(collectionName);

  console.log(`Fetching indexes from "${collectionName}"...`);

  const indexes = await collection.indexes();
  console.log('Available Indexes:');
  console.table(indexes);

  return indexes;
};
