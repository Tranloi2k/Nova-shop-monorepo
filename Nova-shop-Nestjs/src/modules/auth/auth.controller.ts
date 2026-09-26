import { Body, Controller, Header, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { GetNewTokenDto, GoogleLoginDto, LoginDto, LogoutDto } from './dto/auth.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = await this.authService.login(user.username, user.id);
    return { message: 'Login successful', ...token };
  }

  @Post('token')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  async token(@Body() getNewTokenDto: GetNewTokenDto) {
    const data = await this.authService.refreshToken(getNewTokenDto.refreshToken);
    if (!data) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // const token = await this.authService.login(user);
    // res.cookie('access_token', token.access_token, {
    //   httpOnly: true,
    //   // secure: process.env.NODE_ENV === 'production',
    //   sameSite: 'none',
    //   secure: true,
    // });
    return { message: 'Login successful', ...data };
  }

  @Post('logout')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  async logout(@Body() logoutDto: LogoutDto) {
    await this.authService.logout(logoutDto.refreshToken);
    return { message: 'Logout successful' };
  }

  @Post('/google')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  async googleAuthCallback(@Body() googleLoginDto: GoogleLoginDto) {
    const code = await this.authService.googleLogin(googleLoginDto.idToken);
    return { ...code };
  }
}
