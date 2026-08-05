import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import { AuthUser } from '../AuthUser/authUser.model';
import { LoginHistory } from './loginHistory.model';

const loginHistorySearchableFields = [
  'email',
  'ipAddress',
  'city',
  'country',
  'browser',
  'os',
  'status',
  'failureReason',
  'sessionId',
];

const resolveAuthUserId = async (currentUser: TCurrentUser) => {
  const authUser = await AuthUser.findOne({
    userId: currentUser.userId,
    role: currentUser.role,
  })
    .select('_id')
    .lean();

  if (!authUser) {
    throw new AppError(httpStatus.NOT_FOUND, 'USER_NOT_FOUND');
  }

  return authUser._id;
};

const getAllLoginHistory = async (
  incomingQuery: Record<string, unknown>,
  currentUser: TCurrentUser,
) => {
  const query = { ...incomingQuery };

  if (!query.sortBy) {
    query.sortBy = '-loginAt';
  }

  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);

  if (!isAdmin) {
    query.userId = await resolveAuthUserId(currentUser);
  }

  const loginHistoryQuery = new QueryBuilder(LoginHistory.find(), query)
    .search(loginHistorySearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const [meta, data] = await Promise.all([
    loginHistoryQuery.countTotal(),
    loginHistoryQuery.modelQuery,
  ]);

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: undefined,
    meta,
    data,
  };
};

const getSingleLoginHistory = async (id: string, currentUser: TCurrentUser) => {
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  const query: Record<string, unknown> = { _id: id };

  if (!isAdmin) {
    query.userId = await resolveAuthUserId(currentUser);
  }

  const loginHistory = await LoginHistory.findOne(query);

  if (!loginHistory) {
    throw new AppError(httpStatus.NOT_FOUND, 'LOGIN_HISTORY_NOT_FOUND');
  }

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: undefined,
    data: loginHistory,
  };
};

export const LoginHistoryServices = {
  getAllLoginHistory,
  getSingleLoginHistory,
};
