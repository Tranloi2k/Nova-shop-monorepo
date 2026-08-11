import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const CLOUDINARY_IMAGE_URL_PATTERN =
  /^https:\/\/res\.cloudinary\.com\/.+/i;

export class AdminCreatePosterDto {
  @ApiProperty({
    description: 'Poster image URL (Cloudinary CDN)',
    example: 'https://res.cloudinary.com/demo/image/upload/v123/nova/posters/promo.jpg',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(CLOUDINARY_IMAGE_URL_PATTERN, {
    message: 'imageUrl must be a Cloudinary HTTPS URL (https://res.cloudinary.com/...)',
  })
  imageUrl: string;

  @ApiProperty({ description: 'Linked product ID', example: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId: number;

  @ApiPropertyOptional({ description: 'Accessible alt text', example: 'iPhone 17 Pro promo' })
  @IsString()
  @IsOptional()
  altText?: string;

  @ApiPropertyOptional({ description: 'Display order (lower first)', example: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Whether the poster is visible on the storefront' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AdminUpdatePosterDto {
  @ApiPropertyOptional({
    description: 'Poster image URL (Cloudinary CDN)',
    example: 'https://res.cloudinary.com/demo/image/upload/v123/nova/posters/promo.jpg',
  })
  @ValidateIf((_, value) => value !== undefined && value !== '')
  @Matches(CLOUDINARY_IMAGE_URL_PATTERN, {
    message: 'imageUrl must be a Cloudinary HTTPS URL (https://res.cloudinary.com/...)',
  })
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Linked product ID', example: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  productId?: number;

  @ApiPropertyOptional({ description: 'Accessible alt text' })
  @IsString()
  @IsOptional()
  altText?: string;

  @ApiPropertyOptional({ description: 'Display order (lower first)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Whether the poster is visible on the storefront' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AdminReorderPostersDto {
  @ApiProperty({
    description: 'Poster IDs in desired display order',
    example: [3, 1, 2],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  orderedIds: number[];
}
