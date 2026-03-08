import axios from 'axios';
import config from '../config';
import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import { roundTo2 } from './mathProvider';

export const calculateGoggleRoadDistance = async (
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number,
) => {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
    return { km: 0, meters: 0, durationMinutes: 0, text: 'N/A' };
  }

  const apiKey = config.google_maps_api_key;

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat1},${lng1}&destinations=${lat2},${lng2}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    const data = response.data;
    if (data.status !== 'OK') {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        `Google API Error: ${data.status}`,
      );
    }

    const element = data.rows[0].elements[0];

    if (element.status !== 'OK') {
      throw new Error(`Route Error: ${element.status}`);
    }

    const distanceMeters = element.distance.value;
    const durationSeconds = element.duration.value;

    return {
      km: roundTo2(distanceMeters / 1000),
      meters: distanceMeters,
      durationMinutes: Math.ceil(durationSeconds / 60),
      text: element.distance.text,
    };
  } catch (error) {
    console.error('Distance calculation error:', error);
    return { km: 0, meters: 0, durationMinutes: 0, text: 'Error' };
  }
};
