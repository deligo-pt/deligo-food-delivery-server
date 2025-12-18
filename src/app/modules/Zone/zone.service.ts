import mongoose from 'mongoose';
import { TZone } from './zone.interface';
import { Zone } from './zone.model';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { AuthUser } from '../../constant/user.constant';
import { findUserByEmailOrId } from '../../utils/findUserByEmailOrId';

// Check for overlapping zones
const checkZoneOverlap = async (
  newZoneBoundary: TZone['boundary'],
  currentZoneId?: string
): Promise<TZone | null> => {
  if (newZoneBoundary.type !== 'Polygon' || !newZoneBoundary.coordinates) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Invalid GeoJSON Polygon structure provided.'
    );
  }

  // Build the query object
  const query: mongoose.FilterQuery<TZone> = {
    isOperational: true,
    boundary: {
      $geoIntersects: {
        $geometry: {
          type: newZoneBoundary.type,
          coordinates: newZoneBoundary.coordinates,
        },
      },
    },
  };

  // If updating, exclude the zone itself from the overlap check
  if (currentZoneId) {
    query.zoneId = { $ne: currentZoneId };
  }

  const overlappingZone = await Zone.findOne(query).select(
    'zoneId zoneName district'
  );

  return overlappingZone ? overlappingZone.toObject() : null;
};

// Create a new Zone with overlap and duplicate checks
const createZone = async (payload: TZone, currentUser: AuthUser) => {
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  // Check for Duplicate Zone ID
  const existingZoneById = await Zone.findOne({ zoneId: payload.zoneId });
  if (existingZoneById) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Zone ID '${payload.zoneId}' already exists.`
    );
  }
  // Check for Zone Overlap
  const overlappingZone = await checkZoneOverlap(payload.boundary);

  if (overlappingZone) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Zone overlap detected. The new boundary intersects with existing zone: ${overlappingZone.zoneName} (${overlappingZone.zoneId}).`
    );
  }

  // Create and Save the New Zone
  const newZone = await Zone.create(payload);
  return newZone;
};

// Get Zone by Coordinates
const getZoneByCoordinates = async (lng: number, lat: number) => {
  const pointGeometry = {
    type: 'Point' as const,
    coordinates: [lng, lat],
  };

  const zone = await Zone.findOne({
    isOperational: true,
    boundary: {
      $geoIntersects: {
        $geometry: pointGeometry,
      },
    },
  }).select('zoneId district zoneName minDeliveryFee maxDeliveryDistanceKm');

  if (!zone) {
    throw new AppError(httpStatus.NOT_FOUND, 'Zone not found.');
  }
  return zone;
};

// get all zones
const getAllZones = async (
  query: Record<string, unknown>,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const zones = new QueryBuilder(Zone.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(['zoneId', 'zoneName', 'district']);

  const meta = await zones.countTotal();
  const zoneData = await zones.modelQuery;
  return {
    meta,
    data: zoneData,
  };
};

// get single
const getSingleZone = async (id: string, currentUser: AuthUser) => {
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const zone = await Zone.findOne({ zoneId: id });
  return zone;
};

// update zone by id
const updateZone = async (
  zoneId: string,
  payload: Partial<TZone>,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const existingZone = await Zone.findOne({ zoneId });
  if (!existingZone) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `Zone with ID '${zoneId}' not found.`
    );
  }

  if (payload.boundary) {
    const overlappingZone = await checkZoneOverlap(payload.boundary, zoneId);

    if (overlappingZone) {
      throw new AppError(
        httpStatus.CONFLICT,
        `Zone update failed. New boundary intersects with existing zone: ${overlappingZone.zoneName} (${overlappingZone.zoneId}).`
      );
    }
  }
  const updatedZone = await Zone.findOneAndUpdate(
    { zoneId },
    { $set: payload },
    { new: true, runValidators: true }
  );

  if (!updatedZone) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `Failed to update zone ${zoneId}.`
    );
  }

  return updatedZone;
};

// toggle zone operational status
const toggleZoneStatus = async (
  zoneId: string,
  isOperational: boolean,
  currentUser: AuthUser
) => {
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });

  const zone = await Zone.findOne({ zoneId });
  if (!zone) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `Zone with ID '${zoneId}' not found for status update.`
    );
  }

  if (zone.isOperational === isOperational) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Zone with ID '${zoneId}' is already ${
        isOperational ? 'active' : 'inactive'
      }.`
    );
  }

  zone.isOperational = isOperational;
  await zone.save();
  return {
    message: `Zone with ID '${zoneId}' has been ${
      isOperational ? 'activated' : 'deactivated'
    }.`,
  };
};
// soft delete zone by id (set isOperational to false)
const softDeleteZone = async (zoneId: string, currentUser: AuthUser) => {
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const zone = await Zone.findOne({ zoneId });
  if (!zone) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `Zone with ID '${zoneId}' not found for deletion.`
    );
  }
  if (zone.isOperational) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Zone with ID '${zoneId}' is active. Cannot delete an active zone. Please deactivate it first.`
    );
  }
  zone.isDeleted = true;
  await zone.save();
  return {
    message: `Zone with ID '${zoneId}' has been deleted.`,
  };
};

// permanent delete zone by id
const permanentDeleteZone = async (zoneId: string, currentUser: AuthUser) => {
  await findUserByEmailOrId({
    userId: currentUser.id,
    isDeleted: false,
  });
  const result = await Zone.findOne({ zoneId });
  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `Zone with ID '${zoneId}' not found for deletion.`
    );
  }
  if (!result.isDeleted) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Zone with ID '${zoneId}' is not soft deleted. Please soft delete it first before permanent deletion.`
    );
  }
  await Zone.deleteOne({ zoneId });
  return {
    message: `Zone with ID '${zoneId}' has been permanently deleted.`,
  };
};

export const ZoneService = {
  createZone,
  getZoneByCoordinates,
  getAllZones,
  getSingleZone,
  updateZone,
  toggleZoneStatus,
  softDeleteZone,
  permanentDeleteZone,
};
