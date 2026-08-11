import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/user.entity';

@ApiTags('addresses')
@ApiBearerAuth()
@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's saved addresses" })
  @ApiResponse({ status: 200, description: 'Addresses retrieved successfully.' })
  async findAll(@CurrentUser() user: User) {
    return this.addressService.findAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new address for the current user' })
  @ApiResponse({ status: 201, description: 'Address created successfully.' })
  async create(@CurrentUser() user: User, @Body() dto: CreateAddressDto) {
    return this.addressService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an address owned by the current user' })
  @ApiResponse({ status: 200, description: 'Address updated successfully.' })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressService.update(user.id, id, dto);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Mark an address as the default' })
  @ApiResponse({ status: 200, description: 'Default address set successfully.' })
  async setDefault(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.addressService.setDefault(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an address owned by the current user' })
  @ApiResponse({ status: 200, description: 'Address deleted successfully.' })
  async remove(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    await this.addressService.remove(user.id, id);
    return { success: true };
  }
}
