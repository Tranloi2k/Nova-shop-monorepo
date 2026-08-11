import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto } from './dto/add-to-wishlist.dto';
import {
  WishlistCheckResponseDto,
  WishlistResponseDto,
} from './dto/wishlist-response.dto';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';

@ApiTags('wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get user wishlist with products' })
  @ApiResponse({ status: 200, type: WishlistResponseDto })
  async getWishlist(
    @Request() req: Request & { user: { id: number } },
  ): Promise<WishlistResponseDto> {
    return this.wishlistService.getWishlist(Number(req.user.id));
  }

  @Get('ids')
  @ApiOperation({ summary: 'Get wishlisted product IDs' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        productIds: { type: 'array', items: { type: 'number' } },
      },
    },
  })
  async getWishlistIds(
    @Request() req: Request & { user: { id: number } },
  ): Promise<{ productIds: number[] }> {
    const productIds = await this.wishlistService.getWishlistProductIds(
      Number(req.user.id),
    );
    return { productIds };
  }

  @Get('check/:productId')
  @ApiOperation({ summary: 'Check if a product is in the wishlist' })
  @ApiParam({ name: 'productId', type: 'number' })
  @ApiResponse({ status: 200, type: WishlistCheckResponseDto })
  async checkInWishlist(
    @Request() req: Request & { user: { id: number } },
    @Param('productId') productId: string,
  ): Promise<WishlistCheckResponseDto> {
    return this.wishlistService.checkInWishlist(
      Number(req.user.id),
      +productId,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Add product to wishlist' })
  @ApiResponse({ status: 201, type: WishlistResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Already in wishlist' })
  async addToWishlist(
    @Request() req: Request & { user: { id: number } },
    @Body() dto: AddToWishlistDto,
  ): Promise<WishlistResponseDto> {
    return this.wishlistService.addToWishlist(
      Number(req.user.id),
      dto.productId,
    );
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove product from wishlist' })
  @ApiParam({ name: 'productId', type: 'number' })
  @ApiResponse({ status: 200, type: WishlistResponseDto })
  @ApiResponse({ status: 404, description: 'Not in wishlist' })
  async removeFromWishlist(
    @Request() req: Request & { user: { id: number } },
    @Param('productId') productId: string,
  ): Promise<WishlistResponseDto> {
    return this.wishlistService.removeFromWishlist(
      Number(req.user.id),
      +productId,
    );
  }
}
