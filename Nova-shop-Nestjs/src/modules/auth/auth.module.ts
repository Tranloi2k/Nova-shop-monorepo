import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { UserModule } from '../user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RolesGuard } from '../guard/roles.guard';
import { OwnsResourceGuard } from '../guard/owns-resource.guard';
import { getJwtAccessSecret } from '../../config/jwt.config';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: getJwtAccessSecret(configService),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    UserModule,
  ],
  providers: [AuthService, JwtStrategy, RolesGuard, OwnsResourceGuard],
  exports: [JwtModule, RolesGuard, OwnsResourceGuard],
  controllers: [AuthController],
})
export class AuthModule {}
