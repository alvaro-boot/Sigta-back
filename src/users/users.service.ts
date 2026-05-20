import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { normalizeWhatsAppPhone } from '../notifications/phone.util';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const hash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      email: dto.email.toLowerCase(),
      passwordHash: hash,
      role: dto.role,
      fullName: dto.fullName,
      isActive: dto.isActive ?? true,
    });
    return this.usersRepo.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepo.find({ order: { id: 'ASC' } });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  async validatePassword(user: User, plain: string): Promise<boolean> {
    return bcrypt.compare(plain, user.passwordHash);
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (dto.email !== undefined) user.email = dto.email.toLowerCase();
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.password) user.passwordHash = await bcrypt.hash(dto.password, 10);
    return this.usersRepo.save(user);
  }

  async getMyProfile(userId: number) {
    const u = await this.findById(userId);
    if (!u) throw new NotFoundException('Usuario no encontrado');
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      whatsappPhone: u.whatsappPhone,
      whatsappNotifyEnabled: u.whatsappNotifyEnabled,
    };
  }

  async updateMyProfile(userId: number, dto: UpdateMyProfileDto) {
    const u = await this.findById(userId);
    if (!u) throw new NotFoundException('Usuario no encontrado');
    if (dto.whatsappPhone !== undefined) {
      if (dto.whatsappPhone === null) {
        u.whatsappPhone = null;
      } else {
        const n = normalizeWhatsAppPhone(dto.whatsappPhone);
        if (!n) {
          throw new BadRequestException(
            'Número de WhatsApp inválido. Use formato colombiano, ej. 3001234567',
          );
        }
        u.whatsappPhone = n;
      }
    }
    if (dto.whatsappNotifyEnabled !== undefined) {
      u.whatsappNotifyEnabled = dto.whatsappNotifyEnabled;
    }
    await this.usersRepo.save(u);
    return this.getMyProfile(userId);
  }
}
