/* eslint-disable @typescript-eslint/no-explicit-any */

import { Schema } from 'mongoose';

export const userSchemaPlugin = <T extends { email?: string }>(
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

  // Static: Check if user exists by userId
  schema.statics.isUserExistsByUserId = async function (
    customUserId: string,
    isDeleted?: boolean,
  ) {
    const query: any = { customUserId };
    if (typeof isDeleted === 'boolean') {
      query.isDeleted = isDeleted;
    }
    return await this.findOne(query).select('+password');
  };
};
