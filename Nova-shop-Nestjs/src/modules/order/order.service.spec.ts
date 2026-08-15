import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Address } from '../address/entities/address.entity';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { User } from '../user/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderService } from './order.service';

describe('OrderService', () => {
  const orderRepository = { find: jest.fn() };
  const mailService = { sendOrderConfirmation: jest.fn() };
  const dataSource = { transaction: jest.fn() };

  const makeQueryBuilder = (affected = 1) => {
    const builder = {
      update: jest.fn(),
      set: jest.fn(),
      where: jest.fn(),
      execute: jest.fn().mockResolvedValue({ affected }),
    };
    builder.update.mockReturnValue(builder);
    builder.set.mockReturnValue(builder);
    builder.where.mockReturnValue(builder);
    return builder;
  };

  const makeManager = () => {
    const manager = {
      findOne: jest.fn(),
      create: jest.fn((_entity: unknown, value: object) => ({ ...value })),
      save: jest.fn((_entity: unknown, value: object) =>
        Promise.resolve({ id: 21, createdAt: new Date('2026-08-15'), ...value }),
      ),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(() => makeQueryBuilder()),
    };
    return manager;
  };

  const makeService = (manager: ReturnType<typeof makeManager>) => {
    dataSource.transaction.mockImplementation(async (work: (value: EntityManager) => unknown) =>
      work(manager as unknown as EntityManager),
    );
    return new OrderService(
      orderRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      mailService as never,
      dataSource as never,
    );
  };

  const directDto = (overrides: Partial<CreateOrderDto> = {}): CreateOrderDto => ({
    stripeSessionId: 'cs_direct',
    total: 200,
    orderType: 'direct',
    productId: 7,
    quantity: 2,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mailService.sendOrderConfirmation.mockResolvedValue(undefined);
  });

  it('returns an existing order without creating or emailing another one', async () => {
    const manager = makeManager();
    manager.findOne.mockResolvedValueOnce({
      id: 4,
      createdAt: new Date('2026-08-15'),
      status: 'processing',
      subtotal: 10,
      shippingFee: 0,
      taxAmount: 1,
      total: 11,
      items: [],
    });

    const result = await makeService(manager).createOrder(1, directDto());

    expect(result.id).toBe('ORD-4');
    expect(manager.create).not.toHaveBeenCalled();
    expect(mailService.sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it('creates a discounted direct guest order and links a matching account', async () => {
    const manager = makeManager();
    manager.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 9, email: 'guest@example.com' })
      .mockResolvedValueOnce({
        id: 7,
        name: 'Phone',
        image: 'phone.jpg',
        price: 100,
        discount: 10,
      });

    const result = await makeService(manager).createOrder(
      null,
      directDto({
        guestEmail: 'guest@example.com',
        shippingAddress: {
          fullName: 'Guest User',
          phone: '0123',
          line1: '1 Main Street',
          city: 'Hanoi',
          country: 'VN',
        },
      }),
    );

    const createdOrder = manager.create.mock.calls.find(([entity]) => entity === Order)?.[1] as Order;
    expect(createdOrder).toMatchObject({
      userId: 9,
      guestEmail: 'guest@example.com',
      shipName: 'Guest User',
      shipPhone: '0123',
    });
    expect(result).toMatchObject({ id: 'ORD-21', subtotal: 180 });
    const stockExpression = manager.createQueryBuilder.mock.results[0].value.set.mock.calls[0][0]
      .stock as () => string;
    expect(stockExpression()).toBe('stock - 2');
    expect(mailService.sendOrderConfirmation).toHaveBeenCalledWith(
      'guest@example.com',
      expect.objectContaining({ reference: 'ORD-21', subtotal: 180 }),
    );
  });

  it('creates a cart order for an account, snapshots its address, and clears the cart', async () => {
    const manager = makeManager();
    const cartItems = [
      {
        productId: 1,
        quantity: 2,
        price: 50,
        color: null,
        storage: undefined,
        product: { name: 'Keyboard', image: 'keyboard.jpg', discount: 20 },
      },
      {
        productId: 2,
        quantity: 1,
        price: 30,
        color: 'black',
        storage: 'standard',
        product: { name: 'Mouse', image: 'mouse.jpg', discount: -5 },
      },
    ] as unknown as CartItem[];
    manager.findOne.mockImplementation((entity: unknown) => {
      if (entity === Order) return Promise.resolve(null);
      if (entity === User) return Promise.resolve({ id: 3, email: 'member@example.com' });
      if (entity === Address) {
        return Promise.resolve({
          fullName: 'Member',
          phone: '0999',
          line1: '2 Main Street',
          line2: 'Floor 2',
          city: 'HCMC',
          state: 'HCM',
          postalCode: '70000',
          country: 'VN',
        });
      }
      if (entity === Cart) return Promise.resolve({ userId: 3, quantity: 3, items: cartItems });
      return Promise.resolve(null);
    });

    const result = await makeService(manager).createOrder(
      3,
      directDto({ orderType: 'cart', productId: undefined, addressId: 8 }),
    );

    expect(result.subtotal).toBe(110);
    expect(manager.create).toHaveBeenCalledWith(
      OrderItem,
      expect.objectContaining({ productId: 1, color: '', storage: '' }),
    );
    expect(manager.remove).toHaveBeenCalledWith(CartItem, cartItems);
    const firstStockExpression = manager.createQueryBuilder.mock.results[0].value.set.mock.calls[0][0]
      .stock as () => string;
    expect(firstStockExpression()).toBe('stock - 2');
    expect(manager.save).toHaveBeenCalledWith(
      Cart,
      expect.objectContaining({ quantity: 0, items: [] }),
    );
    expect(mailService.sendOrderConfirmation).toHaveBeenCalledWith(
      'member@example.com',
      expect.any(Object),
    );
  });

  it('supports a direct guest order without an email and defaults quantity to one', async () => {
    const manager = makeManager();
    manager.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 5, name: 'Case', image: 'case.jpg', price: 20, discount: 0 });

    await makeService(manager).createOrder(null, directDto({ guestEmail: undefined, quantity: 0 }));

    expect(manager.findOne).toHaveBeenCalledTimes(2);
    expect(mailService.sendOrderConfirmation).not.toHaveBeenCalled();
    const builder = manager.createQueryBuilder.mock.results[0].value;
    expect(builder.set).toHaveBeenCalledWith({ stock: expect.any(Function) });
  });

  it('rejects cart checkout for guests', async () => {
    const manager = makeManager();
    manager.findOne.mockResolvedValue(null);

    await expect(
      makeService(manager).createOrder(null, directDto({ orderType: 'cart' })),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an empty account cart', async () => {
    const manager = makeManager();
    manager.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ email: 'member@example.com' })
      .mockResolvedValueOnce({ items: [] });

    await expect(
      makeService(manager).createOrder(3, directDto({ orderType: 'cart' })),
    ).rejects.toThrow('Active cart is empty or not found');
  });

  it('rejects direct checkout without a product', async () => {
    const manager = makeManager();
    manager.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ email: 'member@example.com' });

    await expect(
      makeService(manager).createOrder(3, directDto({ productId: undefined })),
    ).rejects.toThrow('Product ID is required');
  });

  it('rejects a missing shipping address', async () => {
    const manager = makeManager();
    manager.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ email: 'member@example.com' })
      .mockResolvedValueOnce(null);

    await expect(
      makeService(manager).createOrder(3, directDto({ addressId: 999 })),
    ).rejects.toThrow('Shipping address not found');
  });

  it('returns an empty saved-address snapshot when no address is selected', async () => {
    const manager = makeManager();
    const service = makeService(manager);

    await expect(
      (service as any).resolveAddressSnapshot(manager as unknown as EntityManager, 3),
    ).resolves.toEqual({});
    expect(manager.findOne).not.toHaveBeenCalled();
  });

  it('rejects a product that disappears during direct checkout', async () => {
    const manager = makeManager();
    manager.findOne.mockResolvedValue(null);

    await expect(makeService(manager).createOrder(null, directDto())).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects insufficient stock for direct and cart checkouts', async () => {
    const directManager = makeManager();
    directManager.createQueryBuilder.mockReturnValue(makeQueryBuilder(0));
    directManager.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 7, name: 'Phone', price: 100, discount: 0 });

    await expect(makeService(directManager).createOrder(null, directDto())).rejects.toThrow(
      'insufficient stock',
    );

    const cartManager = makeManager();
    cartManager.createQueryBuilder.mockReturnValue(makeQueryBuilder(0));
    cartManager.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ email: 'member@example.com' })
      .mockResolvedValueOnce({
        items: [
          { productId: 1, quantity: 1, price: 10, product: { name: 'Mouse', discount: 0 } },
        ],
      });

    await expect(
      makeService(cartManager).createOrder(3, directDto({ orderType: 'cart' })),
    ).rejects.toThrow('insufficient stock');
  });

  it('maps orders returned by the repository', async () => {
    orderRepository.find.mockResolvedValue([
      {
        id: 6,
        createdAt: new Date('2026-08-15'),
        status: 'shipped',
        subtotal: '10',
        shippingFee: '2',
        taxAmount: '1',
        total: '13',
        trackingNumber: 'TRACK',
        carrier: 'DHL',
        shipName: 'Member',
        shipLine1: '1 Road',
        items: [{ id: 1, productName: 'Mouse', price: '10', quantity: 1 }],
      },
    ]);

    const result = await makeService(makeManager()).getOrders(3);

    expect(result[0]).toMatchObject({ id: 'ORD-6', total: 13, trackingNumber: 'TRACK' });
  });

  it('does not fail an order when its confirmation email cannot be sent', async () => {
    const manager = makeManager();
    manager.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 7, name: 'Phone', image: '', price: 10, discount: 0 });
    mailService.sendOrderConfirmation.mockRejectedValue('mail unavailable');

    await expect(
      makeService(manager).createOrder(null, directDto({ guestEmail: 'guest@example.com' })),
    ).resolves.toBeDefined();
    await new Promise(process.nextTick);
  });
});
