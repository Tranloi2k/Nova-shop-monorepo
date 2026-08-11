import { Test, TestingModule } from '@nestjs/testing';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminService } from '../admin.service';

describe('AdminAnalyticsController', () => {
  let controller: AdminAnalyticsController;
  let service: any;

  beforeEach(async () => {
    const mockAdminService = {
      getRevenueAnalytics: jest.fn(),
      getOrdersSummary: jest.fn(),
      getTopProducts: jest.fn(),
      getConversionRate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAnalyticsController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<AdminAnalyticsController>(AdminAnalyticsController);
    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getRevenueAnalytics', () => {
    it('should query revenue with range', async () => {
      service.getRevenueAnalytics.mockResolvedValue([]);
      await controller.getRevenueAnalytics('30d');
      expect(service.getRevenueAnalytics).toHaveBeenCalledWith('30d');
    });

    it('should query revenue with default range 7d', async () => {
      service.getRevenueAnalytics.mockResolvedValue([]);
      await controller.getRevenueAnalytics(undefined);
      expect(service.getRevenueAnalytics).toHaveBeenCalledWith('7d');
    });
  });

  describe('getOrdersSummary', () => {
    it('should return status summary', async () => {
      service.getOrdersSummary.mockResolvedValue({ processing: 1 });
      const result = await controller.getOrdersSummary();
      expect(service.getOrdersSummary).toHaveBeenCalled();
      expect(result.processing).toBe(1);
    });
  });

  describe('getTopProducts', () => {
    it('should fetch top products with default limit 5', async () => {
      service.getTopProducts.mockResolvedValue([]);
      await controller.getTopProducts(undefined);
      expect(service.getTopProducts).toHaveBeenCalledWith(5);
    });

    it('should fetch top products with custom limit', async () => {
      service.getTopProducts.mockResolvedValue([]);
      await controller.getTopProducts('10');
      expect(service.getTopProducts).toHaveBeenCalledWith(10);
    });
  });

  describe('getConversionRate', () => {
    it('should return conversion rate metrics', async () => {
      service.getConversionRate.mockResolvedValue({ total: 10, conversionRate: 50.0 });
      const result = await controller.getConversionRate();
      expect(service.getConversionRate).toHaveBeenCalled();
      expect(result.total).toBe(10);
    });
  });
});
