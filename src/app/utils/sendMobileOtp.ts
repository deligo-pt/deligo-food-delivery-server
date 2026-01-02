import axios from 'axios';
import config from '../config';
import AppError from '../errors/AppError';
import httpStatus from 'http-status';

export const sendMobileOtp = async (phone: string) => {
  const apiUrl = config.bulkgate_send_api_url;
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
    number: phone,

    request_quota_identification: phone,
    sender_id: 'gText',
    sender_id_value: 'Deligo',
  };
  try {
    const response = await axios.post(apiUrl, payload);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 'Bulkgate OTP send failed'
      );
    } else {
      throw new Error('Bulkgate OTP send failed');
    }
  }
};
