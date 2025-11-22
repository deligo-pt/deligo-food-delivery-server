import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { listIndexes } from './listIndexes';
import { dropIndex } from './dropIndex';
import { addMissingField } from './addMissingField';
import config from '../config';
import { convertFieldType } from './convertType';
import { deleteField } from './deleteField';

dotenv.config();

const args = process.argv.slice(2);

/*
 Commands:
 ---------------------------
 List all indexes:
 npm run migration:run -- list products

 Drop an index:
 npm run migration:run -- drop products productId_1

 Add missing field:
 npm run migration:run -- add-field products itemId "N/A"

 Convert field type:
 npm run migration:run -- convert-type products rating number
*/

const command = args[0];
const collectionName = args[1];
const arg3 = args[2];
const arg4 = args[3];

if (!command || !collectionName) {
  console.log('Usage:');
  console.log('List indexes  : npm run migration:run -- list <collection>');
  console.log(
    'Drop index    : npm run migration:run -- drop <collection> <indexName>'
  );
  console.log(
    'Add field     : npm run migration:run -- add-field <collection> <field> <defaultValue>'
  );
  process.exit(1);
}

const run = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.db_url as string);

    // 1) List indexes
    if (command === 'list') {
      await listIndexes(collectionName);
    }

    // 2) Drop index
    if (command === 'drop') {
      if (!arg3) throw new Error('Index name missing');
      await dropIndex(collectionName, arg3);
    }

    // 3) Add missing field to old data
    if (command === 'add-field') {
      if (!arg3) throw new Error('Field name missing');
      if (!arg4) throw new Error('Default value missing');

      await addMissingField({
        collectionName,
        fieldName: arg3,
        defaultValue: arg4,
      });
    }

    // 4) Convert field type
    if (command === 'convert-type') {
      if (!arg3) throw new Error('Field name missing');
      if (!arg4) throw new Error('Target type missing');

      await convertFieldType({
        collectionName,
        fieldName: arg3,
        targetType: arg4,
      });
    }

    // 5) Delete field
    if (command === 'delete-field') {
      if (!arg3) throw new Error('Field name missing');

      await deleteField({
        collectionName,
        fieldName: arg3,
      });
    }

    console.log('Migration finished successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration Error:', err);
    process.exit(1);
  }
};

run();
