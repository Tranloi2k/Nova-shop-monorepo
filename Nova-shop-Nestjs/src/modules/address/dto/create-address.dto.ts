import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: 'Tran Loi' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(128)
  fullName: string;

  @ApiProperty({ example: '+84 912 345 678' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(32)
  phone: string;

  @ApiProperty({ example: '123 Nguyen Trai' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  line1: string;

  @ApiPropertyOptional({ example: 'Apartment 4B' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  line2?: string;

  @ApiProperty({ example: 'Ho Chi Minh City' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(128)
  city: string;

  @ApiPropertyOptional({ example: 'District 1' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  state?: string;

  @ApiProperty({ example: '700000' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(32)
  postalCode: string;

  @ApiProperty({ example: 'Vietnam' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(128)
  country: string;

  @ApiPropertyOptional({ example: true, description: 'Mark as the default address' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
