import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StorefrontPostersService } from '../storefront-posters.service';
import {
  AdminCreatePosterDto,
  AdminReorderPostersDto,
  AdminUpdatePosterDto,
} from '../dto/admin-poster.dto';
import { JwtAuthGuard } from '../../guard/jwt-auth.guard';
import { RolesGuard } from '../../guard/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('admin-posters')
@ApiBearerAuth()
@Controller('admin/posters')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'staff')
export class AdminPostersController {
  constructor(private readonly postersService: StorefrontPostersService) {}

  @Get()
  @ApiOperation({ summary: 'List all storefront posters for admin' })
  @ApiResponse({ status: 200, description: 'Posters retrieved successfully.' })
  getPosters() {
    return this.postersService.findAllAdmin();
  }

  @Post()
  @ApiOperation({ summary: 'Create a storefront poster' })
  @ApiResponse({ status: 201, description: 'Poster created successfully.' })
  createPoster(@Body() dto: AdminCreatePosterDto) {
    return this.postersService.create(dto);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder storefront posters' })
  @ApiResponse({ status: 200, description: 'Posters reordered successfully.' })
  reorderPosters(@Body() dto: AdminReorderPostersDto) {
    return this.postersService.reorder(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a storefront poster' })
  @ApiResponse({ status: 200, description: 'Poster updated successfully.' })
  updatePoster(@Param('id') id: string, @Body() dto: AdminUpdatePosterDto) {
    return this.postersService.update(parseInt(id, 10), dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a storefront poster (admin only)' })
  @ApiResponse({ status: 200, description: 'Poster deleted successfully.' })
  deletePoster(@Param('id') id: string) {
    return this.postersService.delete(parseInt(id, 10));
  }
}
