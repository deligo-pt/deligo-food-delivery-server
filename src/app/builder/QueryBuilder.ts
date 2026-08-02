/* eslint-disable prefer-const */
import { FilterQuery, Query } from 'mongoose';

// Strips Mongo operator keys ($ne, $gt, $where, ...) and dotted paths from
// client-supplied query objects so they can't override intended filters or
// inject arbitrary query operators (NoSQL injection via ?field[$ne]=...).
const sanitizeMongoOperators = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sanitizeMongoOperators);
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce(
      (acc: Record<string, unknown>, [key, val]) => {
        if (key.startsWith('$') || key.includes('.')) {
          return acc;
        }
        acc[key] = sanitizeMongoOperators(val);
        return acc;
      },
      {},
    );
  }
  return value;
};

export class QueryBuilder<T> {
  public query: Record<string, unknown>; //payload
  public modelQuery: Query<T[], T>;

  constructor(modelQuery: Query<T[], T>, query: Record<string, unknown>) {
    this.query = query;
    this.modelQuery = modelQuery;
  }
  search(searchableFields: string[]) {
    let searchTerm = '';

    if (this.query?.searchTerm) {
      searchTerm = this.query.searchTerm as string;
    }
    // {title: {$regex: searchTerm}}
    // {genre: {$regex: searchTerm}}
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    this.modelQuery = this.modelQuery.find({
      $or: searchableFields.map(
        (field) =>
          ({
            [field]: new RegExp(escapedSearchTerm, 'i'),
          }) as FilterQuery<T>,
      ),
    });
    return this;
  }
  paginate() {
    let limit: number = Number(this.query?.limit || 10);

    let skip: number = 0;

    if (this.query?.page) {
      const page: number = Number(this.query?.page || 1);
      skip = Number((page - 1) * limit);
    }

    this.modelQuery = this.modelQuery.skip(skip).limit(limit);

    return this;
  }
  sort() {
    let sortBy = '-createdAt';

    if (this.query?.sortBy) {
      sortBy = this.query.sortBy as string;
    }

    this.modelQuery = this.modelQuery.sort(sortBy);
    return this;
  }
  fields() {
    let fields = '';

    if (this.query?.fields) {
      fields = (this.query?.fields as string).split(',').join(' ');
    }

    this.modelQuery = this.modelQuery.select(fields);
    return this;
  }
  filter() {
    const queryObj = { ...this.query };
    const excludeFields = ['searchTerm', 'page', 'limit', 'sortBy', 'fields'];

    excludeFields.forEach((e) => delete queryObj[e]);

    this.modelQuery = this.modelQuery.find(
      sanitizeMongoOperators(queryObj) as FilterQuery<T>,
    );

    return this;
  }

  async countTotal() {
    const totalQueries = { ...this.modelQuery.getFilter() };

    let total = 0;

    const hasNearQuery =
      totalQueries.currentSessionLocation?.['$near'] ||
      totalQueries['currentSessionLocation.$near'];

    if (hasNearQuery) {
      const totalData = await this.modelQuery.model.find(totalQueries).lean();
      total = totalData.length;
    } else {
      total = await this.modelQuery.model.countDocuments(totalQueries);
    }

    const page = Number(this?.query?.page) || 1;
    const limit = Number(this?.query?.limit) || 10;
    const totalPage = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPage,
    };
  }
}
