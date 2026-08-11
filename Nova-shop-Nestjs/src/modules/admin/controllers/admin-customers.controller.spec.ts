import { Test, TestingModule } from '@nestjs/testing';
import { AdminCustomersController } from './admin-customers.controller';
import { AdminService } from '../admin.service';

describe('AdminCustomersController', () => {
  let controller: AdminCustomersController;
  let service: any;

  beforeEach(async () => {
    const mockAdminService = {
      getCustomers: jest.fn(),
      getCustomerById: jest.fn(),
      updateCustomerRole: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminCustomersController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<AdminCustomersController>(AdminCustomersController);
    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCustomers', () => {
    it('should query customers with pagination and search parameters', async () => {
      service.getCustomers.mockResolvedValue({ customers: [], total: 0 });
      await controller.getCustomers('1', '10', 'admin@example.com');
      expect(service.getCustomers).toHaveBeenCalledWith(1, 10, 'admin@example.com');
    });
  });

  describe('getCustomerById', () => {
    it('should fetch customer details by ID', async () => {
      service.getCustomerById.mockResolvedValue({ id: 2, username: 'customer' });
      const result = await controller.getCustomerById('2');
      expect(service.getCustomerById).toHaveBeenCalledWith(2);
      expect(result.username).toBe('customer');
    });
  });

  describe('updateCustomerRole', () => {
    it('should update role using service', async () => {
      service.updateCustomerRole.mockResolvedValue({ id: 2, role: 'staff' });
      const result = await controller.updateCustomerRole('2', 'staff');
      expect(service.updateCustomerRole).toHaveBeenCalledWith(2, 'staff');
      expect(result.role).toBe('staff');
    });
  });
});
