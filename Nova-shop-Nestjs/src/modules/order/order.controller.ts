import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ApiOperation, ApiResponse, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';
import { OwnsResourceGuard } from '../guard/owns-resource.guard';
import { OwnsResource } from '../auth/decorators/owns-resource.decorator';

@ApiTags('order')
@Controller('user/:id/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @UseGuards(JwtAuthGuard, OwnsResourceGuard)
  @OwnsResource('id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user orders' })
  @ApiResponse({ status: 200, description: 'User orders retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getOrders(@Param('id') id: string): Promise<Record<string, unknown>[]> {
    return this.orderService.getOrders(Number(id));
  }

  @Post()
  @UseGuards(JwtAuthGuard, OwnsResourceGuard)
  @OwnsResource('id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new order after checkout success' })
  @ApiResponse({ status: 201, description: 'Order created successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async createOrder(
    @Param('id') id: string,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<Record<string, unknown>> {
    return this.orderService.createOrder(Number(id), createOrderDto);
  }
}
