import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class ProductSuggestionQueryDto {
  @ApiProperty({ description: 'Partial product name', example: 'iphone' })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  query: string;

  @ApiPropertyOptional({ description: 'Maximum suggestions', default: 6, minimum: 1, maximum: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(8)
  limit?: number = 6;
}
