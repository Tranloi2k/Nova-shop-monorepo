import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, Min, Max, IsIn } from 'class-validator';

export const PRODUCT_SORT_VALUES = [
  'popular',
  'rating',
  'price-low',
  'price-high',
  'newest',
] as const;

export const PRODUCT_CATEGORY_VALUES = [
  'smartphones',
  'tablets',
  'wearables',
  'audio',
  'laptops',
  'accessories',
] as const;

export class QueryProductDto {
  @ApiPropertyOptional({ description: 'Search by product name', example: 'iPhone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: PRODUCT_CATEGORY_VALUES,
  })
  @IsOptional()
  @IsString()
  @IsIn([...PRODUCT_CATEGORY_VALUES])
  category?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: PRODUCT_SORT_VALUES,
    example: 'popular',
  })
  @IsOptional()
  @IsString()
  @IsIn([...PRODUCT_SORT_VALUES])
  sort?: string;

  @ApiPropertyOptional({ description: 'Minimum price', example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price', example: 2000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Only products with a discount', example: 'true' })
  @IsOptional()
  @IsString()
  onSale?: string;

  @ApiPropertyOptional({ description: 'Page number', example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
