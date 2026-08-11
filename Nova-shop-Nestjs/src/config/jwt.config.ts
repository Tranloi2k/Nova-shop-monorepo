import { ConfigService } from '@nestjs/config';

export type JwtTokenType = 'access' | 'refresh';

export function getJwtAccessSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_ACCESS_SECRET');
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is required and must be set in environment variables');
  }
  return secret;
}

export function getJwtRefreshSecret(configService: ConfigService): string {
  const secret = configService.get<string>('JWT_REFRESH_SECRET');
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is required and must be set in environment variables');
  }
  return secret;
}
