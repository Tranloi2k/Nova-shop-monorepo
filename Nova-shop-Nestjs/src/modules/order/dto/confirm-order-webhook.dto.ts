import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { GuestShippingAddressDto } from './guest-shipping-address.dto';

export class ConfirmOrderWebhookDto {
  @ApiProperty({
    description: 'User ID who placed the order (omitted for guests)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiProperty({
    description: 'Guest email captured at checkout (guest orders only)',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @ApiProperty({
    description: 'Shipping address snapshot from Stripe (guest orders)',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GuestShippingAddressDto)
  shippingAddress?: GuestShippingAddressDto;

  @ApiProperty({ description: 'Stripe Checkout Session ID' })
  @IsNotEmpty()
  @IsString()
  stripeSessionId: string;

  @ApiProperty({ description: 'Order type: cart or direct' })
  @IsNotEmpty()
  @IsString()
  @IsIn(['cart', 'direct'])
  orderType: string;

  @ApiProperty({ description: 'Product ID (for direct buy)', required: false })
  @IsOptional()
  @IsNumber()
  productId?: number;

  @ApiProperty({ description: 'Quantity (for direct buy)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiProperty({ description: 'Saved shipping address ID to snapshot', required: false })
  @IsOptional()
  @IsNumber()
  addressId?: number;
}
