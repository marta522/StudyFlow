import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './jwt.strategy';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

const SESSION_COOKIE = 'studyflow_session';
const CSRF_COOKIE = 'studyflow_csrf';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(dto);
    this.setSessionCookies(
      response,
      request.cookies?.[CSRF_COOKIE] ?? randomBytes(32).toString('hex'),
      result.access_token,
    );
    return { message: result.message, user: result.user };
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setSessionCookies(
      response,
      request.cookies?.[CSRF_COOKIE] ?? randomBytes(32).toString('hex'),
      result.access_token,
    );
    return { message: result.message, user: result.user };
  }

  @Get('csrf')
  getCsrfToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const csrfToken =
      request.cookies?.[CSRF_COOKIE] ?? randomBytes(32).toString('hex');
    response.cookie(CSRF_COOKIE, csrfToken, {
      ...this.cookieOptions(),
      httpOnly: true,
      maxAge: 60 * 60 * 1000,
    });
    return { csrfToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(request.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.logout(request.user.id);
    response.clearCookie(SESSION_COOKIE, this.cookieOptions());
    response.clearCookie(CSRF_COOKIE, this.cookieOptions());
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() request: AuthenticatedRequest) {
    return request.user;
  }

  private setSessionCookies(
    response: Response,
    csrfToken: string,
    accessToken: string,
  ) {
    response.cookie(SESSION_COOKIE, accessToken, {
      ...this.cookieOptions(),
      httpOnly: true,
      maxAge: 60 * 60 * 1000,
    });
    response.cookie(CSRF_COOKIE, csrfToken, {
      ...this.cookieOptions(),
      httpOnly: true,
      maxAge: 60 * 60 * 1000,
    });
  }

  private cookieOptions() {
    return {
      path: '/api',
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
    };
  }
}
