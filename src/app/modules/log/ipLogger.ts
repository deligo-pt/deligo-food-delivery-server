import { Request, Response, NextFunction } from 'express';
import { RequestLog } from './log.model';
const getIP = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded || req.ip || 'anonymous';
  return String(ip);
};

export const logIPToDB = (req: Request, res: Response, next: NextFunction) => {
  const ip = getIP(req);
  const path = req.originalUrl;
  const method = req.method;

  RequestLog.create({
    ip,
    path,
    method,
    userAgent: req.headers['user-agent'],
    headers: req.headers,
    timestamp: new Date(),
  }).catch((error) => console.error('Error saving IP to DB:', error));

  next();
};
