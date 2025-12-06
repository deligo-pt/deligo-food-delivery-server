import axios from 'axios';
import config from '../config';
import AppError from '../errors/AppError';
import httpStatus from 'http-status';

export const verifyMobileOtp = async (id: string, otp: string) => {
  const apiUrl = config.bulkgate_verify_api_url;
  const apiKey = config.bulkgate_api_key;
  const appId = config.bulkgate_app_id;

  if (!apiUrl || !apiKey || !appId) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Bulkgate configuration is missing'
    );
  }

  const payload = {
    application_id: appId,
    application_token: apiKey,
    id: id,
    code: otp,
  };

  try {
    const response = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        error?.response?.data?.message || 'Failed to verify OTP with Bulkgate'
      );
    } else {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Failed to verify OTP with Bulkgate'
      );
    }
  }
};
