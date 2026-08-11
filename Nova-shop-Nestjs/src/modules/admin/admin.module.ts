import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminProductsController } from './controllers/admin-products.controller';
import { AdminOrdersController } from './controllers/admin-orders.controller';
import { AdminCustomersController } from './controllers/admin-customers.controller';
import { AdminAnalyticsController } from './controllers/admin-analytics.controller';
import { Product } from '../products/entities/product.entity';
import { Order } from '../order/entities/order.entity';
import { OrderItem } from '../order/entities/order-item.entity';
import { OrderStatusHistory } from '../order/entities/order-status-history.entity';
import { User } from '../user/user.entity';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Order, OrderItem, OrderStatusHistory, User]),
    AuthModule,
    UserModule,
  ],
  controllers: [
    AdminProductsController,
    AdminOrdersController,
    AdminCustomersController,
    AdminAnalyticsController,
  ],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
