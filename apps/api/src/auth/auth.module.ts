import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Env } from '../config/env';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthTokensService } from './auth-tokens.service';
import { AuthCleanupService } from './auth-cleanup.service';
import { LoginAttemptsService } from './login-attempts.service';
import { PasswordService } from './password.service';
import { PasswordTokensService } from './password-tokens.service';
import { JwtStrategy } from './strategies/jwt.strategy';

// @Global so any feature module can put @UseGuards(JwtAuthGuard, RolesGuard)
// on its controllers without importing anything: JwtAuthGuard needs
// Passport's AuthModuleOptions injected, which only a registered
// PassportModule provides.
@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    // Default limit for any route using ThrottlerGuard; AuthController
    // tightens it per route with @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const issuer = config.get('JWT_ISSUER', { infer: true });
        const audience = config.get('JWT_AUDIENCE', { infer: true });
        return {
          secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
          signOptions: {
            algorithm: 'HS256',
            expiresIn: config.get('ACCESS_TOKEN_TTL_MINUTES', { infer: true }) * 60,
            issuer,
            audience,
          },
          verifyOptions: { algorithms: ['HS256'], issuer, audience },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokensService,
    AuthCleanupService,
    LoginAttemptsService,
    PasswordService,
    PasswordTokensService,
    JwtStrategy,
  ],
  exports: [PassportModule, PasswordService, PasswordTokensService],
})
export class AuthModule {}
