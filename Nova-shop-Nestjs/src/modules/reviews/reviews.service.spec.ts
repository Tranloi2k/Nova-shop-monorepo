import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReviewService } from './reviews.service';

describe('ReviewService', () => {
  const repository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve(value)),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const service = new ReviewService(repository as never);

  const query = (result: unknown, many = false) => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(many ? undefined : result),
      getRawMany: jest.fn().mockResolvedValue(many ? result : undefined),
    };
    repository.createQueryBuilder.mockReturnValue(builder);
    return builder;
  };

  beforeEach(() => jest.clearAllMocks());

  it('returns numeric aggregate ratings and counts with zero fallbacks', async () => {
    query({ average: '4.25' });
    await expect(service.getAverageRating(1)).resolves.toBe(4.25);

    query({ average: null });
    await expect(service.getAverageRating(2)).resolves.toBe(0);

    query(
      [
        { productId: 1, average: '3.5' },
        { productId: 2, average: null },
      ],
      true,
    );
    await expect(service.getAverageRatings([1, 2])).resolves.toEqual({ 1: 3.5, 2: 0 });

    query(
      [
        { productId: 1, count: '7' },
        { productId: 2, count: null },
      ],
      true,
    );
    await expect(service.getReviewCounts([1, 2])).resolves.toEqual({ 1: 7, 2: 0 });
  });

  it('creates reviews with the authenticated user identity', async () => {
    await expect(
      service.create({ productId: 3, rating: 5, comment: 'Great' }, { id: 8, username: 'nova' }),
    ).resolves.toMatchObject({ product: { id: 3 }, userId: 8, name: 'nova' });
  });

  it('enforces ownership for updates and deletion while allowing admins', async () => {
    repository.findOne.mockResolvedValueOnce(null);
    await expect(service.update(1, { id: 1, rating: 4 }, { id: 2 })).rejects.toThrow(
      NotFoundException,
    );

    repository.findOne.mockResolvedValueOnce({ userId: 9 });
    await expect(service.update(1, { id: 1, rating: 4 }, { id: 2 })).rejects.toThrow(
      ForbiddenException,
    );

    repository.findOne.mockResolvedValueOnce({ userId: 9 });
    await expect(service.remove(1, { id: 2, role: 'customer' })).rejects.toThrow(
      ForbiddenException,
    );

    repository.findOne.mockResolvedValueOnce({ userId: 9 });
    await expect(service.remove(1, { id: 2, role: 'admin' })).resolves.toBe(true);
  });
});
