import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OWNS_RESOURCE_KEY } from '../auth/decorators/owns-resource.decorator';

@Injectable()
export class OwnsResourceGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const paramName =
      this.reflector.getAllAndOverride<string>(OWNS_RESOURCE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'id';

    const request = context.switchToHttp().getRequest<{
      user?: { id: number };
      params: Record<string, string>;
    }>();

    const userId = Number(request.user?.id);
    const resourceId = Number(request.params[paramName]);

    if (!userId || userId !== resourceId) {
      throw new UnauthorizedException('You can only access your own resources');
    }

    return true;
  }
}
