import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { WebhookSecretGuard } from '../guard/webhook-secret.guard';
import { ConfirmOrderWebhookDto } from './dto/confirm-order-webhook.dto';

@ApiTags('internal')
@Controller('internal/orders')
export class OrderWebhookController {
  constructor(private readonly orderService: OrderService) {}

  @Post('confirm')
  @UseGuards(WebhookSecretGuard)
  @ApiOperation({ summary: 'Confirm order after Stripe payment (webhook only)' })
  @ApiResponse({ status: 201, description: 'Order created or returned if already exists.' })
  async confirmOrder(@Body() dto: ConfirmOrderWebhookDto): Promise<Record<string, unknown>> {
    const createOrderDto: CreateOrderDto = {
      stripeSessionId: dto.stripeSessionId,
      total: 0,
      orderType: dto.orderType,
      productId: dto.productId,
      quantity: dto.quantity,
      addressId: dto.addressId,
      guestEmail: dto.guestEmail,
      shippingAddress: dto.shippingAddress,
    };

    return this.orderService.createOrder(dto.userId ?? null, createOrderDto);
  }
}
