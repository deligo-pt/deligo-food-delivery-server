import httpStatus from 'http-status';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { AuthUser, ROLE_COLLECTION_MAP } from '../../constant/user.constant';
import AppError from '../../errors/AppError';
import { getPopulateOptions } from '../../utils/getPopulateOptions';
import { TSos } from './sos.interface';
import { SosModel } from './sos.model';
import mongoose from 'mongoose';
import { getIO } from '../../lib/Socket';
import { DeliveryPartner } from '../Delivery-Partner/delivery-partner.model';

// trigger SOS service
const triggerSos = async (payload: Partial<TSos>, currentUser: AuthUser) => {
  const userModelType =
    ROLE_COLLECTION_MAP[currentUser.role as keyof typeof ROLE_COLLECTION_MAP];
  const sosLocation = currentUser.currentSessionLocation?.coordinates;
  if (!sosLocation) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Could not determine your current location. Please enable GPS.',
    );
  }
  const sosData = {
    ...payload,
    userId: {
      id: currentUser._id,
      model: userModelType,
      role: currentUser.role,
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
    throw new Error('Failed to trigger SOS');
  }

  getIO().to('SOS_ALERTS_POOL').emit('new-sos-alert', {
    message: 'Emergency SOS Triggered!',
    data: result,
  });

  return result;
};

// update sos status in db
const updateSosStatus = async (
  id: string,
  adminId: string,
  payload: { status: TSos['status']; note?: string },
) => {
  const isSosExist = await SosModel.findById(id);
  if (!isSosExist) {
    throw new AppError(httpStatus.NOT_FOUND, 'SOS alert not found');
  }

  if (isSosExist.status === 'RESOLVED') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Resolved SOS cannot be changed',
    );
  }

  if (isSosExist.status === payload.status) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `SOS is already ${payload.status}`,
    );
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

  return result;
};

// get nearby sos alerts
const getNearbySosAlerts = async (currentUser: AuthUser) => {
  const radiusInMeters = 5000; // 5km
  const sosLocation = currentUser.currentSessionLocation?.coordinates;
  if (!sosLocation) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Could not determine your current location. Please enable GPS.',
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
  return result;
};

// get all sos alerts
const getAllSosAlerts = async (
  query: Record<string, unknown>,
  currentUser: AuthUser,
) => {
  let filterConditions = {};
  if (currentUser.role === 'FLEET_MANAGER') {
    const partners = await DeliveryPartner.find({
      'registeredBy.id': currentUser._id.toString(),
    }).select('_id');

    const partnerIds = partners.map((p) => p._id);

    filterConditions = { 'userId.id': { $in: partnerIds } };
  }
  const sosQuery = new QueryBuilder(SosModel.find(filterConditions), query)
    .filter()
    .sort()
    .paginate()
    .fields()
    .search(['status', 'role', 'issueTags']);

  const populateOptions = getPopulateOptions(currentUser.role, {
    id: 'name userId',
    resolvedBy: 'name userId role',
  });

  populateOptions.forEach((option) => {
    sosQuery.modelQuery = sosQuery.modelQuery.populate(option);
  });

  const result = await sosQuery.modelQuery.exec();
  const meta = await sosQuery.countTotal();

  return {
    meta,
    result,
  };
};

// get single sos alert by id
const getSingleSosAlert = async (id: string, currentUser: AuthUser) => {
  const result = await SosModel.findById(id).populate(
    'resolvedBy',
    'name email',
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'SOS Alert not found');
  }

  if (currentUser.role === 'FLEET_MANAGER') {
    const partner = await DeliveryPartner.findById(result.userId.id);

    if (
      !partner ||
      partner?.registeredBy?.id.toString() !== currentUser._id.toString()
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'You are not authorized to view this SOS alert',
      );
    }
  }

  return result;
};

// get sos alerts by user id
const getUserSosHistory = async (
  currentUser: AuthUser,
  userId: string,
  query: Record<string, unknown>,
) => {
  const sosQuery = new QueryBuilder(
    SosModel.find({ 'userId.id': userId }),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields()
    .search(['status', 'role', 'issueTags']);

  const populateOptions = getPopulateOptions(currentUser.role, {
    id: 'name',
    resolvedBy: 'name userId role',
  });

  populateOptions.forEach((option) => {
    sosQuery.modelQuery = sosQuery.modelQuery.populate(option);
  });

  const result = await sosQuery.modelQuery;
  const meta = await sosQuery.countTotal();

  return {
    meta,
    result,
  };
};

// get sos stats
const getSosStats = async (currentUser: AuthUser) => {
  if (currentUser.status !== 'APPROVED') {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `You are not approved to view SOS stats. Your account is ${currentUser.status}`,
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

  return formattedStats;
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
