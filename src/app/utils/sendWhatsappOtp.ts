import axios from 'axios';
import httpStatus from 'http-status';
import config from '../config';
import AppError from '../errors/AppError';

export const sendWhatsappOtp = async (phone: string) => {
  const apiUrl = config.bulkgate.bulkgate_whatsapp_api_url;
  const apiKey = config.bulkgate.bulkgate_api_key;
  const appId = config.bulkgate.bulkgate_app_id;
  const senderId = config.bulkgate.bulkgate_whatsapp_sender_id;

  if (!apiUrl || !apiKey || !appId || !senderId) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'BULKGATE_CONFIGURATION_MISSING',
    );
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  const customMessage = `O seu código de verificação DeliGo é: ${otpCode}. Expira em 5 minutos. Não o partilhe com ninguém.`;
  const payload = {
    application_id: appId,
    application_token: apiKey,
    number: [phone],
    channel: {
      whatsapp: {
        sender: senderId,
        message: { text: customMessage },
      },
    },
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
        error.response?.data?.error || 'BulkGate WhatsApp OTP send failed',
      );
    } else {
      throw new AppError(httpStatus.BAD_REQUEST, 'BULKGATE_OTP_SEND_FAILED', {
        error: 'Bulkgate WhatsApp OTP send failed',
      });
    }
  }
};
