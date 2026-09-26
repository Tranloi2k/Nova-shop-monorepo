import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { randomBytes } from 'node:crypto';
import { User } from './user.entity';
import { UserService } from './user.service';

jest.mock('bcrypt', () => ({ hash: jest.fn() }));

describe('UserService', () => {
  let service: UserService;
  let repository: { create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          } satisfies Partial<Repository<User>>,
        },
      ],
    }).compile();

    service = module.get(UserService);
    repository = module.get(getRepositoryToken(User));
  });

  it('creates users with a hashed password and an empty revocable refresh token', async () => {
    const suppliedPassword = randomBytes(24).toString('hex');
    const generatedPasswordHash = randomBytes(24).toString('hex');
    (bcrypt.hash as jest.Mock).mockResolvedValue(generatedPasswordHash);
    repository.create.mockReturnValue({ id: 7 });
    repository.save.mockResolvedValue({ id: 7 });

    await expect(
      service.createUser('oauth-user', 'oauth-user@example.invalid', suppliedPassword),
    ).resolves.toEqual({ id: 7 });
    expect(repository.create).toHaveBeenCalledWith({
      username: 'oauth-user',
      email: 'oauth-user@example.invalid',
      password: generatedPasswordHash,
      refreshToken: '',
    });
  });
});
