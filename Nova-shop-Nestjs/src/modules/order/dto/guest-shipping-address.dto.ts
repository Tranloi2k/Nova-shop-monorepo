import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Shipping address captured from Stripe Checkout for a guest order. Snapshotted
 * onto the order (guests have no saved addresses to reference by id).
 */
export class GuestShippingAddressDto {
  @ApiProperty({ description: 'Recipient full name' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ description: 'Recipient phone', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Address line 1' })
  @IsNotEmpty()
  @IsString()
  line1: string;

  @ApiProperty({ description: 'Address line 2', required: false })
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiProperty({ description: 'City' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ description: 'State / province', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ description: 'Postal / ZIP code', required: false })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ description: 'Country (ISO code or name)' })
  @IsNotEmpty()
  @IsString()
  country: string;
}
