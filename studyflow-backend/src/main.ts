import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const trustedProxy = process.env.TRUST_PROXY ?? 'loopback';
  app
    .getHttpAdapter()
    .getInstance()
    .set(
      'trust proxy',
      /^\d+$/.test(trustedProxy) ? Number(trustedProxy) : trustedProxy,
    );
  app.use(helmet());
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 100,
      skip: (request) => request.method !== 'POST',
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        statusCode: 429,
        message: 'Zbyt wiele żądań do endpointów autoryzacji.',
      },
    }),
  );
  app.use(
    '/api/auth/register',
    rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: 5,
      skip: (request) => request.method !== 'POST',
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { statusCode: 429, message: 'Zbyt wiele prób rejestracji.' },
    }),
  );
  app.use(
    '/api/auth/login',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 10,
      skipSuccessfulRequests: true,
      skip: (request) => request.method !== 'POST',
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { statusCode: 429, message: 'Zbyt wiele prób logowania.' },
    }),
  );
  app.use(
    '/api/auth/request-password-reset',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 3,
      skip: (request) => request.method !== 'POST',
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        statusCode: 429,
        message: 'Zbyt wiele próśb o reset hasła.',
      },
    }),
  );
  const allowedOrigins = (
    process.env.CORS_ORIGINS ?? 'http://localhost:5173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (allowedOrigins.length === 0) {
    throw new Error('CORS_ORIGINS must contain at least one allowed origin.');
  }
  app.enableCors({ origin: allowedOrigins });
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
  logger.log(
    `🚀 Serwer StudyFlow działa na porcie: http://localhost:${process.env.PORT ?? 3000}/api`,
  );
}
bootstrap();
