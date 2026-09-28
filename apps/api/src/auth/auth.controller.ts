import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';
import type { Request, Response } from 'express';
import type { Env } from '../config/env';
import { AuthService, ClientContext } from './auth.service';
import { clearAuthCookies, CookieSettings, setAuthCookies } from './auth-cookies';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from './auth.constants';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './types/jwt-payload.interface';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto';

// Tokens only ever travel in httpOnly cookies — no response body here
// contains a token. Per-IP rate limits (ThrottlerGuard) sit on top of the
// per-account lockout in LoginAttemptsService.
@Controller('auth')
@UsePipes(ZodValidationPipe)
@UseGuards(ThrottlerGuard)
export class AuthController {
  private readonly cookieSettings: CookieSettings;

  constructor(
    private readonly authService: AuthService,
    config: ConfigService<Env, true>,
  ) {
    this.cookieSettings = {
      // Browsers drop Secure cookies over plain http://localhost, so only
      // production (always HTTPS) sets it.
      secure: config.get('NODE_ENV', { infer: true }) === 'production',
      domain: config.get('COOKIE_DOMAIN', { infer: true }),
    };
  }

  // POST /api/auth/login
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.login(dto, clientOf(req));
    setAuthCookies(res, this.cookieSettings, tokens);
    return { user };
  }

  // POST /api/auth/refresh — secure-web calls this when a request gets 401,
  // then retries. It must be single-flight on the client (one refresh at a
  // time) since each refresh token works exactly once.
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const tokens = await this.authService.refresh(
        cookieOf(req, REFRESH_TOKEN_COOKIE),
        clientOf(req),
      );
      setAuthCookies(res, this.cookieSettings, tokens);
      return { ok: true };
    } catch (error) {
      // A dead refresh token is useless to keep — clear it so the client
      // stops retrying and goes to the login page.
      clearAuthCookies(res, this.cookieSettings);
      throw error;
    }
  }

  // POST /api/auth/logout — deliberately NOT behind JwtAuthGuard: an
  // expired access token must still be able to log out (revoke the refresh
  // token + clear cookies).
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(
      cookieOf(req, ACCESS_TOKEN_COOKIE),
      cookieOf(req, REFRESH_TOKEN_COOKIE),
    );
    clearAuthCookies(res, this.cookieSettings);
    return { ok: true };
  }

  // POST /api/auth/logout-all — ends every session on every device.
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutEverywhere(user.userId);
    clearAuthCookies(res, this.cookieSettings);
    return { ok: true };
  }

  // POST /api/auth/change-password
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.changePassword(
      user.userId,
      dto,
      clientOf(req),
    );
    setAuthCookies(res, this.cookieSettings, tokens);
    return { ok: true };
  }

  // POST /api/auth/forgot-password — always 200 with the same message, so
  // it can't be used to check whether an email/phone is registered.
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    await this.authService.forgotPassword(dto, clientOf(req));
    return {
      message:
        'If an account exists for that email or phone, a reset link has been sent to its email address.',
    };
  }

  // POST /api/auth/reset-password — also used by the admin invite
  // (/set-password page). Doesn't log in: the user signs in afterwards.
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.resetPassword(dto, clientOf(req));
    // Any session this browser had is dead now; drop its cookies too.
    clearAuthCookies(res, this.cookieSettings);
    return { ok: true };
  }

  // GET /api/auth/me — who is logged in (secure-web uses it on load to
  // pick the investor vs admin layout).
  @Get('me')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.userId);
  }
}

function clientOf(req: Request): ClientContext {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

function cookieOf(req: Request, name: string): string | undefined {
  const value: unknown = req.cookies?.[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
