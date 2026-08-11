import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { Cart } from './entities/cart.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';

@Resolver(() => Cart)
@UseGuards(JwtAuthGuard)
export class CartResolver {
  constructor(private readonly cartService: CartService) {}

  @Query(() => Cart, { name: 'getCart' })
  async getCart(@Context() context: { req: { user: { id: number } } }) {
    const userId = context.req.user.id;
    const result = await this.cartService.getCart(userId);
    return result.cart;
  }

  @Mutation(() => Cart, { name: 'addToCart' })
  async addToCart(
    @Args('productId', { type: () => Number }) productId: number,
    @Args('quantity', { type: () => Number }) quantity: number,
    @Args('color', { type: () => String, nullable: true }) color: string | undefined,
    @Args('storage', { type: () => String, nullable: true }) storage: string | undefined,
    @Context() context: { req: { user: { id: number } } },
  ) {
    const userId = context.req.user.id;
    const addToCartDto: AddToCartDto = { productId, quantity, color, storage };
    const result = await this.cartService.addToCart(userId, addToCartDto);
    return result.cart;
  }

  @Mutation(() => Cart, { name: 'updateCartItem' })
  async updateCartItem(
    @Args('cartItemId') cartItemId: number,
    @Args('quantity') quantity: number,
    @Context() context: { req: { user: { id: number } } },
  ) {
    const userId = context.req.user.id;
    const updateDto: UpdateCartItemDto = { quantity };
    const result = await this.cartService.updateCartItem(userId, cartItemId, updateDto);
    return result.cart;
  }

  @Mutation(() => Cart, { name: 'removeFromCart' })
  async removeFromCart(
    @Args('cartItemId') cartItemId: number,
    @Context() context: { req: { user: { id: number } } },
  ) {
    const userId = context.req.user.id;
    const result = await this.cartService.removeFromCart(userId, cartItemId);
    return result.cart;
  }

  @Mutation(() => String, { name: 'clearCart' })
  async clearCart(@Context() context: { req: { user: { id: number } } }) {
    const userId = context.req.user.id;
    const result = await this.cartService.clearCart(userId);
    return result.message;
  }
}
