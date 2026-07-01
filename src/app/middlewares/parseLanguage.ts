import { NextFunction, Request, Response } from 'express';
import {
  SUPPORTED_LANGUAGES,
  TLanguageCode,
} from '../constant/GlobalInterface/language.interface';

export const parseLanguage = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const acceptLang = req.headers['accept-language']?.toLowerCase();

  const finalLang = SUPPORTED_LANGUAGES.includes(acceptLang as TLanguageCode)
    ? (acceptLang as TLanguageCode)
    : 'en';

  req.lang = finalLang;
  next();
};
