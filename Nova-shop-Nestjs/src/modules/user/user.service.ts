import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10; // Số vòng lặp để tạo salt
    return await bcrypt.hash(password, saltRounds);
  }

  // Tạo người dùng mới
  async createUser(username: string, email: string, password: string): Promise<User> {
    const hashPassword = await this.hashPassword(password);
    const user = this.userRepository.create({ username, email, password: hashPassword });
    return this.userRepository.save(user);
  }

  // Tìm người dùng theo email (hỗ trợ load password khi cần validate credentials)
  async findUserByEmail(email: string, selectPassword = false): Promise<User | null> {
    if (selectPassword) {
      return this.userRepository
        .createQueryBuilder('user')
        .where('user.email = :email', { email })
        .addSelect('user.password')
        .getOne();
    }
    return this.userRepository.findOne({ where: { email } });
  }

  // Tìm người dùng theo ID
  async findUserById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  // Cập nhật thông tin người dùng
  async updateUser(id: number, updates: Partial<User>): Promise<User | null> {
    await this.userRepository.update(id, updates);
    return this.userRepository.findOne({ where: { id } });
  }

  // Cập nhật thông tin profile người dùng (hỗ trợ hash password nếu có)
  async updateUserProfile(
    id: number,
    updates: { username?: string; email?: string; password?: string },
  ): Promise<User | null> {
    const dataToUpdate: Partial<User> = {};
    if (updates.username) {
      dataToUpdate.username = updates.username;
    }
    if (updates.email) {
      dataToUpdate.email = updates.email;
    }
    if (updates.password) {
      dataToUpdate.password = await this.hashPassword(updates.password);
    }
    return this.updateUser(id, dataToUpdate);
  }

  // Xóa người dùng
  async deleteUser(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }
}
