import { IsString, IsNumber, IsNotEmpty, IsOptional, Min, Max, ValidateIf, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const CLOUDINARY_IMAGE_URL_PATTERN =
  /^https:\/\/res\.cloudinary\.com\/.+/i;

export class AdminCreateProductDto {
  @ApiProperty({ description: 'The name of the product', example: 'iPhone 15 Pro Max' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'The description of the product', example: 'Titanium design, A17 Pro chip' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'The category of the product', example: 'smartphones' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'The price of the product', example: 1299 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'The stock of the product', example: 50 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({
    description: 'The primary image URL (Cloudinary CDN)',
    example: 'https://res.cloudinary.com/demo/image/upload/v123/nova/products/iphone.jpg',
  })
  @ValidateIf((_, value) => value !== undefined && value !== '')
  @Matches(CLOUDINARY_IMAGE_URL_PATTERN, {
    message: 'image must be a Cloudinary HTTPS URL (https://res.cloudinary.com/...)',
  })
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({ description: 'Comma separated list of extra images', example: 'img1.jpg,img2.jpg' })
  @IsString()
  @IsOptional()
  images?: string;

  @ApiPropertyOptional({ description: 'Colors available', example: 'Black, White, Natural Titanium' })
  @IsString()
  @IsOptional()
  colors?: string;

  @ApiPropertyOptional({ description: 'Storage options available', example: '256GB, 512GB, 1TB' })
  @IsString()
  @IsOptional()
  storageOptions?: string;

  @ApiPropertyOptional({ description: 'Discount percentage', example: 10 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  discount?: number;

  @ApiPropertyOptional({ description: 'Detail information JSON string', example: '{"screen": "6.7 inch"}' })
  @IsString()
  @IsOptional()
  detailInformation?: string;
}

export class AdminUpdateProductDto {
  @ApiPropertyOptional({ description: 'The name of the product' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'The description of the product' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'The category of the product' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'The price of the product' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'The stock of the product' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({
    description: 'The primary image URL (Cloudinary CDN)',
    example: 'https://res.cloudinary.com/demo/image/upload/v123/nova/products/iphone.jpg',
  })
  @ValidateIf((_, value) => value !== undefined && value !== '')
  @Matches(CLOUDINARY_IMAGE_URL_PATTERN, {
    message: 'image must be a Cloudinary HTTPS URL (https://res.cloudinary.com/...)',
  })
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({ description: 'Comma separated list of extra images' })
  @IsString()
  @IsOptional()
  images?: string;

  @ApiPropertyOptional({ description: 'Colors available' })
  @IsString()
  @IsOptional()
  colors?: string;

  @ApiPropertyOptional({ description: 'Storage options available' })
  @IsString()
  @IsOptional()
  storageOptions?: string;

  @ApiPropertyOptional({ description: 'Discount percentage' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  discount?: number;

  @ApiPropertyOptional({ description: 'Detail information JSON string' })
  @IsString()
  @IsOptional()
  detailInformation?: string;
}
