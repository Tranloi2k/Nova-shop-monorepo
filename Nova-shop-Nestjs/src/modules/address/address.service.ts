import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Address } from './entities/address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(userId: number): Promise<Address[]> {
    return this.addressRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', updatedAt: 'DESC' },
    });
  }

  /** Fetch an address that must belong to the given user, or throw 404. */
  async findOwned(userId: number, id: number): Promise<Address> {
    const address = await this.addressRepository.findOne({ where: { id, userId } });
    if (!address) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }
    return address;
  }

  async create(userId: number, dto: CreateAddressDto): Promise<Address> {
    return this.dataSource.transaction(async (manager) => {
      const isFirst = (await manager.count(Address, { where: { userId } })) === 0;
      const makeDefault = dto.isDefault === true || isFirst;

      if (makeDefault) {
        await manager.update(Address, { userId }, { isDefault: false });
      }

      const address = manager.create(Address, {
        ...dto,
        line2: dto.line2 ?? null,
        state: dto.state ?? null,
        userId,
        isDefault: makeDefault,
      });
      return manager.save(Address, address);
    });
  }

  async update(userId: number, id: number, dto: UpdateAddressDto): Promise<Address> {
    return this.dataSource.transaction(async (manager) => {
      const address = await manager.findOne(Address, { where: { id, userId } });
      if (!address) {
        throw new NotFoundException(`Address with ID ${id} not found`);
      }

      if (dto.isDefault === true) {
        await manager.update(Address, { userId }, { isDefault: false });
      }

      Object.assign(address, dto);
      return manager.save(Address, address);
    });
  }

  async remove(userId: number, id: number): Promise<void> {
    const address = await this.findOwned(userId, id);
    const wasDefault = address.isDefault;
    await this.addressRepository.remove(address);

    // Promote another address to default so the user always has one.
    if (wasDefault) {
      const next = await this.addressRepository.findOne({
        where: { userId },
        order: { updatedAt: 'DESC' },
      });
      if (next) {
        next.isDefault = true;
        await this.addressRepository.save(next);
      }
    }
  }

  async setDefault(userId: number, id: number): Promise<Address> {
    return this.dataSource.transaction(async (manager) => {
      const address = await manager.findOne(Address, { where: { id, userId } });
      if (!address) {
        throw new NotFoundException(`Address with ID ${id} not found`);
      }
      await manager.update(Address, { userId }, { isDefault: false });
      address.isDefault = true;
      return manager.save(Address, address);
    });
  }
}
