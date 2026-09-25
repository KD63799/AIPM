import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import type { Env } from '../config/env';
import type { PublicUser } from '../users/users.service';
import type { Session } from './auth.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CredentialsDto } from './dto/credentials.dto';
import { LoginThrottlerGuard } from './guards/login-throttler.guard';
import { Public } from './public.decorator';

const REFRESH_COOKIE = 'refresh_token';

export type AuthResponse = { accessToken: string; user: PublicUser };

@Controller('auth')
export class AuthController {
  private readonly refreshTtlMs: number;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService<Env, true>,
  ) {
    this.refreshTtlMs = config.get('JWT_REFRESH_TTL', { infer: true }) * 1000;
  }

  @Public()
  @Post('register')
  async register(
    @Body() dto: CredentialsDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respond(req, res, await this.auth.register(dto.email, dto.password));
  }

  @Public()
  @UseGuards(LoginThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: CredentialsDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respond(req, res, await this.auth.login(dto.email, dto.password));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respond(req, res, await this.auth.refresh(refreshTokenOf(req)));
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(refreshTokenOf(req));
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions(req));
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() userId: string,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const refreshToken = await this.auth.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
    res.cookie(REFRESH_COOKIE, refreshToken, this.cookieOptions(req));
  }

  private respond(req: Request, res: Response, session: Session): AuthResponse {
    res.cookie(REFRESH_COOKIE, session.refreshToken, this.cookieOptions(req));
    return { accessToken: session.accessToken, user: session.user };
  }

  /** Host-only cookie, sent to the auth routes only; `secure` follows the scheme seen by the client. */
  private cookieOptions(req: Request): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'strict',
      secure: req.secure,
      path: '/api/auth',
      maxAge: this.refreshTtlMs,
    };
  }
}

function refreshTokenOf(req: Request): string | undefined {
  const token: unknown = req.cookies[REFRESH_COOKIE];
  return typeof token === 'string' ? token : undefined;
}
