import axios from 'axios';
import httpStatus from 'http-status';
import config from '../config';
import AppError from '../errors/AppError';

export const sendMobileOtp = async (phone: string, country?: string) => {
  const apiUrl = config.bulkgate.bulkgate_send_api_url;
  const apiKey = config.bulkgate.bulkgate_api_key;
  const appId = config.bulkgate.bulkgate_app_id;

  if (!apiUrl || !apiKey || !appId) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Bulkgate configuration is missing',
    );
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  const customMessage = `O seu código de verificação DeliGo é: ${otpCode}. Expira em 5 minutos. Não o partilhe com ninguém.`;
  const payload = {
    application_id: appId,
    application_token: apiKey,
    number: phone,
    text: customMessage,
    country: country || 'pt',
    sender_id: 'gText',
    sender_id_value: 'Deligo',
    unicode: true,
  };

  try {
    const response = await axios.post(apiUrl, payload);

    return {
      success: true,
      otp: otpCode,
      apiResponse: response.data,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        error.response?.data?.error || 'BulkGate Simple SMS send failed',
      );
    } else {
      throw new AppError(httpStatus.BAD_REQUEST, 'Bulkgate OTP send failed');
    }
  }
};
