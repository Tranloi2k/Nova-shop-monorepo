import { Test, TestingModule } from '@nestjs/testing';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminService } from '../admin.service';

describe('AdminOrdersController', () => {
  let controller: AdminOrdersController;
  let service: any;

  beforeEach(async () => {
    const mockAdminService = {
      getOrders: jest.fn(),
      getOrderById: jest.fn(),
      updateOrderStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminOrdersController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<AdminOrdersController>(AdminOrdersController);
    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getOrders', () => {
    it('should query orders with exact query parameters', async () => {
      service.getOrders.mockResolvedValue({ orders: [], total: 0 });
      await controller.getOrders('1', '10', 'processing', '2', '2026-06-01', '2026-06-30', 'ORD-12');
      expect(service.getOrders).toHaveBeenCalledWith(1, 10, 'processing', 2, '2026-06-01', '2026-06-30', 'ORD-12');
    });
  });

  describe('getOrderById', () => {
    it('should extract numeric ID from ORD- prefixed string', async () => {
      service.getOrderById.mockResolvedValue({ id: 'ORD-12' });
      const result = await controller.getOrderById('ORD-12');
      expect(service.getOrderById).toHaveBeenCalledWith(12);
      expect(result.id).toBe('ORD-12');
    });
  });

  describe('updateOrderStatus', () => {
    it('should call updateOrderStatus with parsed numeric ID, status and fulfillment options', async () => {
      service.updateOrderStatus.mockResolvedValue({ id: 'ORD-12', status: 'shipped' });
      const actor = { id: 7 } as any;
      const result = await controller.updateOrderStatus(
        'ORD-12',
        'shipped',
        actor,
        'TRACK123',
        'GHN',
        'Handed to courier',
      );
      expect(service.updateOrderStatus).toHaveBeenCalledWith(12, 'shipped', {
        trackingNumber: 'TRACK123',
        carrier: 'GHN',
        note: 'Handed to courier',
        changedBy: 7,
      });
      expect(result.status).toBe('shipped');
    });
  });
});
