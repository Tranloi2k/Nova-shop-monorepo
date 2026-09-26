import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

import { UserService } from '../user/user.service';
import { instanceToPlain } from 'class-transformer';
import { LoginResponseDto } from './dto/auth.dto';
import { getJwtAccessSecret, getJwtRefreshSecret, JwtTokenType } from '../../config/jwt.config';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(this.configService.get<string>('GOOGLE_CLIENT_ID'));
  }

  /*
   |--------------------------------------------------------------------------
   | VALIDATE USER
   |--------------------------------------------------------------------------
   */

  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<LoginResponseDto, 'password'> | null> {
    // Chỉ định rõ ràng selectPassword = true để lấy password hash từ DB phục vụ validate
    const user = await this.userService.findUserByEmail(email, true);
    if (user && (await bcrypt.compare(password, user.password))) {
      return instanceToPlain(user) as Omit<LoginResponseDto, 'password'>;
    }
    return null;
  }

  async validateUserById(id: number) {
    const user = await this.userService.findUserById(id);

    if (!user) {
      return null;
    }

    return instanceToPlain(user) as Omit<LoginResponseDto, 'password'>;
  }

  /*
   |--------------------------------------------------------------------------
   | TOKEN GENERATORS
   |--------------------------------------------------------------------------
   */

  private async generateAccessToken(username: string, userId: number) {
    return this.jwtService.signAsync(
      {
        username,
        sub: userId,
        type: 'access' satisfies JwtTokenType,
      },
      {
        secret: getJwtAccessSecret(this.configService),
        expiresIn: '15m',
      },
    );
  }

  private async generateRefreshToken(username: string, userId: number) {
    return this.jwtService.signAsync(
      {
        username,
        sub: userId,
        type: 'refresh' satisfies JwtTokenType,
      },
      {
        secret: getJwtRefreshSecret(this.configService),
        expiresIn: '7d',
      },
    );
  }

  /*
   |--------------------------------------------------------------------------
   | LOGIN
   |--------------------------------------------------------------------------
   */

  async login(username: string, userId: number) {
    const accessToken = await this.generateAccessToken(username, userId);

    const refreshToken = await this.generateRefreshToken(username, userId);

    // Hash refresh token trước khi lưu DB
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.userService.updateUser(userId, {
      refreshToken: hashedRefreshToken,
    });

    return {
      userId,
      accessToken,
      refreshToken,
    };
  }

  /*
   |--------------------------------------------------------------------------
   | REFRESH TOKEN
   |--------------------------------------------------------------------------
   */

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{
        sub: number;
        username: string;
        type?: JwtTokenType;
      }>(refreshToken, {
        secret: getJwtRefreshSecret(this.configService),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.userService.findUserById(payload.sub);

      if (!user?.refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);

      if (!isMatch) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Keep the refresh token stable for its fixed seven-day lifetime. The
      // previous implementation rotated a single DB token on every request,
      // which made concurrent SSR requests invalidate each other. A future
      // rotating implementation should use a dedicated session/token-family
      // table with reuse detection rather than one token column on User.
      const accessToken = await this.generateAccessToken(user.username, user.id);
      return {
        userId: user.id,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Refresh token expired or invalid', { cause: error });
    }
  }

  async logout(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{
        sub: number;
        type?: JwtTokenType;
      }>(refreshToken, {
        secret: getJwtRefreshSecret(this.configService),
      });

      if (payload.type !== 'refresh') return;

      const user = await this.userService.findUserById(payload.sub);
      if (!user?.refreshToken) return;

      if (await bcrypt.compare(refreshToken, user.refreshToken)) {
        await this.userService.updateUser(user.id, { refreshToken: '' });
      }
    } catch {
      // Logout is intentionally idempotent and does not reveal token validity.
    }
  }

  async googleLogin(googleToken: string) {
    try {
      const audience = this.configService.get<string>('GOOGLE_CLIENT_ID');
      if (!audience) {
        throw new Error('GOOGLE_CLIENT_ID is not configured');
      }

      const ticket = await this.googleClient.verifyIdToken({
        idToken: googleToken,
        audience,
      });
      const payload = ticket.getPayload() as TokenPayload;

      if (!payload?.sub || !payload.email || payload.email_verified !== true) {
        throw new UnauthorizedException('Google email is not verified');
      }

      const normalizedEmail = payload.email.trim().toLowerCase();
      let user = await this.userService.findUserByEmail(normalizedEmail);

      if (!user) {
        const randomSecurePassword = crypto.randomBytes(32).toString('hex');
        const baseName =
          this.sanitizeUsername(payload.name || normalizedEmail.split('@')[0]) || 'google-user';
        const username = `${baseName}-${payload.sub.slice(-8)}`;

        try {
          user = await this.userService.createUser(username, normalizedEmail, randomSecurePassword);
        } catch (error) {
          // Two callbacks for the same first-time login can race on the unique
          // email constraint. Re-read the winner instead of returning a 500.
          user = await this.userService.findUserByEmail(normalizedEmail);
          if (!user) throw error;
        }
      }

      return this.login(user.username, user.id);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired Google token', {
        cause: error,
      });
    }
  }

  private sanitizeUsername(value: string): string {
    const normalized = value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-');
    let start = 0;
    let end = normalized.length;

    while (start < end && normalized[start] === '-') start += 1;
    while (end > start && normalized[end - 1] === '-') end -= 1;

    return normalized.slice(start, end);
  }
}
