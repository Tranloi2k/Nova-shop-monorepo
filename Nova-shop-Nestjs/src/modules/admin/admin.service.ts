import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { Order } from '../order/entities/order.entity';
import { OrderItem } from '../order/entities/order-item.entity';
import { OrderStatusHistory } from '../order/entities/order-status-history.entity';
import { User } from '../user/user.entity';
import { UserRole } from '../user/user-role.enum';
import {
  OrderStatus,
  ORDER_STATUS_TRANSITIONS,
  isValidOrderStatus,
} from '../order/order-status.enum';
import { MailService, OrderEmailPayload } from '../notifications/mail.service';

export interface UpdateOrderStatusOptions {
  trackingNumber?: string;
  carrier?: string;
  note?: string;
  changedBy?: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
  ) {}

  /*
   |--------------------------------------------------------------------------
   | PRODUCTS CRUD
   |--------------------------------------------------------------------------
   */

  async getProducts(
    page = 1,
    limit = 10,
    search?: string,
    lowStockThreshold?: number,
    category?: string,
    minPrice?: number,
    maxPrice?: number,
    onSale?: string,
    sort?: string,
    stockStatus?: string,
  ) {
    const queryBuilder = this.productRepository.createQueryBuilder('product');
    const skip = (page - 1) * limit;

    if (search?.trim()) {
      queryBuilder.andWhere(
        '(LOWER(product.name) LIKE :search OR LOWER(product.description) LIKE :search)',
        {
          search: `%${search.trim().toLowerCase()}%`,
        },
      );
    }

    if (category?.trim()) {
      queryBuilder.andWhere('product.category = :category', { category: category.trim() });
    }

    if (minPrice !== undefined && !Number.isNaN(minPrice)) {
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined && !Number.isNaN(maxPrice)) {
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    if (onSale === 'true') {
      queryBuilder.andWhere('product.discount > 0');
    } else if (onSale === 'false') {
      queryBuilder.andWhere('(product.discount = 0 OR product.discount IS NULL)');
    }

    const threshold = lowStockThreshold !== undefined ? lowStockThreshold : 15;
    if (stockStatus === 'low-stock') {
      queryBuilder.andWhere('product.stock > 0 AND product.stock <= :threshold', { threshold });
    } else if (stockStatus === 'out-of-stock') {
      queryBuilder.andWhere('product.stock = 0');
    } else if (stockStatus === 'in-stock') {
      queryBuilder.andWhere('product.stock > :threshold', { threshold });
    } else if (lowStockThreshold !== undefined) {
      queryBuilder.andWhere('product.stock <= :lowStockThreshold', { lowStockThreshold });
    }

    if (sort) {
      switch (sort) {
        case 'price-low':
          queryBuilder.orderBy('product.price', 'ASC').addOrderBy('product.id', 'DESC');
          break;
        case 'price-high':
          queryBuilder.orderBy('product.price', 'DESC').addOrderBy('product.id', 'DESC');
          break;
        case 'stock-low':
          queryBuilder.orderBy('product.stock', 'ASC').addOrderBy('product.id', 'DESC');
          break;
        case 'stock-high':
          queryBuilder.orderBy('product.stock', 'DESC').addOrderBy('product.id', 'DESC');
          break;
        case 'name-asc':
          queryBuilder.orderBy('product.name', 'ASC').addOrderBy('product.id', 'DESC');
          break;
        case 'name-desc':
          queryBuilder.orderBy('product.name', 'DESC').addOrderBy('product.id', 'DESC');
          break;
        case 'newest':
        default:
          queryBuilder.orderBy('product.id', 'DESC');
          break;
      }
    } else {
      queryBuilder.orderBy('product.id', 'DESC');
    }

    const [products, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      products,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  async createProduct(dto: Partial<Product>): Promise<Product> {
    const product = this.productRepository.create(dto);
    return this.productRepository.save(product);
  }

  async updateProduct(id: number, dto: Partial<Product>): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    Object.assign(product, dto);
    return this.productRepository.save(product);
  }

  async deleteProduct(id: number): Promise<void> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    await this.productRepository.remove(product);
  }

  /*
   |--------------------------------------------------------------------------
   | ORDERS MANAGEMENT
   |--------------------------------------------------------------------------
   */

  async getOrders(
    page = 1,
    limit = 10,
    status?: string,
    userId?: number,
    startDate?: string,
    endDate?: string,
    search?: string,
  ) {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items');

    const skip = (page - 1) * limit;

    if (status?.trim()) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    if (userId) {
      queryBuilder.andWhere('order.userId = :userId', { userId });
    }

    if (startDate?.trim()) {
      queryBuilder.andWhere('order.createdAt >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate?.trim()) {
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    if (search?.trim()) {
      let parsedOrderId: number | null = null;
      if (search.toUpperCase().startsWith('ORD-')) {
        const idPart = search.substring(4);
        const num = parseInt(idPart, 10);
        if (!isNaN(num)) parsedOrderId = num;
      } else {
        const num = parseInt(search, 10);
        if (!isNaN(num)) parsedOrderId = num;
      }

      if (parsedOrderId !== null) {
        queryBuilder.andWhere('order.id = :orderId', { orderId: parsedOrderId });
      } else {
        queryBuilder.andWhere(
          '(LOWER(user.email) LIKE :search OR LOWER(user.username) LIKE :search)',
          { search: `%${search.trim().toLowerCase()}%` },
        );
      }
    }

    queryBuilder.orderBy('order.createdAt', 'DESC');

    const [orders, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    // Format output to ORD- format
    const formattedOrders = orders.map((order) => ({
      id: `ORD-${order.id}`,
      userId: order.userId,
      guestEmail: order.guestEmail ?? null,
      stripeSessionId: order.stripeSessionId,
      total: Number(order.total),
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      customer: order.user
        ? {
            id: order.user.id,
            username: order.user.username,
            email: order.user.email,
          }
        : null,
      items: (order.items || []).map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.productName,
        image: item.productImage,
        price: Number(item.price),
        quantity: item.quantity,
      })),
    }));

    return {
      orders: formattedOrders,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  async getOrderById(id: number) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['user', 'items', 'statusHistory'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return {
      id: `ORD-${order.id}`,
      userId: order.userId,
      guestEmail: order.guestEmail ?? null,
      stripeSessionId: order.stripeSessionId,
      subtotal: Number(order.subtotal),
      shippingFee: Number(order.shippingFee),
      taxAmount: Number(order.taxAmount),
      total: Number(order.total),
      status: order.status,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      shippingAddress: order.shipLine1
        ? {
            fullName: order.shipName,
            phone: order.shipPhone,
            line1: order.shipLine1,
            line2: order.shipLine2,
            city: order.shipCity,
            state: order.shipState,
            postalCode: order.shipPostalCode,
            country: order.shipCountry,
          }
        : null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      customer: order.user
        ? {
            id: order.user.id,
            username: order.user.username,
            email: order.user.email,
          }
        : null,
      items: (order.items || []).map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.productName,
        image: item.productImage,
        price: Number(item.price),
        quantity: item.quantity,
      })),
      statusHistory: (order.statusHistory || [])
        .slice()
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((h) => ({
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          note: h.note,
          changedBy: h.changedBy,
          createdAt: h.createdAt,
        })),
    };
  }

  async updateOrderStatus(id: number, status: string, options: UpdateOrderStatusOptions = {}) {
    if (!isValidOrderStatus(status)) {
      throw new BadRequestException(`Invalid order status: "${status}"`);
    }
    const nextStatus = status;

    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'user'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    const currentStatus = order.status;
    const allowed = ORDER_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(
        `Invalid status transition from "${currentStatus}" to "${nextStatus}"`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      order.status = nextStatus;

      if (nextStatus === OrderStatus.Shipped) {
        if (options.trackingNumber) order.trackingNumber = options.trackingNumber;
        if (options.carrier) order.carrier = options.carrier;
      }

      // Atomic stock restoration on cancellation.
      if (nextStatus === OrderStatus.Cancelled) {
        for (const item of order.items) {
          if (item.productId) {
            await manager.increment(Product, { id: item.productId }, 'stock', item.quantity);
          }
        }
      }

      await manager.save(Order, order);

      // Append to the audit trail.
      await manager.save(
        manager.create(OrderStatusHistory, {
          orderId: order.id,
          fromStatus: currentStatus,
          toStatus: nextStatus,
          note: options.note ?? null,
          changedBy: options.changedBy ?? null,
        }),
      );
    });

    // Best-effort shipping notification (account email, or guest email).
    const shipRecipient = order.user?.email ?? order.guestEmail;
    if (nextStatus === OrderStatus.Shipped && shipRecipient) {
      void this.mailService
        .sendOrderShipped(shipRecipient, this.toEmailPayload(order))
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`Shipped email failed for order ${order.id}: ${message}`);
        });
    }

    return this.getOrderById(order.id);
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

  /*
   |--------------------------------------------------------------------------
   | CUSTOMERS MANAGEMENT
   |--------------------------------------------------------------------------
   */

  async getCustomers(page = 1, limit = 10, search?: string) {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoin('orders', 'order', 'order.userId = user.id')
      .select([
        'user.id AS id',
        'user.username AS username',
        'user.email AS email',
        'user.role AS role',
        'COUNT(order.id) AS total_orders',
        'SUM(order.total) AS total_spent',
      ])
      .groupBy('user.id')
      .orderBy('user.id', 'ASC');

    if (search?.trim()) {
      queryBuilder.andWhere(
        '(LOWER(user.email) LIKE :search OR LOWER(user.username) LIKE :search)',
        { search: `%${search.trim().toLowerCase()}%` },
      );
    }

    const total = await queryBuilder.getCount();
    const rawList = await queryBuilder
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    const customers = rawList.map((row) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
      totalOrders: Number(row.total_orders || 0),
      totalSpent: Number(row.total_spent || 0),
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      customers,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  async getCustomerById(id: number) {
    const customer = await this.userRepository.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    const orders = await this.orderRepository.find({
      where: { userId: id },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });

    const formattedOrders = orders.map((order) => ({
      id: `ORD-${order.id}`,
      total: Number(order.total),
      status: order.status,
      createdAt: order.createdAt,
      items: (order.items || []).map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.productName,
        image: item.productImage,
        price: Number(item.price),
        quantity: item.quantity,
      })),
    }));

    return {
      id: customer.id,
      username: customer.username,
      email: customer.email,
      role: customer.role,
      orders: formattedOrders,
    };
  }

  async updateCustomerRole(id: number, role: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const allowedRoles = Object.values(UserRole);
    if (!allowedRoles.includes(role as UserRole)) {
      throw new BadRequestException(`Invalid role: ${role}`);
    }

    user.role = role as UserRole;
    const updated = await this.userRepository.save(user);

    return {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      role: updated.role,
    };
  }

  /*
   |--------------------------------------------------------------------------
   | ANALYTICS
   |--------------------------------------------------------------------------
   */

  async getRevenueAnalytics(range = '7d') {
    const days = range === '90d' ? 90 : range === '30d' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const dateSelect = 'DATE(order.createdAt)';

    const raw = await this.orderRepository
      .createQueryBuilder('order')
      .select(dateSelect, 'date')
      .addSelect('SUM(order.total)', 'revenue')
      .addSelect('COUNT(order.id)', 'orders')
      .where('order.status = :status', { status: 'delivered' })
      .andWhere('order.createdAt >= :startDate', { startDate })
      .groupBy('DATE(order.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const dataMap = new Map<string, { revenue: number; orders: number }>();
    raw.forEach((r) => {
      // Format to YYYY-MM-DD
      const rawDate = r.date;
      let dateString = '';
      if (rawDate) {
        const d = new Date(rawDate);
        dateString = d.toISOString().split('T')[0];
      }
      if (dateString) {
        dataMap.set(dateString, {
          revenue: Number(r.revenue || 0),
          orders: Number(r.orders || 0),
        });
      }
    });

    const result: { date: string; revenue: number; orders: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      const dayData = dataMap.get(dateString) || { revenue: 0, orders: 0 };
      result.push({
        date: dateString,
        revenue: dayData.revenue,
        orders: dayData.orders,
      });
    }

    return result;
  }

  async getOrdersSummary() {
    const raw = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(order.id)', 'count')
      .groupBy('order.status')
      .getRawMany();

    const summary = { processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
    raw.forEach((r) => {
      if (r.status in summary) {
        summary[r.status as keyof typeof summary] = Number(r.count || 0);
      }
    });

    return summary;
  }

  async getTopProducts(limit = 5) {
    const raw = await this.dataSource
      .getRepository(OrderItem)
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .select('item.productId', 'productId')
      .addSelect('item.productName', 'name')
      .addSelect('item.productImage', 'image')
      .addSelect('SUM(item.quantity)', 'total_quantity')
      .addSelect('SUM(item.quantity * item.price)', 'total_revenue')
      .where('order.status != :status', { status: 'cancelled' })
      .groupBy('item.productId')
      .addGroupBy('item.productName')
      .addGroupBy('item.productImage')
      .orderBy('SUM(item.quantity)', 'DESC')
      .limit(limit)
      .getRawMany();

    return raw.map((r) => ({
      productId: Number(r.productId),
      name: r.name,
      image: r.image,
      totalQuantity: Number(r.total_quantity || 0),
      totalRevenue: Number(r.total_revenue || 0),
    }));
  }

  async getConversionRate() {
    const total = await this.orderRepository.count();
    const delivered = await this.orderRepository.count({
      where: { status: OrderStatus.Delivered },
    });
    const cancelled = await this.orderRepository.count({
      where: { status: OrderStatus.Cancelled },
    });

    const deliveredRevenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'sum')
      .where('order.status = :status', { status: 'delivered' })
      .getRawOne();
    const totalRevenueVal = Number(deliveredRevenue?.sum || 0);

    const customersCount = await this.userRepository.count({ where: { role: UserRole.Customer } });

    // Target references: Revenue target $500,000, Customer target 50 customers
    const revenueTarget = 500000;
    const customerTarget = 50;

    return {
      total,
      delivered,
      cancelled,
      deliveredRate: total > 0 ? Number(((delivered / total) * 100).toFixed(2)) : 0,
      cancelledRate: total > 0 ? Number(((cancelled / total) * 100).toFixed(2)) : 0,
      revenueTargetProgress: Math.min(100, Math.round((totalRevenueVal / revenueTarget) * 100)),
      customerTargetProgress: Math.min(100, Math.round((customersCount / customerTarget) * 100)),
      averageOrderValue: delivered > 0 ? Number((totalRevenueVal / delivered).toFixed(2)) : 0,
    };
  }
}
