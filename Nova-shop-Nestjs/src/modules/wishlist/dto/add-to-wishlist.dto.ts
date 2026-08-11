import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AddToWishlistDto {
  @ApiProperty({ description: 'Product ID to add', example: 1 })
  @IsInt()
  @Min(1)
  productId: number;
}
