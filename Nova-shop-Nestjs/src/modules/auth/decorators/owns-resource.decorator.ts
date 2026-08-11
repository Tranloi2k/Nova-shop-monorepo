import { SetMetadata } from '@nestjs/common';

export const OWNS_RESOURCE_KEY = 'ownsResource';

export const OwnsResource = (paramName = 'id') =>
  SetMetadata(OWNS_RESOURCE_KEY, paramName);
