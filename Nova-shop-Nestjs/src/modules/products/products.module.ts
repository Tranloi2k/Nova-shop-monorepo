import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductResolver } from './product.resolver';
import { Product } from './entities/product.entity';
import { ReviewModule } from '../reviews/reviews.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), ReviewModule, AuthModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductResolver],
})
export class ProductsModule {}
