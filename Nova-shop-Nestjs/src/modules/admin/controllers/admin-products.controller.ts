import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from '../admin.service';
import { AdminCreateProductDto, AdminUpdateProductDto } from '../dto/admin-product.dto';
import { AdminProductQueryDto } from '../dto/admin-product-query.dto';
import { JwtAuthGuard } from '../../guard/jwt-auth.guard';
import { RolesGuard } from '../../guard/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('admin-products')
@ApiBearerAuth()
@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'staff')
export class AdminProductsController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated products for admin' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully.' })
  async getProducts(@Query() query: AdminProductQueryDto) {
    return this.adminService.getProducts(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully.' })
  async createProduct(@Body() dto: AdminCreateProductDto) {
    return this.adminService.createProduct(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully.' })
  async updateProduct(@Param('id') id: string, @Body() dto: AdminUpdateProductDto) {
    return this.adminService.updateProduct(Number.parseInt(id, 10), dto);
  }

  @Delete(':id')
  @Roles('admin') // Overrides to admin-only to demonstrate RBAC
  @ApiOperation({ summary: 'Delete a product (admin only)' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully.' })
  async deleteProduct(@Param('id') id: string) {
    return this.adminService.deleteProduct(Number.parseInt(id, 10));
  }
}
