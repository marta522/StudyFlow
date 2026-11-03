import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { csrfProtection } from './auth/csrf.middleware';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  const allowedOrigins = (
    process.env.CORS_ORIGINS ?? 'http://localhost:5173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (allowedOrigins.length === 0) {
    throw new Error('CORS_ORIGINS must contain at least one allowed origin.');
  }
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  });
  app.use(helmet());

  const trustedProxy = process.env.TRUST_PROXY ?? 'loopback';
  app
    .getHttpAdapter()
    .getInstance()
    .set(
      'trust proxy',
      /^\d+$/.test(trustedProxy) ? Number(trustedProxy) : trustedProxy,
    );
  app.use('/api', csrfProtection);
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
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('StudyFlow API')
    .setDescription(
      'Dokumentacja API platformy StudyFlow. Przed żądaniami zmieniającymi dane pobierz token przez GET /api/auth/csrf i dołącz go jako X-CSRF-Token.',
    )
    .setVersion('1.0')
    .addCookieAuth('studyflow_session', {
      type: 'apiKey',
      in: 'cookie',
      name: 'studyflow_session',
    })
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000);
  logger.log(
    `🚀 Serwer StudyFlow działa na porcie: http://localhost:${process.env.PORT ?? 3000}/api`,
  );
}
bootstrap();
