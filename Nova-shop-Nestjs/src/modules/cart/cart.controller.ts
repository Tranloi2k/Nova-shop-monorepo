import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartResponseDto } from './dto/cart-response.dto';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';

@ApiTags('cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get user cart with all items and totals' })
  @ApiResponse({
    status: 200,
    description: 'Cart retrieved successfully',
    type: CartResponseDto,
  })
  async getCart(
    @Request() req: Request & { user: { id: number } },
  ): Promise<CartResponseDto> {
    return this.cartService.getCart(Number(req.user.id));
  }

  @Post('add')
  @ApiOperation({ summary: 'Add product to cart' })
  @ApiResponse({
    status: 201,
    description: 'Product added to cart successfully',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async addToCart(
    @Request() req: Request & { user: { id: number } },
    @Body() addToCartDto: AddToCartDto,
  ): Promise<CartResponseDto> {
    return this.cartService.addToCart(Number(req.user.id), addToCartDto);
  }

  @Put('items/:cartItemId')
  @ApiOperation({ summary: 'Update quantity of cart item' })
  @ApiParam({ name: 'cartItemId', description: 'Cart item ID', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Cart item updated successfully',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  @ApiResponse({ status: 400, description: 'Cart item does not belong to user' })
  async updateCartItem(
    @Request() req: Request & { user: { id: number } },
    @Param('cartItemId') cartItemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    return this.cartService.updateCartItem(Number(req.user.id), +cartItemId, updateCartItemDto);
  }

  @Delete('items/:cartItemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'cartItemId', description: 'Cart item ID', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Item removed from cart successfully',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  @ApiResponse({ status: 400, description: 'Cart item does not belong to user' })
  async removeFromCart(
    @Request() req: Request & { user: { id: number } },
    @Param('cartItemId') cartItemId: string,
  ): Promise<CartResponseDto> {
    return this.cartService.removeFromCart(Number(req.user.id), +cartItemId);
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Clear all items from cart' })
  @ApiResponse({
    status: 200,
    description: 'Cart cleared successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Cart cleared successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  async clearCart(
    @Request() req: Request & { user: { id: number } },
  ): Promise<{ message: string }> {
    return this.cartService.clearCart(Number(req.user.id));
  }
}
