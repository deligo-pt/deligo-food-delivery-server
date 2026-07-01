import httpStatus from 'http-status';
import { QueryBuilder } from '../../builder/QueryBuilder';
import {
  ROLE_COLLECTION_MAP,
  TUserRole,
} from '../../constant/GlobalConstant/user.constant';
import { TCurrentUser } from '../../constant/GlobalInterface/user.interface';
import AppError from '../../errors/AppError';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { TSos } from './sos.interface';
import { SosModel } from './sos.model';
import mongoose from 'mongoose';
import { getIO } from '../../lib/Socket';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';
import { TMessageKey } from '../../errors/messages';

// trigger SOS service
const triggerSos = async (
  payload: Partial<TSos>,
  currentUser: TCurrentUser,
) => {
  const userModelType = ROLE_COLLECTION_MAP[currentUser.role as TUserRole];
  const sosLocation = currentUser.currentSessionLocation?.coordinates;
  if (!sosLocation) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'COULD_NOT_DETERMINE_CURRENT_LOCATION_ENABLE_GPS',
    );
  }
  const sosData = {
    ...payload,
    userId: {
      id: currentUser._id,
      model: userModelType,
    },
    role: currentUser.role,
    status: 'ACTIVE',
    location: {
      type: 'Point',
      coordinates: sosLocation,
    },
  };
  const result = await SosModel.create(sosData);

  if (!result) {
    throw new AppError(httpStatus.BAD_REQUEST, 'FAILED_TO_TRIGGER_SOS');
  }

  getIO().to('SOS_ALERTS_POOL').emit('new-sos-alert', {
    message: 'Emergency SOS Triggered!',
    data: result,
  });

  return {
    messageKey: 'SOS_TRIGGERED_SUCCESS_HELP_ON_WAY' as TMessageKey,
    data: result,
  };
};

// update sos status in db
const updateSosStatus = async (
  id: string,
  adminId: string,
  payload: { status: TSos['status']; note?: string },
) => {
  const isSosExist = await SosModel.findById(id);
  if (!isSosExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'SOS_ALERT_NOT_FOUND');
  }

  if (isSosExist.status === 'RESOLVED') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'RESOLVED_SOS_CANNOT_BE_CHANGED',
    );
  }

  if (isSosExist.status === payload.status) {
    throw new AppError(httpStatus.BAD_REQUEST, 'SOS_ALREADY_IN_STATUS', {
      status: payload.status,
    });
  }

  const updateData: Partial<TSos> = {
    status: payload.status,
    resolvedBy: new mongoose.Types.ObjectId(adminId),
  };

  if (payload.note) {
    updateData.userNote = `${
      isSosExist.userNote ? isSosExist.userNote + ' | ' : ''
    }Admin Note: ${payload.note}`;
  }

  if (payload.status === 'RESOLVED') {
    updateData.resolvedAt = new Date();
  }

  const result = await SosModel.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (result) {
    getIO().emit(`sos-status-updated-${id}`, result);
  }

  return {
    messageKey: 'SOS_STATUS_UPDATED_SUCCESS' as TMessageKey,
    data: result,
  };
};

// get nearby sos alerts
const getNearbySosAlerts = async (currentUser: TCurrentUser) => {
  const radiusInMeters = 5000; // 5km
  const sosLocation = currentUser.currentSessionLocation?.coordinates;
  if (!sosLocation) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'COULD_NOT_DETERMINE_CURRENT_LOCATION_ENABLE_GPS',
    );
  }
  const [longitude, latitude] = sosLocation;

  const result = await SosModel.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: radiusInMeters,
      },
    },
    status: 'ACTIVE',
  });
  return {
    messageKey: 'NEARBY_SOS_ALERTS_RETRIEVED_SUCCESS' as TMessageKey,
    data: result,
  };
};

// get all sos alerts
const getAllSosAlerts = async (
  query: Record<string, unknown>,
  currentUser: TCurrentUser,
) => {
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentUser.role);
  let filterConditions = {};

  if (isAdmin) {
    filterConditions = {};
  } else if (currentUser.role === 'FLEET_MANAGER') {
    const partners = await DeliveryPartner.find({
      'registeredBy.id': currentUser._id.toString(),
    }).select('_id');

    const partnerIds = partners.map((p) => p._id);

    filterConditions = { 'userId.id': { $in: partnerIds } };
  } else {
    filterConditions = { 'userId.id': currentUser._id };
  }
  const sosQuery = new QueryBuilder(SosModel.find(filterConditions), query)
    .search(['status', 'role', 'issueTags'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const populateOptions = getPopulateOptions(currentUser.role, {
    id: 'name userId',
    resolvedBy: 'name userId role',
  });

  populateOptions.forEach((option) => {
    sosQuery.modelQuery = sosQuery.modelQuery.populate(option);
  });

  const data = await sosQuery.modelQuery.exec();
  const meta = await sosQuery.countTotal();

  return {
    messageKey: 'SOS_ALERTS_RETRIEVED_SUCCESS' as TMessageKey,
    meta,
    data,
  };
};

// get single sos alert by id
const getSingleSosAlert = async (id: string, currentUser: TCurrentUser) => {
  const result = await SosModel.findById(id).populate(
    'resolvedBy',
    'name email',
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'SOS_ALERT_NOT_FOUND_SINGLE');
  }

  if (currentUser.role === 'FLEET_MANAGER') {
    const partner = await DeliveryPartner.findById(result.userId.id);

    if (
      !partner ||
      partner?.registeredBy?.id.toString() !== currentUser._id.toString()
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'NOT_AUTHORIZED_TO_VIEW_SOS_ALERT',
      );
    }
  }

  return {
    messageKey: 'SOS_ALERT_RETRIEVED_SUCCESS' as TMessageKey,
    data: result,
  };
};

// get sos alerts by user id
const getUserSosHistory = async (
  currentUser: TCurrentUser,
  userId: string,
  query: Record<string, unknown>,
) => {
  const sosQuery = new QueryBuilder(
    SosModel.find({ 'userId.id': userId }),
    query,
  )
    .search(['status', 'role', 'issueTags'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const populateOptions = getPopulateOptions(currentUser.role, {
    id: 'name',
    resolvedBy: 'name userId role',
  });

  populateOptions.forEach((option) => {
    sosQuery.modelQuery = sosQuery.modelQuery.populate(option);
  });

  const data = await sosQuery.modelQuery;
  const meta = await sosQuery.countTotal();

  return {
    messageKey: 'SOS_ALERTS_RETRIEVED_SUCCESS' as TMessageKey,
    meta,
    data,
  };
};

// get sos stats
const getSosStats = async (currentUser: TCurrentUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      'NOT_APPROVED_TO_VIEW_SOS_STATS_WITH_STATUS',
      { status: currentUser.status },
    );
  }
  const stats = await SosModel.aggregate([
    {
      $group: {
        _id: '$userId.model',
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        userType: '$_id',
        count: 1,
      },
    },
  ]);

  const formattedStats = {
    Vendor: 0,
    FleetManager: 0,
    DeliveryPartner: 0,
    total: 0,
  };

  stats.forEach((item) => {
    if (item.userType in formattedStats) {
      formattedStats[item.userType as keyof typeof formattedStats] = item.count;
      formattedStats.total += item.count;
    }
  });

  return {
    messageKey: 'SOS_STATS_RETRIEVED_SUCCESS' as TMessageKey,
    data: formattedStats,
  };
};

export const SosService = {
  triggerSos,
  updateSosStatus,
  getNearbySosAlerts,
  getAllSosAlerts,
  getSingleSosAlert,
  getUserSosHistory,
  getSosStats,
};
