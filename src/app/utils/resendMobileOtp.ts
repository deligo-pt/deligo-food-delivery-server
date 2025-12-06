import axios from 'axios';
import config from '../config';
import AppError from '../errors/AppError';
import httpStatus from 'http-status';

export const resendMobileOtp = async (id: string) => {
  const apiUrl = config.bulkgate_resend_api_url;
  const apiKey = config.bulkgate_api_key;
  const appId = config.bulkgate_app_id;

  if (!apiUrl || !apiKey || !appId) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Bulkgate configuration is missing'
    );
  }
  if (!id || id.trim() === '') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid OTP request ID');
  }

  const payload = {
    application_id: appId,
    application_token: apiKey,
    id,
  };

  try {
    const response = await axios.post(apiUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        error?.response?.data?.message || 'Failed to resend OTP with Bulkgate'
      );
    } else {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Failed to resend OTP with Bulkgate'
      );
    }
  }
};
