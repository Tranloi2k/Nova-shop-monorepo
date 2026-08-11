import { IsString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ description: 'The name of the product', example: 'Laptop' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'The description of the product',
    example: 'A high-performance laptop',
  })
  @IsString()
  description: string;

  @ApiProperty({ description: 'The price of the product', example: 1500 })
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @ApiProperty({ description: 'The stock of the product', example: 100, required: false })
  @IsNumber()
  @IsOptional()
  stock?: number;
}
