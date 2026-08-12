import { Controller, Get, Post, Body, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { PaginatedProductResponseDto } from './dto/paginated-product-response.dto';
// import { UpdateProductDto } from './dto/update-product.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';
import { RolesGuard } from '../guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Product } from './entities/product.entity';
import { ProductSuggestionQueryDto } from './dto/product-suggestion-query.dto';
import type { ProductSuggestion } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'The product has been successfully created.',
    type: Product,
  })
  create(@Body() createProductDto: CreateProductDto): Promise<Product> {
    return this.productsService.create(createProductDto);
  }

  /** Public catalog — matches Nova Shop SEO / guest browsing on `/products`. */
  @Get()
  @ApiOperation({ summary: 'Get all products with search and pagination (public)' })
  @ApiResponse({
    status: 200,
    description: 'Return paginated products with search functionality.',
    type: PaginatedProductResponseDto,
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search by product name' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
  async findAll(@Query() queryDto: QueryProductDto): Promise<PaginatedProductResponseDto> {
    return this.productsService.findAll(queryDto);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get lightweight product search suggestions (public)' })
  @ApiResponse({ status: 200, description: 'Return matching product suggestions.' })
  async suggestions(
    @Query() queryDto: ProductSuggestionQueryDto,
  ): Promise<ProductSuggestion[]> {
    return this.productsService.findSuggestions(queryDto.query, queryDto.limit);
  }

  /** Public product detail — matches Nova Shop `/products/[slug]`. */
  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID (public)' })
  @ApiResponse({
    status: 200,
    description: 'Return the product with the specified ID.',
    type: Product,
  })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  findOne(@Param('id') id: string): Promise<Product> {
    return this.productsService.findOne(+id);
  }

  //   @Put(':id')
  //   @ApiOperation({ summary: 'Update a product by ID' })
  //   @ApiResponse({
  //     status: 200,
  //     description: 'The product has been successfully updated.',
  //     type: Product,
  //   })
  //   @ApiResponse({ status: 404, description: 'Product not found.' })
  //   update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto): Promise<Product> {
  //     return this.productsService.update(+id, updateProductDto);
  //   }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product by ID (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'The product has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  remove(@Param('id') id: string): Promise<void> {
    return this.productsService.remove(+id);
  }
}
