import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { GuestShippingAddressDto } from './guest-shipping-address.dto';

export class CreateOrderDto {
  @ApiProperty({ description: 'Stripe Checkout Session ID', example: 'cs_test_...' })
  @IsNotEmpty()
  @IsString()
  stripeSessionId: string;

  @ApiProperty({ description: 'Total amount of the order', example: 1049.0 })
  @IsNotEmpty()
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'Order type: cart or direct', example: 'cart' })
  @IsNotEmpty()
  @IsString()
  orderType: string;

  @ApiProperty({ description: 'Product ID (for direct buy)', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  productId?: number;

  @ApiProperty({ description: 'Quantity (for direct buy)', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiProperty({
    description: 'ID of the saved shipping address to snapshot onto the order',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  addressId?: number;

  @ApiProperty({ description: 'Guest email (guest orders only)', required: false })
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @ApiProperty({ description: 'Shipping address snapshot for guest orders', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => GuestShippingAddressDto)
  shippingAddress?: GuestShippingAddressDto;
}
