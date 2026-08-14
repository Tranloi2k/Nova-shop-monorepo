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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../user/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('admin-orders')
@ApiBearerAuth()
@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'staff')
export class AdminOrdersController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated orders for admin with filters and search' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully.' })
  async getOrders(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getOrders(
      page ? Number.parseInt(page, 10) : 1,
      limit ? Number.parseInt(limit, 10) : 10,
      status,
      userId ? Number.parseInt(userId, 10) : undefined,
      startDate,
      endDate,
      search,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details for admin' })
  @ApiResponse({ status: 200, description: 'Order details retrieved successfully.' })
  async getOrderById(@Param('id') id: string) {
    // ID could be passed as ORD-12 or just 12, extract numeric ID
    let numericId = Number.parseInt(id, 10);
    if (Number.isNaN(numericId) && id.toUpperCase().startsWith('ORD-')) {
      numericId = Number.parseInt(id.substring(4), 10);
    }
    return this.adminService.getOrderById(numericId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status following state-machine constraints' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully.' })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() actor: User,
    @Body('trackingNumber') trackingNumber?: string,
    @Body('carrier') carrier?: string,
    @Body('note') note?: string,
  ) {
    let numericId = Number.parseInt(id, 10);
    if (Number.isNaN(numericId) && id.toUpperCase().startsWith('ORD-')) {
      numericId = Number.parseInt(id.substring(4), 10);
    }
    return this.adminService.updateOrderStatus(numericId, status, {
      trackingNumber,
      carrier,
      note,
      changedBy: actor?.id,
    });
  }
}
