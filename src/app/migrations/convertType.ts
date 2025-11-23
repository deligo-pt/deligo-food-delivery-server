/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';

export const convertFieldType = async ({
  collectionName,
  fieldName,
  targetType,
}: {
  collectionName: string;
  fieldName: string;
  targetType: string;
}) => {
  const col = mongoose.connection.collection(collectionName);

  console.log(`Converting "${fieldName}" → (${targetType}) ...`);

  const docs = await col.find({ [fieldName]: { $exists: true } }).toArray();

  console.log(`Found ${docs.length} documents to process.`);

  for (const doc of docs) {
    const oldValue = doc[fieldName];
    let newValue: any = null;

    try {
      switch (targetType) {
        case 'number':
          newValue = Number(oldValue);
          if (isNaN(newValue)) newValue = 0;
          break;

        case 'string':
          newValue = String(oldValue);
          break;

        case 'boolean':
          if (typeof oldValue === 'boolean') {
            newValue = oldValue;
          } else if (
            oldValue === 'true' ||
            oldValue === '1' ||
            oldValue === 1
          ) {
            newValue = true;
          } else if (
            oldValue === 'false' ||
            oldValue === '0' ||
            oldValue === 0
          ) {
            newValue = false;
          } else {
            throw new Error(`Cannot convert "${oldValue}" → boolean`);
          }
          break;

        case 'date':
          newValue = new Date(oldValue);
          if (isNaN(newValue.getTime()))
            throw new Error(`Invalid date: "${oldValue}"`);
          break;

        case 'objectId':
          newValue = new mongoose.Types.ObjectId(oldValue);
          break;

        case 'array':
          if (Array.isArray(oldValue)) newValue = oldValue;
          else newValue = [oldValue];
          break;

        case 'null':
          newValue = null;
          break;

        case 'json':
          if (typeof oldValue === 'string') newValue = JSON.parse(oldValue);
          else newValue = oldValue;
          break;

        default:
          throw new Error(`Unsupported target type: ${targetType}`);
      }

      await col.updateOne(
        { _id: doc._id },
        { $set: { [fieldName]: newValue } }
      );

      console.log(`Converted _id=${doc._id}`);
    } catch (err) {
      console.log(`Skip _id=${doc._id} | Reason: ${(err as Error).message}`);
    }
  }

  console.log('Type conversion completed!');
};
