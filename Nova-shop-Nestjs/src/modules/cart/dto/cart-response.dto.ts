import { ApiProperty } from '@nestjs/swagger';
import { Cart } from '../entities/cart.entity';

export class CartResponseDto {
  @ApiProperty({ description: 'Cart information with items' })
  cart: Cart;

  @ApiProperty({ description: 'Total number of items in cart', example: 5 })
  totalItems: number;

  @ApiProperty({ description: 'Total price of all items in cart', example: 299.99 })
  totalPrice: number;

  @ApiProperty({ description: 'Total discount amount', example: 50.0 })
  totalDiscount: number;

  @ApiProperty({ description: 'Final price after discount', example: 249.99 })
  finalPrice: number;
}
