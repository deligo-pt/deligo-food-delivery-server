import { JwtPayload } from 'jsonwebtoken';
import { TLanguageCode } from '../constant/GlobalInterface/language.interface';

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload;
      lang: TLanguageCode;
    }
  }
}

export {};
