import axios from 'axios';
import config from '../config';
import AppError from '../errors/AppError';
import httpStatus from 'http-status';

export const resendMobileOtp = async (id: string) => {
  const apiUrl = config.bulkgate.bulkgate_resend_api_url;
  const apiKey = config.bulkgate.bulkgate_api_key;
  const appId = config.bulkgate.bulkgate_app_id;

  if (!apiUrl || !apiKey || !appId) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'BULKGATE_CONFIGURATION_MISSING',
    );
  }
  if (!id || id.trim() === '') {
    throw new AppError(httpStatus.BAD_REQUEST, 'INVALID_OTP_REQUEST_ID');
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
      throw new AppError(httpStatus.BAD_REQUEST, 'BULKGATE_RESEND_OTP_FAILED', {
        message: String(
          error?.response?.data?.message ||
            'Failed to resend OTP with Bulkgate',
        ),
      });
    } else {
      throw new AppError(httpStatus.BAD_REQUEST, 'BULKGATE_RESEND_OTP_FAILED', {
        message: 'Failed to resend OTP with Bulkgate',
      });
    }
  }
};
