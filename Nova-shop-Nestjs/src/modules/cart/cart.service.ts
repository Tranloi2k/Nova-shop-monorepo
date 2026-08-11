import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartResponseDto } from './dto/cart-response.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getOrCreateCart(userId: number): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      cart = this.cartRepository.create({
        userId,
        quantity: 0,
      });
      cart = await this.cartRepository.save(cart);
    }

    return cart;
  }

  private assertQuantityWithinStock(
    requestedQuantity: number,
    product: Product,
    productName?: string,
  ): void {
    if (requestedQuantity > product.stock) {
      const label = productName ?? product.name;
      throw new BadRequestException(
        `Only ${product.stock} unit(s) of "${label}" available in stock`,
      );
    }
  }

  private normalizeVariant(value?: string): string {
    return (value ?? '').trim();
  }

  private async assertProductStockForCart(
    cartId: number,
    product: Product,
    requestedLineQuantity: number,
    excludeCartItemId?: number,
  ): Promise<void> {
    const siblingItems = await this.cartItemRepository.find({
      where: { cartId, productId: product.id },
    });

    const otherLinesQuantity = siblingItems
      .filter((item) => item.id !== excludeCartItemId)
      .reduce((sum, item) => sum + item.quantity, 0);

    const totalForProduct = otherLinesQuantity + requestedLineQuantity;
    this.assertQuantityWithinStock(totalForProduct, product);
  }

  private async findCartItemVariant(
    cartId: number,
    productId: number,
    color: string,
    storage: string,
  ): Promise<CartItem | null> {
    const exactMatch = await this.cartItemRepository.findOne({
      where: { cartId, productId, color, storage },
      relations: ['product'],
    });
    if (exactMatch) {
      return exactMatch;
    }

    // Upgrade a legacy row (pre-variant) instead of inserting a duplicate line.
    return this.cartItemRepository.findOne({
      where: { cartId, productId, color: '', storage: '' },
      relations: ['product'],
    });
  }

  async addToCart(userId: number, addToCartDto: AddToCartDto): Promise<CartResponseDto> {
    const { productId, quantity } = addToCartDto;
    const color = this.normalizeVariant(addToCartDto.color);
    const storage = this.normalizeVariant(addToCartDto.storage);

    // Kiểm tra sản phẩm có tồn tại không
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Lấy hoặc tạo cart của user
    const cart = await this.getOrCreateCart(userId);

    // Kiểm tra xem variant đã có trong cart chưa (kể cả legacy row không variant)
    let cartItem = await this.findCartItemVariant(cart.id, productId, color, storage);

    const newQuantity = cartItem ? cartItem.quantity + quantity : quantity;
    await this.assertProductStockForCart(cart.id, product, newQuantity, cartItem?.id);

    if (cartItem) {
      cartItem.quantity = newQuantity;
      cartItem.color = color;
      cartItem.storage = storage;
      cartItem.price = product.price;
      await this.cartItemRepository.save(cartItem);
    } else {
      // Nếu chưa có, tạo mới
      cartItem = this.cartItemRepository.create({
        cartId: cart.id,
        productId,
        quantity,
        color,
        storage,
        price: product.price,
      });
      await this.cartItemRepository.save(cartItem);
    }

    // Cập nhật tổng số lượng trong cart
    await this.updateCartTotals(cart.id);

    return this.getCartWithTotals(userId);
  }

  async updateCartItem(
    userId: number,
    cartItemId: number,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    const { quantity } = updateCartItemDto;

    // Tìm cart item
    const cartItem = await this.cartItemRepository.findOne({
      where: { id: cartItemId },
      relations: ['cart', 'product'],
    });

    if (!cartItem) {
      throw new NotFoundException(`Cart item with ID ${cartItemId} not found`);
    }

    // Kiểm tra cart có thuộc về user không
    if (cartItem.cart.userId !== userId) {
      throw new BadRequestException('Cart item does not belong to this user');
    }

    await this.assertProductStockForCart(
      cartItem.cartId,
      cartItem.product,
      quantity,
      cartItem.id,
    );

    // Cập nhật số lượng
    cartItem.quantity = quantity;
    cartItem.price = cartItem.product.price;
    await this.cartItemRepository.save(cartItem);

    // Cập nhật tổng số lượng trong cart
    await this.updateCartTotals(cartItem.cartId);

    return this.getCartWithTotals(userId);
  }

  async removeFromCart(userId: number, cartItemId: number): Promise<CartResponseDto> {
    // Tìm cart item
    const cartItem = await this.cartItemRepository.findOne({
      where: { id: cartItemId },
      relations: ['cart'],
    });

    if (!cartItem) {
      throw new NotFoundException(`Cart item with ID ${cartItemId} not found`);
    }

    // Kiểm tra cart có thuộc về user không
    if (cartItem.cart.userId !== userId) {
      throw new BadRequestException('Cart item does not belong to this user');
    }

    const cartId = cartItem.cartId;

    // Xóa cart item
    await this.cartItemRepository.remove(cartItem);

    // Cập nhật tổng số lượng trong cart
    await this.updateCartTotals(cartId);

    return this.getCartWithTotals(userId);
  }

  async getCart(userId: number): Promise<CartResponseDto> {
    return this.getCartWithTotals(userId);
  }

  async clearCart(userId: number): Promise<{ message: string }> {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items'],
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    // Xóa tất cả items trong cart
    await this.cartItemRepository.remove(cart.items);

    // Cập nhật tổng số lượng trong cart
    await this.updateCartTotals(cart.id);

    return { message: 'Cart cleared successfully' };
  }

  private async updateCartTotals(cartId: number): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result: any = await this.cartItemRepository
      .createQueryBuilder('cartItem')
      .select('SUM(cartItem.quantity)', 'totalQuantity')
      .where('cartItem.cartId = :cartId', { cartId })
      .getRawOne();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const totalQuantity = Number(result?.totalQuantity) || 0;

    await this.cartRepository.update(cartId, { quantity: totalQuantity });
  }

  private async getCartWithTotals(userId: number): Promise<CartResponseDto> {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    let totalItems = 0;
    let totalPrice = 0;
    let totalDiscount = 0;

    cart.items.forEach((item) => {
      totalItems += item.quantity;
      const itemTotal = item.price * item.quantity;
      totalPrice += itemTotal;

      // Tính discount nếu có
      if (item.product.discount > 0) {
        const discountAmount = (itemTotal * item.product.discount) / 100;
        totalDiscount += discountAmount;
      }
    });

    const finalPrice = totalPrice - totalDiscount;

    return {
      cart,
      totalItems,
      totalPrice,
      totalDiscount,
      finalPrice,
    };
  }
}
