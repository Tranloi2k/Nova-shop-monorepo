import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StorefrontPostersService } from '../storefront-posters.service';

@ApiTags('storefront')
@Controller('storefront/posters')
export class StorefrontPostersController {
  constructor(private readonly postersService: StorefrontPostersService) {}

  @Get()
  @ApiOperation({ summary: 'Get active home page posters (public)' })
  @ApiResponse({ status: 200, description: 'Active posters retrieved successfully.' })
  getActivePosters() {
    return this.postersService.findActivePublic();
  }
}
