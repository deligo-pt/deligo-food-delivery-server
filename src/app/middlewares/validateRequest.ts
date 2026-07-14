import { NextFunction, Request, Response } from 'express';
import { AnyZodObject } from 'zod';
import { catchAsync } from '../utils/catchAsync';

const validateRequest = (schema: AnyZodObject) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const parsedRequest = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (parsedRequest.body) {
      req.body = parsedRequest.body;
    }

    if (parsedRequest.query) {
      req.query = parsedRequest.query;
    }

    if (parsedRequest.params) {
      req.params = parsedRequest.params;
    }

    next();
  });
};

export const validateRequestCookies = (schema: AnyZodObject) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const parsedCookies = await schema.parseAsync({
      cookies: req.cookies,
    });

    req.cookies = parsedCookies.cookies;

    next();
  });
};

export default validateRequest;
