import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

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
            get: jest.fn((key: string) => {
              if (key === 'GOOGLE_CLIENT_ID') return 'google-client-id';
              if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
              if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
              return undefined;
            }),
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

  it.each([[null], [{ name: 'Nova' }], [{ email: 'nova@example.com' }]])(
    'rejects incomplete Google identity payloads',
    async (payload) => {
      (service as any).googleClient = {
        verifyIdToken: jest.fn().mockResolvedValue({ getPayload: () => payload }),
      };

      await expect(service.googleLogin('google-token')).rejects.toThrow(UnauthorizedException);
    },
  );

  it('rejects a Google identity whose email is not verified', async () => {
    (service as any).googleClient = {
      verifyIdToken: jest.fn().mockResolvedValue({
        getPayload: () => ({
          sub: 'google-subject',
          email: 'nova@example.com',
          email_verified: false,
        }),
      }),
    };

    await expect(service.googleLogin('google-token')).rejects.toThrow(
      'Google email is not verified',
    );
  });

  it('creates a first-time verified Google user and issues internal tokens', async () => {
    (service as any).googleClient = {
      verifyIdToken: jest.fn().mockResolvedValue({
        getPayload: () => ({
          sub: '1234567890',
          email: 'NOVA@EXAMPLE.COM',
          email_verified: true,
          name: 'Nova User',
        }),
      }),
    };
    userService.findUserByEmail.mockResolvedValue(null);
    userService.createUser.mockResolvedValue({ id: 7, username: 'Nova-User-34567890' });
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');

    await expect(service.googleLogin('google-token')).resolves.toEqual({
      userId: 7,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(userService.createUser).toHaveBeenCalledWith(
      'Nova-User-34567890',
      'nova@example.com',
      expect.any(String),
    );
    expect(userService.updateUser).toHaveBeenCalledWith(7, {
      refreshToken: 'hashed-refresh-token',
    });
  });

  it('refreshes only the access token without invalidating concurrent requests', async () => {
    jwtService.verify.mockReturnValue({ sub: 7, username: 'nova', type: 'refresh' });
    jwtService.signAsync.mockResolvedValue('new-access-token');
    userService.findUserById.mockResolvedValue({
      id: 7,
      username: 'nova',
      refreshToken: 'stored-hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(service.refreshToken('refresh-token')).resolves.toEqual({
      userId: 7,
      accessToken: 'new-access-token',
      refreshToken: 'refresh-token',
    });
    expect(userService.updateUser).not.toHaveBeenCalled();
  });

  it('revokes the stored refresh token on logout', async () => {
    jwtService.verify.mockReturnValue({ sub: 7, type: 'refresh' });
    userService.findUserById.mockResolvedValue({
      id: 7,
      refreshToken: 'stored-hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await service.logout('refresh-token');

    expect(userService.updateUser).toHaveBeenCalledWith(7, { refreshToken: '' });
  });
});
