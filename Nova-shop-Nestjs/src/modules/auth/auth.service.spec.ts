import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: { signAsync: jest.Mock; verify: jest.Mock };
  let userService: {
    findUserByEmail: jest.Mock;
    findUserById: jest.Mock;
    updateUser: jest.Mock;
    createUser: jest.Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            findUserByEmail: jest.fn(),
            findUserById: jest.fn(),
            updateUser: jest.fn(),
            createUser: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get(JwtService);
    userService = module.get(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects refresh tokens when their account token is unavailable', async () => {
    jwtService.verify.mockReturnValue({ sub: 7, username: 'nova', type: 'refresh' });
    userService.findUserById.mockResolvedValue(null);

    await expect(service.refreshToken('refresh-token')).rejects.toThrow(
      'Refresh token expired or invalid',
    );
  });

  it.each([
    [null],
    [{ name: 'Nova' }],
    [{ email: 'nova@example.com' }],
  ])('rejects incomplete Google identity payloads', async (payload) => {
    (service as any).googleClient = {
      verifyIdToken: jest.fn().mockResolvedValue({ getPayload: () => payload }),
    };

    await expect(service.googleLogin('google-token')).rejects.toThrow(UnauthorizedException);
  });
});
