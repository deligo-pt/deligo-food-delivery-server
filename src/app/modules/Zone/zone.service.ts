import mongoose from 'mongoose';
import { TZone } from './zone.interface';
import { Zone } from './zone.model';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { TMessageKey } from '../../errors/messages';

// Check for overlapping zones
const checkZoneOverlap = async (
  newZoneBoundary: TZone['boundary'],
  currentZoneId?: string,
): Promise<TZone | null> => {
  if (newZoneBoundary.type !== 'Polygon' || !newZoneBoundary.coordinates) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'INVALID_GEOJSON_POLYGON_STRUCTURE',
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
    'zoneId zoneName district',
  );

  return overlappingZone ? overlappingZone.toObject() : null;
};

// Create a new Zone with overlap and duplicate checks
const createZone = async (payload: TZone) => {
  // Check for Duplicate Zone ID
  const existingZoneById = await Zone.findOne({ zoneId: payload.zoneId });
  if (existingZoneById) {
    throw new AppError(httpStatus.CONFLICT, 'ZONE_ID_ALREADY_EXISTS', {
      zoneId: payload.zoneId,
    });
  }
  // Check for Zone Overlap
  const overlappingZone = await checkZoneOverlap(payload.boundary);

  if (overlappingZone) {
    throw new AppError(httpStatus.CONFLICT, 'ZONE_OVERLAP_DETECTED', {
      zoneName: overlappingZone.zoneName,
      zoneId: overlappingZone.zoneId,
    });
  }

  // Create and Save the New Zone
  const newZone = await Zone.create(payload);
  return {
    messageKey: 'ZONE_CREATED_SUCCESS' as TMessageKey,
    data: newZone,
  };
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
    throw new AppError(httpStatus.NOT_FOUND, 'ZONE_NOT_FOUND');
  }
  return {
    messageKey: 'ZONE_FOUND_SUCCESS' as TMessageKey,
    data: zone,
  };
};

// get all zones
const getAllZones = async (query: Record<string, unknown>) => {
  const zones = new QueryBuilder(Zone.find(), query)
    .search(['zoneId', 'zoneName', 'district'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await zones.countTotal();
  const zoneData = await zones.modelQuery;
  return {
    messageKey: 'ZONES_RETRIEVED_SUCCESS' as TMessageKey,
    meta,
    data: zoneData,
  };
};

// get single
const getSingleZone = async (id: string) => {
  const zone = await Zone.findOne({ zoneId: id });
  return {
    messageKey: 'ZONE_RETRIEVED_SUCCESS' as TMessageKey,
    data: zone,
  };
};

// update zone by id
const updateZone = async (zoneId: string, payload: Partial<TZone>) => {
  const existingZone = await Zone.findOne({ zoneId });
  if (!existingZone) {
    throw new AppError(httpStatus.NOT_FOUND, 'ZONE_WITH_ID_NOT_FOUND', {
      zoneId,
    });
  }

  if (payload.boundary) {
    const overlappingZone = await checkZoneOverlap(payload.boundary, zoneId);

    if (overlappingZone) {
      throw new AppError(httpStatus.CONFLICT, 'ZONE_UPDATE_OVERLAP_FAILED', {
        zoneName: overlappingZone.zoneName,
        zoneId: overlappingZone.zoneId,
      });
    }
  }
  const updatedZone = await Zone.findOneAndUpdate(
    { zoneId },
    { $set: payload },
    { new: true, runValidators: true },
  );

  if (!updatedZone) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'FAILED_TO_UPDATE_ZONE',
      { zoneId },
    );
  }

  return {
    messageKey: 'ZONE_UPDATED_SUCCESS' as TMessageKey,
    data: updatedZone,
  };
};

// toggle zone operational status
const toggleZoneStatus = async (zoneId: string, isOperational: boolean) => {
  const zone = await Zone.findOne({ zoneId });
  if (!zone) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'ZONE_WITH_ID_NOT_FOUND_FOR_STATUS_UPDATE',
      { zoneId },
    );
  }

  if (zone.isOperational === isOperational) {
    throw new AppError(httpStatus.BAD_REQUEST, 'ZONE_ALREADY_IN_STATUS', {
      zoneId,
      isOperational,
    });
  }

  zone.isOperational = isOperational;
  await zone.save();
  return {
    messageKey: 'ZONE_STATUS_TOGGLED' as TMessageKey,
    variables: { zoneId, isOperational },
    data: null,
  };
};
// soft delete zone by id (set isOperational to false)
const softDeleteZone = async (zoneId: string) => {
  const zone = await Zone.findOne({ zoneId });
  if (!zone) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'ZONE_WITH_ID_NOT_FOUND_FOR_DELETION',
      { zoneId },
    );
  }
  if (zone.isOperational) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'ZONE_ACTIVE_CANNOT_DELETE_DEACTIVATE_FIRST',
      { zoneId },
    );
  }
  zone.isDeleted = true;
  await zone.save();
  return {
    messageKey: 'ZONE_DELETED_SUCCESS' as TMessageKey,
    variables: { zoneId },
    data: null,
  };
};

// permanent delete zone by id
const permanentDeleteZone = async (zoneId: string) => {
  const result = await Zone.findOne({ zoneId });
  if (!result) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'ZONE_WITH_ID_NOT_FOUND_FOR_DELETION',
      { zoneId },
    );
  }
  if (!result.isDeleted) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'ZONE_NOT_SOFT_DELETED_SOFT_DELETE_FIRST',
      { zoneId },
    );
  }
  await Zone.deleteOne({ zoneId });
  return {
    messageKey: 'ZONE_PERMANENTLY_DELETED_SUCCESS' as TMessageKey,
    variables: { zoneId },
    data: null,
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
