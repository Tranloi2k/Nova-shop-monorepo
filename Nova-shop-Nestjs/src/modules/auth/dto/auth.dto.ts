import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class LoginDto {
  @ApiProperty({ description: '', example: 'loi@gmail.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: '',
    example: 'tranloi1',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class GetNewTokenDto {
  @ApiProperty({ description: '', example: 'loi@gmail.com' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class LoginResponseDto {
  @Expose()
  id: number;

  @Expose()
  username: string;

  @Expose()
  email: string;
}
