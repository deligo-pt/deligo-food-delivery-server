import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '../../config/redis';

const SESSION_KEY_PREFIX = 'refresh_session';

const sessionKey = (userId: string, deviceId: string) =>
  `${SESSION_KEY_PREFIX}:${userId}:${deviceId}`;

type TRefreshSession = {
  jti: string; // id of the ONE currently-valid refresh token for this device
  family: string; // stable id for the whole rotation chain, unchanged across rotations
};

// Converts jwt "expiresIn" style strings (7d, 1y, 30m, 24h) to seconds for Redis TTL.
export const expiresInToSeconds = (expiresIn: string): number => {
  const match = /^(\d+)\s*([smhdwy])$/.exec(expiresIn.trim());
  const unitSeconds: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
    y: 31536000,
  };
  if (!match) return unitSeconds.d * 7; // sane fallback: 7 days
  return Number(match[1]) * unitSeconds[match[2]];
};

export const generateFamilyId = () => uuidv4();
export const generateJti = () => uuidv4();

// Persists the single refresh token currently valid for a user's device session.
// Called on login and on every successful rotation (overwrites the previous jti).
export const storeRefreshSession = async (
  userId: string,
  deviceId: string,
  jti: string,
  family: string,
  ttlSeconds: number,
) => {
  await RedisService.set(
    sessionKey(userId, deviceId),
    { jti, family } as TRefreshSession,
    ttlSeconds,
  );
};

export const getRefreshSession = async (userId: string, deviceId: string) =>
  RedisService.get<TRefreshSession>(sessionKey(userId, deviceId));

// Revokes one device's refresh-token family (used on logout, and on reuse detection).
export const revokeRefreshSession = async (
  userId: string,
  deviceId: string,
) => {
  await RedisService.del(sessionKey(userId, deviceId));
};

// Revokes every active device session for a user (used on password change / account takeover response).
export const revokeAllUserSessions = async (userId: string) => {
  const keys = await RedisService.keys(`${SESSION_KEY_PREFIX}:${userId}:*`);
  await Promise.all(keys.map((key) => RedisService.del(key)));
};
