import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';
import type { Env } from './config/env';
import { csrfOriginMiddleware } from './auth/csrf-origin.middleware';

// Everything main.ts applies to the app besides listen(). Kept separate so
// e2e tests run against exactly the same middleware stack as production.
export function configureApp(app: NestExpressApplication) {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const allowedOrigins = config.get('CORS_ORIGINS', { infer: true });

  // Behind nginx, req.ip would otherwise be the proxy's address — breaking
  // the admin IP allowlist and per-IP rate limiting. Trust exactly as many
  // hops as actually exist; trusting more lets clients spoof their IP via
  // X-Forwarded-For.
  app.set('trust proxy', config.get('TRUST_PROXY_HOPS', { infer: true }));

  // Cookies (credentials) are only honoured for secure-web's own origins.
  app.enableCors({ origin: allowedOrigins, credentials: true });

  // Required for JwtAuthGuard (apps/api/src/auth) to read the httpOnly
  // access-token cookie off incoming requests.
  app.use(cookieParser());
  app.use(csrfOriginMiddleware(allowedOrigins));

  // Validation is applied per-controller (@UsePipes), not globally: a global
  // class-validator ValidationPipe with whitelist:true strips every field on
  // DTOs that use zod instead (nestjs-zod's createZodDto) since it only
  // recognizes class-validator decorators, silently emptying the body before
  // the zod pipe ever runs. See investor.controller.ts / investor/dto for
  // the zod-based resource, and the other controllers for the class-validator
  // ones — each opts into its own validation pipe.

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ZodValidationPipe());
  app.enableShutdownHooks();

  return config;
}
