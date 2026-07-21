import { QueryBuilder } from '../../builder/QueryBuilder';
import { searchableFields } from './activityLog.constant';
import { ActivityLog } from './activityLog.model';

const getAllActivityLogs = async (query: Record<string, unknown>) => {
  const activityLogQuery = new QueryBuilder(ActivityLog.find(), query)
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await activityLogQuery.modelQuery;
  const meta = await activityLogQuery.countTotal();

  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Activity Logs', isPlural: true },
    meta,
    data: result,
  };
};

const getSingleActivityLog = async (id: string) => {
  const result = await ActivityLog.findById(id);
  if (!result) {
    return {
      messageKey: 'NOT_FOUND_MESSAGE',
      variables: { entity: 'Activity Log', isPlural: false },
      data: null,
    };
  }
  return {
    messageKey: 'DATA_LOAD_SUCCESS',
    variables: { entity: 'Activity Log', isPlural: false },
    data: result,
  };
};

export const ActivityLogServices = {
  getAllActivityLogs,
  getSingleActivityLog,
};
