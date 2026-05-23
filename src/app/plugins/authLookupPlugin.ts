/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema } from 'mongoose';

export const authLookupPlugin = <T extends { email?: string }>(
  schema: Schema<T>,
): void => {
  // Static: Check if user exists by email
  schema.statics.isUserExistsByEmail = async function (
    email: string,
    isDeleted?: boolean,
    fields?: string,
  ) {
    const query: any = { email };
    if (typeof isDeleted === 'boolean') {
      query.isDeleted = isDeleted;
    }

    // let dbQuery = this.findOne(query).lean(); /--> before
    let dbQuery = this.findOne(query);

    if (fields) {
      dbQuery = dbQuery.select(fields);
    } else {
      dbQuery = dbQuery.select('+password');
    }

    return await dbQuery;
  };

  // Static: Check if user exists by userCustomId
  schema.statics.isUserExistsByUserId = async function (
    userCustomId: string,
    isDeleted?: boolean,
  ) {
    const query: any = { userCustomId };
    if (typeof isDeleted === 'boolean') {
      query.isDeleted = isDeleted;
    }
    return await this.findOne(query).select('+password');
  };
};
