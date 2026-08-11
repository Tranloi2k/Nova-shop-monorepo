import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  app.use(cookieParser());
  const configService = app.get(ConfigService);

  const allowedOriginsStr = configService.get<string>('ALLOWED_ORIGINS') || '';
  const allowedOrigins = allowedOriginsStr
    .split(',')
    .map(origin => origin.trim().replace(/\/+$/, ''))
    .filter(origin => origin.length > 0);

  app.enableCors({
    origin: allowedOrigins, // Chỉ cho phép domain này
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Các phương thức HTTP được phép
    allowedHeaders: 'Content-Type, Accept, Authorization', // Các header được phép
    credentials: true, // Cho phép gửi cookie hoặc thông tin xác thực
  });

  // Cấu hình Swagger
  const config = new DocumentBuilder()
    .setTitle('Product API')
    .setDescription('API for managing products')
    .setVersion('1.0')
    .addTag('products') // Thêm tag để nhóm các API liên quan
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // Truy cập Swagger UI tại /api

  const port = Number(process.env.PORT) || 5000;
  await app.listen(port);
}
bootstrap();
