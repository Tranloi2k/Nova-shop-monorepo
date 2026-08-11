// user.module.ts
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { OwnsResourceGuard } from '../guard/owns-resource.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserService, OwnsResourceGuard],
  exports: [UserService], // Export UserService
  controllers: [UserController],
})
export class UserModule {}
