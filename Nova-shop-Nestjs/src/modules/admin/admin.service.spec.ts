import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { Order } from '../order/entities/order.entity';
import { User } from '../user/user.entity';
import { MailService } from '../notifications/mail.service';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AdminService', () => {
  let service: AdminService;
  let productRepo: any;
  let orderRepo: any;
  let userRepo: any;
  let mockManager: any;

  const mockProductRepository = {
    createQueryBuilder: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockOrderRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
  };

  const mockUserRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    mockManager = {
      save: jest.fn(),
      increment: jest.fn(),
      create: jest.fn().mockImplementation((_entity, data) => data),
    };

    const mockDataSource = {
      transaction: jest.fn().mockImplementation((cb) => cb(mockManager)),
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          addGroupBy: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue([]),
        }),
      }),
      options: {
        type: 'postgres',
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: MailService,
          useValue: {
            sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
            sendOrderShipped: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    productRepo = module.get(getRepositoryToken(Product));
    orderRepo = module.get(getRepositoryToken(Order));
    userRepo = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deleteProduct', () => {
    it('should delete a product if it exists', async () => {
      const mockProduct = { id: 1, name: 'Test Product' };
      productRepo.findOne.mockResolvedValue(mockProduct);
      productRepo.remove.mockResolvedValue(undefined);

      await expect(service.deleteProduct(1)).resolves.not.toThrow();
      expect(productRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(productRepo.remove).toHaveBeenCalledWith(mockProduct);
    });

    it('should throw NotFoundException if product does not exist', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteProduct(999)).rejects.toThrow(NotFoundException);
      expect(productRepo.remove).not.toHaveBeenCalled();
    });
  });

  describe('updateOrderStatus state machine', () => {
    it('should transition status from processing to shipped', async () => {
      const mockOrder = { id: 1, status: 'processing', items: [] };
      orderRepo.findOne.mockResolvedValue(mockOrder);

      // getOrderById mock inside updateOrderStatus
      jest.spyOn(service, 'getOrderById').mockResolvedValue({ id: 'ORD-1', status: 'shipped' } as any);

      const result = await service.updateOrderStatus(1, 'shipped');
      expect(result.status).toBe('shipped');
    });

    it('should transition status from processing to cancelled and restore stock', async () => {
      const mockOrder = {
        id: 1,
        status: 'processing',
        items: [{ productId: 101, quantity: 2 }],
      };
      orderRepo.findOne.mockResolvedValue(mockOrder);

      jest.spyOn(service, 'getOrderById').mockResolvedValue({ id: 'ORD-1', status: 'cancelled' } as any);

      const result = await service.updateOrderStatus(1, 'cancelled');
      expect(result.status).toBe('cancelled');
      expect(mockManager.increment).toHaveBeenCalledWith(Product, { id: 101 }, 'stock', 2);
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      const mockOrder = { id: 1, status: 'delivered', items: [] };
      orderRepo.findOne.mockResolvedValue(mockOrder);

      await expect(service.updateOrderStatus(1, 'processing')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateCustomerRole', () => {
    it('should update role of a user', async () => {
      const mockUser = { id: 2, username: 'user', email: 'user@example.com', role: 'customer' };
      userRepo.findOne.mockResolvedValue(mockUser);
      userRepo.save.mockResolvedValue({ ...mockUser, role: 'staff' });

      const result = await service.updateCustomerRole(2, 'staff');
      expect(result.role).toBe('staff');
      expect(userRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid role name', async () => {
      const mockUser = { id: 2, username: 'user', email: 'user@example.com', role: 'customer' };
      userRepo.findOne.mockResolvedValue(mockUser);

      await expect(service.updateCustomerRole(2, 'super-admin')).rejects.toThrow(BadRequestException);
    });
  });
});
