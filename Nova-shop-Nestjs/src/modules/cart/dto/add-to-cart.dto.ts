import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @ApiProperty({ description: 'Product ID to add to cart', example: 1 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  productId: number;

  @ApiProperty({ description: 'Quantity of the product', example: 2, minimum: 1 })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Selected color/finish', example: '#1a1a2e' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  color?: string;

  @ApiPropertyOptional({ description: 'Selected storage option', example: '256GB' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  storage?: string;
}
