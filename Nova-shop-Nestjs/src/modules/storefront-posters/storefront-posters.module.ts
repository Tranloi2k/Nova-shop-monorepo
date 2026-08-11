import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorefrontPoster } from './entities/storefront-poster.entity';
import { Product } from '../products/entities/product.entity';
import { StorefrontPostersService } from './storefront-posters.service';
import { StorefrontPostersController } from './controllers/storefront-posters.controller';
import { AdminPostersController } from './controllers/admin-posters.controller';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StorefrontPoster, Product]),
    AuthModule,
    UserModule,
  ],
  controllers: [StorefrontPostersController, AdminPostersController],
  providers: [StorefrontPostersService],
  exports: [StorefrontPostersService],
})
export class StorefrontPostersModule {}
