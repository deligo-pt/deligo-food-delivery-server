/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import swaggerUi from 'swagger-ui-express';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import cookieParser from 'cookie-parser';
import notFound from './app/middlewares/notFound';
import config from './app/config';
import { rateLimiter } from './app/middlewares/rateLimiter';
import router from './app/routes';
import { parseLanguage } from './app/middlewares/parseLanguage';
import { getSwaggerDocument } from './app/docs/swagger';
import {
  customCss,
  customfavIcon,
  customSiteTitle,
} from './app/docs/swaggerTheme';
import {
  apiDocsAuth,
  apiDocsBasicAuthOnly,
  listApiDocsDevices,
  revokeApiDocsDevice,
} from './app/middlewares/apiDocsAuth';

const app: Application = express();

app.set('trust proxy', 1);

const allowedOrigins = config.origins?.split(',') ?? [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);
app.use(cookieParser());

//parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(logIPToDB);

// API docs — reads openapi.json fresh on every request so edits show up without a restart
app.get('/openapi.json', apiDocsAuth, (req: Request, res: Response) => {
  res.json(getSwaggerDocument());
});
// Device management routes must be registered before the /api-docs mount below, otherwise
// swaggerUi.serve would swallow them
app.get('/api-docs/devices', apiDocsBasicAuthOnly, listApiDocsDevices);
app.delete('/api-docs/devices/:id', apiDocsBasicAuthOnly, revokeApiDocsDevice);
app.use(
  '/api-docs',
  apiDocsAuth,
  swaggerUi.serve,
  (req: Request, res: Response, next: NextFunction) =>
    swaggerUi.setup(getSwaggerDocument(), {
      customCss,
      customfavIcon,
      customSiteTitle,
    })(req, res, next),
);

app.use(rateLimiter('global'));

app.use(parseLanguage);

app.use('/api/v1', router);

//Testing
app.get('/', (req: Request, res: Response, next: NextFunction) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Welcome to the DeliGo Food Delivery Server PT test',
  });
});

//handle not found
app.use(notFound);

//global error handler
app.use(globalErrorHandler);

export default app;
