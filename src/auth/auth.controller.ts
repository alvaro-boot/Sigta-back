import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterStudentDto } from './dto/register-student.dto';
import type { Request } from 'express';

type AuthedRequest = Request & {
  user: { id: number; email: string; role: string; fullName: string };
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  register(@Body() dto: RegisterStudentDto) {
    return this.authService.registerStudent(dto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Req() req: AuthedRequest) {
    return req.user;
  }
}
