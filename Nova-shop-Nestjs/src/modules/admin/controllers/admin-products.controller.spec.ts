import { Test, TestingModule } from '@nestjs/testing';
import { AdminProductsController } from './admin-products.controller';
import { AdminService } from '../admin.service';

describe('AdminProductsController', () => {
  let controller: AdminProductsController;
  let service: any;

  beforeEach(async () => {
    const mockAdminService = {
      getProducts: jest.fn(),
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminProductsController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<AdminProductsController>(AdminProductsController);
    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProducts', () => {
    it('should call service.getProducts with parsed params', async () => {
      service.getProducts.mockResolvedValue({ products: [], total: 0 });
      const result = await controller.getProducts({
        page: 2,
        limit: 5,
        search: 'iPhone',
        lowStockThreshold: 10,
      });
      expect(service.getProducts).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        search: 'iPhone',
        lowStockThreshold: 10,
      });
      expect(result.total).toBe(0);
    });
  });
});
