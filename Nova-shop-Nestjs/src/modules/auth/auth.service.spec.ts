import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));

const createEphemeralCredential = () => randomBytes(24).toString('hex');

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: { signAsync: jest.Mock; verify: jest.Mock };
  let configService: { get: jest.Mock };
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
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('validates credentials and strips the password from the result', async () => {
    const suppliedPassword = createEphemeralCredential();
    const storedPasswordHash = createEphemeralCredential();
    userService.findUserByEmail.mockResolvedValue({
      id: 7,
      username: 'nova',
      email: 'nova@example.invalid',
      password: storedPasswordHash,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(
      service.validateUser('nova@example.invalid', suppliedPassword),
    ).resolves.toMatchObject({
      id: 7,
      username: 'nova',
    });
    expect(userService.findUserByEmail).toHaveBeenCalledWith('nova@example.invalid', true);
    expect(bcrypt.compare).toHaveBeenCalledWith(suppliedPassword, storedPasswordHash);
  });

  it('rejects invalid credentials and missing users', async () => {
    const suppliedPassword = createEphemeralCredential();
    const storedPasswordHash = createEphemeralCredential();
    userService.findUserByEmail
      .mockResolvedValueOnce({ password: storedPasswordHash })
      .mockResolvedValueOnce(null);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.validateUser('nova@example.invalid', suppliedPassword),
    ).resolves.toBeNull();
    await expect(
      service.validateUser('missing@example.invalid', suppliedPassword),
    ).resolves.toBeNull();
  });

  it('validates a user id and handles a missing user', async () => {
    userService.findUserById
      .mockResolvedValueOnce({ id: 7, username: 'nova' })
      .mockResolvedValueOnce(null);

    await expect(service.validateUserById(7)).resolves.toMatchObject({ id: 7 });
    await expect(service.validateUserById(8)).resolves.toBeNull();
  });

  it('rejects refresh tokens when their account token is unavailable', async () => {
    jwtService.verify.mockReturnValue({ sub: 7, username: 'nova', type: 'refresh' });
    userService.findUserById.mockResolvedValue(null);

    await expect(service.refreshToken('refresh-token')).rejects.toThrow(
      'Refresh token expired or invalid',
    );
  });

  it.each([
    ['an access token', { sub: 7, type: 'access' }, undefined, undefined],
    [
      'a mismatched token',
      { sub: 7, type: 'refresh' },
      { id: 7, username: 'nova', refreshToken: 'stored-hash' },
      false,
    ],
  ])('rejects %s at the refresh endpoint', async (_label, payload, user, matches) => {
    jwtService.verify.mockReturnValue(payload);
    userService.findUserById.mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(matches);

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
          name: ' -- Nova User -- ',
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

  it('uses a safe fallback username when the Google name has no usable characters', async () => {
    (service as any).googleClient = {
      verifyIdToken: jest.fn().mockResolvedValue({
        getPayload: () => ({
          sub: '1234567890',
          email: '---@example.com',
          email_verified: true,
          name: ' --- ',
        }),
      }),
    };
    userService.findUserByEmail.mockResolvedValue(null);
    userService.createUser.mockResolvedValue({ id: 7, username: 'google-user-34567890' });
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');

    await service.googleLogin('google-token');

    expect(userService.createUser).toHaveBeenCalledWith(
      'google-user-34567890',
      '---@example.com',
      expect.any(String),
    );
  });

  it('logs in an existing verified Google user without creating another account', async () => {
    (service as any).googleClient = {
      verifyIdToken: jest.fn().mockResolvedValue({
        getPayload: () => ({
          sub: 'google-subject',
          email: 'nova@example.com',
          email_verified: true,
        }),
      }),
    };
    userService.findUserByEmail.mockResolvedValue({ id: 7, username: 'nova' });
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');

    await service.googleLogin('google-token');

    expect(userService.createUser).not.toHaveBeenCalled();
  });

  it('recovers when concurrent Google callbacks race to create the same user', async () => {
    (service as any).googleClient = {
      verifyIdToken: jest.fn().mockResolvedValue({
        getPayload: () => ({
          sub: 'google-subject',
          email: 'nova@example.com',
          email_verified: true,
          name: 'Nova',
        }),
      }),
    };
    userService.findUserByEmail
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 7, username: 'nova' });
    userService.createUser.mockRejectedValue(new Error('duplicate key'));
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');

    await expect(service.googleLogin('google-token')).resolves.toMatchObject({ userId: 7 });
  });

  it('maps Google verification and unrecoverable creation failures to unauthorized', async () => {
    (service as any).googleClient = {
      verifyIdToken: jest.fn().mockRejectedValue(new Error('invalid signature')),
    };
    await expect(service.googleLogin('bad-token')).rejects.toThrow(
      'Invalid or expired Google token',
    );

    (service as any).googleClient = {
      verifyIdToken: jest.fn().mockResolvedValue({
        getPayload: () => ({
          sub: 'google-subject',
          email: 'nova@example.com',
          email_verified: true,
        }),
      }),
    };
    userService.findUserByEmail.mockResolvedValue(null);
    userService.createUser.mockRejectedValue(new Error('database unavailable'));
    await expect(service.googleLogin('google-token')).rejects.toThrow(
      'Invalid or expired Google token',
    );
  });

  it('rejects Google login when the client id is missing', async () => {
    configService.get.mockImplementation((key: string) =>
      key === 'GOOGLE_CLIENT_ID' ? undefined : `${key}-secret`,
    );

    await expect(service.googleLogin('google-token')).rejects.toThrow(
      'Invalid or expired Google token',
    );
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

  it.each([
    ['a non-refresh token', { sub: 7, type: 'access' }, undefined, true],
    ['a missing user', { sub: 7, type: 'refresh' }, null, true],
    [
      'a token that does not match the stored hash',
      { sub: 7, type: 'refresh' },
      { id: 7, refreshToken: 'stored-hash' },
      false,
    ],
  ])('keeps logout idempotent for %s', async (_label, payload, user, matches) => {
    jwtService.verify.mockReturnValue(payload);
    userService.findUserById.mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(matches);

    await expect(service.logout('refresh-token')).resolves.toBeUndefined();
    expect(userService.updateUser).not.toHaveBeenCalled();
  });

  it('keeps logout idempotent for a malformed token', async () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('malformed token');
    });

    await expect(service.logout('bad-token')).resolves.toBeUndefined();
  });
});
