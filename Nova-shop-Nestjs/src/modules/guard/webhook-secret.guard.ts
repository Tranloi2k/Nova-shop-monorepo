import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class WebhookSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expectedSecret = this.configService.get<string>('INTERNAL_WEBHOOK_SECRET');

    if (!expectedSecret) {
      throw new UnauthorizedException('Webhook secret is not configured');
    }

    const providedSecret = request.headers['x-webhook-secret'];
    if (typeof providedSecret !== 'string' || providedSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    return true;
  }
}
