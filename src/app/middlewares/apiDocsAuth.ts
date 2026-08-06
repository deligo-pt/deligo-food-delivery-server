import { timingSafeEqual } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import redis, { RedisService } from '../config/redis';
import { catchAsync } from '../utils/catchAsync';

const safeCompare = (a: string, b: string) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
};

export const DEVICE_KEY_PREFIX = 'api_docs:device:';
const DEVICE_COOKIE_NAME = 'api_docs_device_id';
const MAX_DEVICES = 10;
const DEVICE_TTL_SECONDS = 20 * 60; // 20 min idle timeout, refreshed (slides forward) on every access

export type TrackedDevice = {
  userAgent?: string;
  ip?: string;
  firstSeen: string;
  lastSeen: string;
};

// Verifies the Basic Auth credentials only; on failure it writes the 401 response and returns false
const checkBasicAuth = (req: Request, res: Response): boolean => {
  const expectedUser = config.api_docs.user;
  const expectedPassword = config.api_docs.password;

  const unauthorized = () => {
    res.setHeader('WWW-Authenticate', 'Basic realm="API Docs"');
    res
      .status(401)
      .json({ success: false, message: 'AUTHENTICATION_REQUIRED' });
  };

  if (!expectedUser || !expectedPassword) {
    unauthorized();
    return false;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    unauthorized();
    return false;
  }

  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) {
    unauthorized();
    return false;
  }

  const user = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  if (
    !safeCompare(user, expectedUser) ||
    !safeCompare(password, expectedPassword)
  ) {
    unauthorized();
    return false;
  }

  return true;
};

// Basic Auth only, no device registration/limit — used by the device management endpoints
// so an admin can always list/revoke devices even when the cap is reached
export const apiDocsBasicAuthOnly = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!checkBasicAuth(req, res)) return;
    next();
  },
);

// Gates /api-docs and /openapi.json behind HTTP Basic Auth, capped at MAX_DEVICES distinct
// devices (tracked via a persistent cookie + Redis; the slot's TTL slides forward on every
// access and frees up after DEVICE_TTL_SECONDS of inactivity)
export const apiDocsAuth = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!checkBasicAuth(req, res)) return;

    const cookieDeviceId = req.cookies?.[DEVICE_COOKIE_NAME] as
      | string
      | undefined;
    const deviceId = cookieDeviceId || uuidv4();
    const deviceKey = `${DEVICE_KEY_PREFIX}${deviceId}`;

    const existingDevice = cookieDeviceId
      ? await RedisService.get<TrackedDevice>(deviceKey)
      : null;

    if (!existingDevice) {
      const activeDeviceKeys = await RedisService.keys(`${DEVICE_KEY_PREFIX}*`);
      if (activeDeviceKeys.length >= MAX_DEVICES) {
        res.status(403).json({
          success: false,
          message: 'DEVICE_LIMIT_REACHED',
          reason: `API docs access is limited to ${MAX_DEVICES} devices. Ask an admin to clear an existing device.`,
        });
        return;
      }
    }

    const now = new Date().toISOString();
    await RedisService.set(
      deviceKey,
      {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        firstSeen: existingDevice?.firstSeen ?? now,
        lastSeen: now,
      } satisfies TrackedDevice,
      DEVICE_TTL_SECONDS,
    );

    res.cookie(DEVICE_COOKIE_NAME, deviceId, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: DEVICE_TTL_SECONDS * 1000,
    });

    next();
  },
);

// Lists every device currently holding a slot, most recently used first
export const listApiDocsDevices = catchAsync(
  async (_req: Request, res: Response) => {
    const keys = await RedisService.keys(`${DEVICE_KEY_PREFIX}*`);

    const devices = await Promise.all(
      keys.map(async (key) => {
        const [device, expiresInSeconds] = await Promise.all([
          RedisService.get<TrackedDevice>(key),
          redis.ttl(key),
        ]);
        return {
          id: key.slice(DEVICE_KEY_PREFIX.length),
          ...device,
          expiresInSeconds,
        };
      }),
    );

    devices.sort((a, b) => (b.lastSeen ?? '').localeCompare(a.lastSeen ?? ''));

    res.status(httpStatus.OK).json({
      success: true,
      message: 'API_DOCS_DEVICES_FETCHED',
      data: { count: devices.length, limit: MAX_DEVICES, devices },
    });
  },
);

// Frees up a device's slot ahead of its natural TTL expiry
export const revokeApiDocsDevice = catchAsync(
  async (req: Request, res: Response) => {
    const deviceKey = `${DEVICE_KEY_PREFIX}${req.params.id}`;

    if (!(await RedisService.exists(deviceKey))) {
      res
        .status(httpStatus.NOT_FOUND)
        .json({ success: false, message: 'DEVICE_NOT_FOUND' });
      return;
    }

    await RedisService.del(deviceKey);
    res
      .status(httpStatus.OK)
      .json({ success: true, message: 'DEVICE_REVOKED' });
  },
);
