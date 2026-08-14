import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderStatusHistory } from './entities/order-status-history.entity';
import { Product } from '../products/entities/product.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Address } from '../address/entities/address.entity';
import { User } from '../user/user.entity';
import { CartService } from '../cart/cart.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { GuestShippingAddressDto } from './dto/guest-shipping-address.dto';
import { OrderStatus } from './order-status.enum';
import { computeOrderCharges } from '../../common/pricing/order-pricing';
import { MailService, OrderEmailPayload } from '../notifications/mail.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cartService: CartService,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
  ) {}

  async getOrders(userId: number): Promise<Record<string, unknown>[]> {
    const orders = await this.orderRepository.find({
      where: { userId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });

    return orders.map((order) => this.mapOrderToDto(order));
  }

  async createOrder(userId: number | null, dto: CreateOrderDto): Promise<Record<string, unknown>> {
    const isGuest = userId == null;

    const {
      dto: result,
      isNew,
      savedOrder,
      notifyEmail,
    } = await this.dataSource.transaction(async (manager) => {
      // Idempotency check inside transaction to prevent duplicate creation.
      const existingOrder = await manager.findOne(Order, {
        where: { stripeSessionId: dto.stripeSessionId },
        relations: ['items'],
      });

      if (existingOrder) {
        return {
          dto: this.mapOrderToDto(existingOrder),
          isNew: false,
          savedOrder: existingOrder,
          notifyEmail: null as string | null,
        };
      }

      // Resolve the owning account. Guest orders keep guestEmail; if that email
      // matches a registered user we also link the order to that account so it
      // shows up in their order history.
      const { resolvedUserId, guestEmail, notifyEmail } = await this.resolveCustomer(
        manager,
        userId,
        dto.guestEmail,
      );

      // Snapshot the shipping address: a saved address for account checkouts,
      // or the Stripe-collected address for guests.
      const snapshot =
        userId != null && dto.addressId != null
          ? await this.resolveAddressSnapshot(manager, userId, dto.addressId)
          : this.buildGuestSnapshot(dto.shippingAddress);

      const order = manager.create(Order, {
        userId: resolvedUserId,
        guestEmail,
        stripeSessionId: dto.stripeSessionId,
        subtotal: 0,
        shippingFee: 0,
        taxAmount: 0,
        total: 0,
        status: OrderStatus.Processing,
        items: [],
        ...snapshot,
      });

      const orderItems: OrderItem[] = [];
      let subtotal = 0;

      if (dto.orderType === 'cart') {
        if (isGuest) {
          throw new BadRequestException('Guest checkout is only available for direct purchases');
        }
        const cart = await manager.findOne(Cart, {
          where: { userId },
          relations: ['items', 'items.product'],
        });

        if (!cart?.items?.length) {
          throw new NotFoundException('Active cart is empty or not found');
        }

        const cartOrder = await this.buildCartOrderItems(manager, cart.items);
        orderItems.push(...cartOrder.items);
        subtotal = cartOrder.subtotal;

        this.applyCharges(order, subtotal);
        order.items = orderItems;
        order.statusHistory = [this.initialHistory(manager)];
        const persisted = await manager.save(Order, order);

        // Clear the cart within the same transaction.
        await manager.remove(CartItem, cart.items);
        cart.quantity = 0;
        cart.items = [];
        await manager.save(Cart, cart);

        return {
          dto: this.mapOrderToDto(persisted),
          isNew: true,
          savedOrder: persisted,
          notifyEmail,
        };
      }

      // ---- Direct buy ------------------------------------------------------
      if (!dto.productId) {
        throw new NotFoundException('Product ID is required for direct purchase');
      }

      const quantity = dto.quantity || 1;

      const updateResult = await manager
        .createQueryBuilder()
        .update(Product)
        .set({ stock: () => `stock - ${quantity}` })
        .where('id = :id AND stock >= :quantity', { id: dto.productId, quantity })
        .execute();

      const product = await manager.findOne(Product, { where: { id: dto.productId } });
      if (!product) {
        throw new NotFoundException(`Product with ID ${dto.productId} not found`);
      }
      if (updateResult.affected === 0) {
        throw new BadRequestException(
          `Product "${product.name}" has insufficient stock or is unavailable`,
        );
      }

      subtotal = this.calculateDiscountedTotal(
        Number(product.price),
        quantity,
        product.discount,
      );

      order.items = [
        manager.create(OrderItem, {
          productId: product.id,
          productName: product.name,
          productImage: product.image,
          price: product.price,
          quantity,
        }),
      ];
      this.applyCharges(order, subtotal);
      order.statusHistory = [this.initialHistory(manager)];
      const persisted = await manager.save(Order, order);

      return {
        dto: this.mapOrderToDto(persisted),
        isNew: true,
        savedOrder: persisted,
        notifyEmail,
      };
    });

    // Best-effort confirmation email, outside the transaction.
    if (isNew) {
      void this.sendConfirmationEmail(notifyEmail, savedOrder);
    }

    return result;
  }

  private async resolveCustomer(
    manager: EntityManager,
    userId: number | null,
    requestedGuestEmail?: string,
  ): Promise<{ resolvedUserId: number | null; guestEmail: string | null; notifyEmail: string | null }> {
    if (userId != null) {
      const account = await manager.findOne(User, { where: { id: userId } });
      return { resolvedUserId: userId, guestEmail: null, notifyEmail: account?.email ?? null };
    }

    const guestEmail = requestedGuestEmail ?? null;
    if (!guestEmail) {
      return { resolvedUserId: null, guestEmail: null, notifyEmail: null };
    }
    const matched = await manager.findOne(User, { where: { email: guestEmail } });
    return { resolvedUserId: matched?.id ?? null, guestEmail, notifyEmail: guestEmail };
  }

  private calculateDiscountedTotal(price: number, quantity: number, discount: number): number {
    const itemTotal = price * quantity;
    return itemTotal - (itemTotal * Math.max(discount, 0)) / 100;
  }

  private async buildCartOrderItems(
    manager: EntityManager,
    cartItems: CartItem[],
  ): Promise<{ items: OrderItem[]; subtotal: number }> {
    const items: OrderItem[] = [];
    let subtotal = 0;

    for (const cartItem of cartItems) {
      const updateResult = await manager
        .createQueryBuilder()
        .update(Product)
        .set({ stock: () => `stock - ${cartItem.quantity}` })
        .where('id = :id AND stock >= :quantity', {
          id: cartItem.productId,
          quantity: cartItem.quantity,
        })
        .execute();
      if (updateResult.affected === 0) {
        throw new BadRequestException(
          `Product "${cartItem.product.name}" has insufficient stock or is unavailable`,
        );
      }

      subtotal += this.calculateDiscountedTotal(
        Number(cartItem.price),
        cartItem.quantity,
        cartItem.product.discount,
      );
      items.push(
        manager.create(OrderItem, {
          productId: cartItem.productId,
          productName: cartItem.product.name,
          productImage: cartItem.product.image,
          price: cartItem.price,
          quantity: cartItem.quantity,
          color: cartItem.color ?? '',
          storage: cartItem.storage ?? '',
        }),
      );
    }

    return { items, subtotal };
  }

  /** Build shipping snapshot columns from a saved address owned by the user. */
  private async resolveAddressSnapshot(
    manager: EntityManager,
    userId: number,
    addressId?: number,
  ): Promise<Partial<Order>> {
    if (!addressId) {
      return {};
    }
    const address = await manager.findOne(Address, { where: { id: addressId, userId } });
    if (!address) {
      throw new BadRequestException('Shipping address not found or does not belong to you');
    }
    return {
      shipName: address.fullName,
      shipPhone: address.phone,
      shipLine1: address.line1,
      shipLine2: address.line2,
      shipCity: address.city,
      shipState: address.state,
      shipPostalCode: address.postalCode,
      shipCountry: address.country,
    };
  }

  /** Build shipping snapshot columns from a guest's Stripe-collected address. */
  private buildGuestSnapshot(address?: GuestShippingAddressDto): Partial<Order> {
    if (!address) {
      return {};
    }
    return {
      shipName: address.fullName,
      shipPhone: address.phone ?? null,
      shipLine1: address.line1,
      shipLine2: address.line2 ?? null,
      shipCity: address.city,
      shipState: address.state ?? null,
      shipPostalCode: address.postalCode ?? null,
      shipCountry: address.country,
    };
  }

  private applyCharges(order: Order, subtotal: number): void {
    const charges = computeOrderCharges(subtotal);
    order.subtotal = charges.subtotal;
    order.shippingFee = charges.shippingFee;
    order.taxAmount = charges.taxAmount;
    order.total = charges.total;
  }

  private initialHistory(manager: EntityManager): OrderStatusHistory {
    return manager.create(OrderStatusHistory, {
      fromStatus: null,
      toStatus: OrderStatus.Processing,
      note: 'Order created',
      changedBy: null,
    });
  }

  private async sendConfirmationEmail(email: string | null, order: Order): Promise<void> {
    if (!email) return;
    try {
      await this.mailService.sendOrderConfirmation(email, this.toEmailPayload(order));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Order confirmation email failed for order ${order.id}: ${message}`);
    }
  }

  private toEmailPayload(order: Order): OrderEmailPayload {
    return {
      reference: `ORD-${order.id}`,
      subtotal: Number(order.subtotal),
      shippingFee: Number(order.shippingFee),
      taxAmount: Number(order.taxAmount),
      total: Number(order.total),
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      items: (order.items || []).map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        price: Number(item.price),
      })),
    };
  }

  private mapOrderToDto(order: Order): Record<string, unknown> {
    const formatDate = (d?: Date) =>
      (d ? new Date(d) : new Date()).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

    return {
      id: `ORD-${order.id}`,
      date: formatDate(order.createdAt),
      status: order.status,
      subtotal: Number(order.subtotal),
      shippingFee: Number(order.shippingFee),
      taxAmount: Number(order.taxAmount),
      total: Number(order.total),
      trackingNumber: order.trackingNumber || undefined,
      carrier: order.carrier || undefined,
      shippingAddress: order.shipLine1
        ? {
            fullName: order.shipName,
            phone: order.shipPhone,
            line1: order.shipLine1,
            line2: order.shipLine2 || undefined,
            city: order.shipCity,
            state: order.shipState || undefined,
            postalCode: order.shipPostalCode,
            country: order.shipCountry,
          }
        : undefined,
      items: (order.items || []).map((item) => ({
        id: item.id,
        name: item.productName,
        image: item.productImage,
        price: Number(item.price),
        quantity: item.quantity,
        color: item.color || undefined,
        storage: item.storage || undefined,
      })),
    };
  }
}
