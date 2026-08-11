import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from '../admin.service';
import { JwtAuthGuard } from '../../guard/jwt-auth.guard';
import { RolesGuard } from '../../guard/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('admin-customers')
@ApiBearerAuth()
@Controller('admin/customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'staff')
export class AdminCustomersController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated list of customers with purchase aggregation' })
  @ApiResponse({ status: 200, description: 'Customers list retrieved successfully.' })
  async getCustomers(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getCustomers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      search,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer profile and order history details' })
  @ApiResponse({ status: 200, description: 'Customer details retrieved successfully.' })
  async getCustomerById(@Param('id') id: string) {
    return this.adminService.getCustomerById(parseInt(id, 10));
  }

  @Patch(':id/role')
  @Roles('admin') // Promote/demote is admin only
  @ApiOperation({ summary: 'Update customer role (admin only)' })
  @ApiResponse({ status: 200, description: 'User role updated successfully.' })
  async updateCustomerRole(
    @Param('id') id: string,
    @Body('role') role: string,
  ) {
    return this.adminService.updateCustomerRole(parseInt(id, 10), role);
  }
}
