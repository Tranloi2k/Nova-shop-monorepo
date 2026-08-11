import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from '../admin.service';
import { JwtAuthGuard } from '../../guard/jwt-auth.guard';
import { RolesGuard } from '../../guard/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('admin-analytics')
@ApiBearerAuth()
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'staff')
export class AdminAnalyticsController {
  constructor(private readonly adminService: AdminService) {}

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue analytics grouped by day' })
  @ApiResponse({ status: 200, description: 'Revenue analytics retrieved successfully.' })
  async getRevenueAnalytics(@Query('range') range?: string) {
    return this.adminService.getRevenueAnalytics(range || '7d');
  }

  @Get('orders-summary')
  @ApiOperation({ summary: 'Get count of orders by status' })
  @ApiResponse({ status: 200, description: 'Orders summary retrieved successfully.' })
  async getOrdersSummary() {
    return this.adminService.getOrdersSummary();
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Get top selling products' })
  @ApiResponse({ status: 200, description: 'Top products retrieved successfully.' })
  async getTopProducts(@Query('limit') limit?: string) {
    return this.adminService.getTopProducts(limit ? parseInt(limit, 10) : 5);
  }

  @Get('conversion')
  @ApiOperation({ summary: 'Get order conversion and cancellation rates' })
  @ApiResponse({ status: 200, description: 'Conversion analytics retrieved successfully.' })
  async getConversionRate() {
    return this.adminService.getConversionRate();
  }
}
