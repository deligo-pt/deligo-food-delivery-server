/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
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

const app: Application = express();

app.set('trust proxy', 1);

// contentSecurityPolicy is left off globally: this is a JSON API, and a strict default CSP
// would break the inline scripts Swagger UI relies on for /api-docs.
app.use(helmet({ contentSecurityPolicy: false }));

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

// API docs — reads openapi.json fresh on every request so edits show up without a restart.
// Not exposed in production: it maps the entire API surface for anyone who finds the URL.
if (config.NODE_ENV !== 'production') {
  app.get('/openapi.json', (req: Request, res: Response) => {
    res.json(getSwaggerDocument());
  });
  app.use(
    '/api-docs',
    swaggerUi.serve,
    (req: Request, res: Response, next: NextFunction) =>
      swaggerUi.setup(getSwaggerDocument())(req, res, next),
  );
}

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
