import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

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
});
