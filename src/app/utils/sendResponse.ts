/* eslint-disable no-unused-vars */
import { Response } from 'express';
import { localizedMessages, TMessageKey } from '../errors/messages';

type TMeta = {
  total?: number;
  page?: number;
  limit?: number;
  totalPage?: number;
};

type TResponse<T> = {
  statusCode: number;
  success: boolean;
  messageKey?: TMessageKey;
  variables?: Record<string, string | number | boolean>;
  meta?: TMeta;
  data: T;
};

type TMessageFunction = (
  _variables: Record<string, string | number | boolean>,
) => string;

const sendResponse = <T>(res: Response, data: TResponse<T>) => {
  const lang = (res.req as unknown as { lang?: 'en' | 'pt' }).lang || 'en';

  let finalMessage = '';

  if (data.messageKey) {
    const target = localizedMessages[data.messageKey];
    if (target) {
      const msgTemplate = target[lang] || target['en'];

      finalMessage =
        typeof msgTemplate === 'function'
          ? (msgTemplate as TMessageFunction)(data.variables || {})
          : (msgTemplate as string);
    }
  }

  res.status(data?.statusCode).json({
    success: data.success,
    message: finalMessage || undefined,
    meta: data.meta,
    data: data.data,
  });
};

export default sendResponse;
