import axios from 'axios';
import httpStatus from 'http-status';
import { OAuth2Client } from 'google-auth-library';
import config from '../config';
import AppError from '../errors/AppError';

export type TVerifiedSocialProfile = {
  providerId: string;
  email?: string;
  name?: string;
  picture?: string;
};

const googleClient = new OAuth2Client();

export const verifyGoogleIdToken = async (
  idToken: string,
): Promise<TVerifiedSocialProfile> => {
  if (!config.google.oauth_client_ids.length) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'GOOGLE_CONFIGURATION_MISSING',
    );
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.google.oauth_client_ids,
    });

    const payload = ticket.getPayload();

    if (!payload?.sub) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'INVALID_SOCIAL_TOKEN');
    }

    return {
      providerId: payload.sub,
      // Google can return an email Google itself hasn't verified — only trust confirmed ones.
      email: payload.email_verified
        ? payload.email?.trim().toLowerCase()
        : undefined,
      name: payload.name,
      picture: payload.picture,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(httpStatus.UNAUTHORIZED, 'INVALID_SOCIAL_TOKEN');
  }
};

export const verifyFacebookAccessToken = async (
  accessToken: string,
): Promise<TVerifiedSocialProfile> => {
  const { app_id: appId, app_secret: appSecret } = config.facebook;

  if (!appId || !appSecret) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'FACEBOOK_CONFIGURATION_MISSING',
    );
  }

  try {
    const debugResponse = await axios.get(
      'https://graph.facebook.com/debug_token',
      {
        params: {
          input_token: accessToken,
          access_token: `${appId}|${appSecret}`,
        },
      },
    );

    const tokenData = debugResponse.data?.data;

    if (!tokenData?.is_valid || String(tokenData?.app_id) !== String(appId)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'INVALID_SOCIAL_TOKEN');
    }

    const profileResponse = await axios.get('https://graph.facebook.com/me', {
      params: {
        fields: 'id,name,email,picture',
        access_token: accessToken,
      },
    });

    const profile = profileResponse.data;

    if (!profile?.id) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'INVALID_SOCIAL_TOKEN');
    }

    return {
      providerId: profile.id,
      email: profile.email?.trim().toLowerCase(),
      name: profile.name,
      picture: profile.picture?.data?.url,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(httpStatus.UNAUTHORIZED, 'INVALID_SOCIAL_TOKEN');
  }
};
