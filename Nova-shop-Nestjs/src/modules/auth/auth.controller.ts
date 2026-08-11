import { Controller, Post, Body, Res, UnauthorizedException, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { GetNewTokenDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = await this.authService.login(user.username, user.id);
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('access_token', token.accessToken, {
      httpOnly: true,
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
    });
    return { message: 'Login successful', ...token };
  }

  @Post('token')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
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
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: Request, @Res() res: Response) {
    // Xóa token từ phía client (ví dụ: xóa cookie hoặc token từ localStorage)
    res.clearCookie('access_token'); // Xóa cookie nếu sử dụng cookie
    return res.status(200).json({ message: 'Logout successful' });
  }

  @Post('/google')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async googleAuthCallback(@Body('idToken') idToken: string) {
    const code = await this.authService.googleLogin(idToken);
    return { ...code };
  }
}
