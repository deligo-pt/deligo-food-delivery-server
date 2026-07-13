/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { RedisService } from '../../config/redis';
import config from '../../config';

export const getPdAccessToken = async () => {
  const REDIS_KEY = 'pd_access_token';

  try {
    const cachedToken = await RedisService.get<string>(REDIS_KEY);
    if (cachedToken) {
      return cachedToken;
    }

    const response = await axios.post(`${config.pastaDigital.api_url}/login`, {
      email: config.pastaDigital.email,
      password: config.pastaDigital.password,
    });

    const { token, code } = response.data;

    if (code !== '200' || !token) {
      throw new Error('Invalid response from Invoice API');
    }

    const ttl = 100 * 60;
    await RedisService.set(REDIS_KEY, token, ttl);

    return token;
  } catch (error: any) {
    console.error(
      'Pasta Digital Auth Error:',
      error.response?.data || error.message,
    );
    throw new Error('Pasta Digital Authentication Failed');
  }
};
