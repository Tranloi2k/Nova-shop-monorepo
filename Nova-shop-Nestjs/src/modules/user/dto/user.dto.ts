import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'User Name', example: 'loi_tran' })
  @IsString()
  @IsNotEmpty()
  userName: string;

  @ApiProperty({
    description: 'email',
    example: 'abc@gmail.com',
  })
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty({
    description: 'password',
    example: 'abc123',
  })
  @IsNotEmpty()
  @IsString()
  password: string;
}

export class UpdateUserDto {
  @ApiProperty({ description: 'User Name', example: 'loi_tran', required: false })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({
    description: 'email',
    example: 'abc@gmail.com',
    required: false,
  })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'password',
    example: 'abc123',
    required: false,
  })
  @IsString()
  @IsOptional()
  password?: string;
}
