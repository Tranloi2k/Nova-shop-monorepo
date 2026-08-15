import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './modules/products/products.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'node:path';
import { ReviewModule } from './modules/reviews/reviews.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { CartModule } from './modules/cart/cart.module';
import { WishlistModule } from './modules/wishlist/wishlist.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrderModule } from './modules/order/order.module';
import { AdminModule } from './modules/admin/admin.module';
import { AddressModule } from './modules/address/address.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StorefrontPostersModule } from './modules/storefront-posters/storefront-posters.module';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        if (!databaseUrl) {
          throw new Error(
            'DATABASE_URL is required - set your Supabase/PostgreSQL connection string in .env',
          );
        }

        return {
          type: 'postgres',
          url: databaseUrl,
          entities: ['dist/**/*.entity{.ts,.js}'],
          synchronize: false,
          ssl: {
            rejectUnauthorized: false,
          },
        };
      },
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile:
        process.env.NODE_ENV === 'production'
          ? join(process.cwd(), 'dist/schema.gql')
          : join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
    }),
    ConfigModule.forRoot({
      isGlobal: true, // Làm cho ConfigModule có sẵn ở mọi nơi trong ứng dụng
      envFilePath: '.env', // Đường dẫn đến file .env
    }),
    NotificationsModule,
    ProductsModule,
    ReviewModule,
    AuthModule,
    UserModule,
    CartModule,
    WishlistModule,
    AddressModule,
    OrderModule,
    AdminModule,
    StorefrontPostersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
