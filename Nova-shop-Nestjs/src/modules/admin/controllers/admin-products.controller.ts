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
  async getProducts(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search?: string,
    @Query('lowStockThreshold') lowStockThreshold?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('onSale') onSale?: string,
    @Query('sort') sort?: string,
    @Query('stockStatus') stockStatus?: string,
  ) {
    return this.adminService.getProducts(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      search,
      lowStockThreshold ? parseInt(lowStockThreshold, 10) : undefined,
      category,
      minPrice ? parseFloat(minPrice) : undefined,
      maxPrice ? parseFloat(maxPrice) : undefined,
      onSale,
      sort,
      stockStatus,
    );
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
    return this.adminService.updateProduct(parseInt(id, 10), dto);
  }

  @Delete(':id')
  @Roles('admin') // Overrides to admin-only to demonstrate RBAC
  @ApiOperation({ summary: 'Delete a product (admin only)' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully.' })
  async deleteProduct(@Param('id') id: string) {
    return this.adminService.deleteProduct(parseInt(id, 10));
  }
}
