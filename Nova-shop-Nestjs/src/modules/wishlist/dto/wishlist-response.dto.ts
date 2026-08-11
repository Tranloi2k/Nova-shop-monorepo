import { ApiProperty } from '@nestjs/swagger';
import { WishlistItem } from '../entities/wishlist-item.entity';

export class WishlistResponseDto {
  @ApiProperty({ type: [WishlistItem] })
  items: WishlistItem[];

  @ApiProperty({ example: 3 })
  totalItems: number;
}

export class WishlistCheckResponseDto {
  @ApiProperty({ example: true })
  inWishlist: boolean;
}
