import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterStudentDto } from './dto/register-student.dto';
import type { JwtPayload } from './jwt-payload.interface';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const ok = await this.usersService.validatePassword(user, dto.password);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      },
    };
  }

  /** Auto-registro permitido únicamente con rol estudiante. */
  async registerStudent(dto: RegisterStudentDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Este correo ya está registrado');
    }
    await this.usersService.create({
      email: dto.email,
      password: dto.password,
      fullName: dto.fullName,
      role: UserRole.STUDENT,
      isActive: true,
      whatsappPhone: dto.whatsappPhone,
    });
    return this.login({ email: dto.email, password: dto.password });
  }
}
