import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

const createEphemeralCredential = () => randomBytes(24).toString('hex');

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    login: jest.Mock;
    validateUser: jest.Mock;
    refreshToken: jest.Mock;
    logout: jest.Mock;
    googleLogin: jest.Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            validateUser: jest.fn(),
            refreshToken: jest.fn(),
            logout: jest.fn(),
            googleLogin: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('revokes the submitted refresh token on logout', async () => {
    authService.logout.mockResolvedValue(undefined);

    await expect(controller.logout({ refreshToken: 'refresh-token' })).resolves.toEqual({
      message: 'Logout successful',
    });
    expect(authService.logout).toHaveBeenCalledWith('refresh-token');
  });

  it('returns internal tokens after credential login', async () => {
    const suppliedPassword = createEphemeralCredential();
    authService.validateUser.mockResolvedValue({ id: 7, username: 'nova' });
    authService.login.mockResolvedValue({
      userId: 7,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    await expect(
      controller.login({ email: 'nova@example.invalid', password: suppliedPassword }),
    ).resolves.toMatchObject({ message: 'Login successful', userId: 7 });
  });

  it('rejects invalid credential login', async () => {
    const suppliedPassword = createEphemeralCredential();
    authService.validateUser.mockResolvedValue(null);

    await expect(
      controller.login({ email: 'nova@example.invalid', password: suppliedPassword }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns refreshed tokens and rejects an empty service result', async () => {
    authService.refreshToken.mockResolvedValueOnce({ accessToken: 'new-access-token' });
    await expect(controller.token({ refreshToken: 'refresh-token' })).resolves.toMatchObject({
      message: 'Login successful',
      accessToken: 'new-access-token',
    });

    authService.refreshToken.mockResolvedValueOnce(null);
    await expect(controller.token({ refreshToken: 'refresh-token' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('delegates Google ID token verification to the auth service', async () => {
    authService.googleLogin.mockResolvedValue({ userId: 7, accessToken: 'access-token' });

    await expect(controller.googleAuthCallback({ idToken: 'google-id-token' })).resolves.toEqual({
      userId: 7,
      accessToken: 'access-token',
    });
    expect(authService.googleLogin).toHaveBeenCalledWith('google-id-token');
  });
});
