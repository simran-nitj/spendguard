import pino from 'pino';
import pinoHttp from 'pino-http';
import { env } from '../config/env';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
  base: {
    env: env.NODE_ENV,
  },
});

export const httpLogger = pinoHttp({
  logger,
  customProps: (req) => ({
    requestId: (req as Record<string, any>).id || (req as Record<string, any>).headers?.['x-request-id'],
  }),
  autoLogging: env.NODE_ENV !== 'test',
});
