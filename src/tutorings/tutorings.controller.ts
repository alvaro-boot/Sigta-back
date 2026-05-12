import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { TutoringsService } from './tutorings.service';
import { CreateTutoringRequestDto } from './dto/create-tutoring-request.dto';
import { UserRole } from '../common/enums/user-role.enum';

type Authed = Request & {
  user: { id: number; role: UserRole };
};

@Controller('tutorings')
@UseGuards(AuthGuard('jwt'))
export class TutoringsController {
  constructor(private readonly tutoringsService: TutoringsService) {}

  @Post('request')
  create(@Req() req: Authed, @Body() dto: CreateTutoringRequestDto) {
    return this.tutoringsService.createForStudent(req.user.id, req.user.role, dto);
  }

  @Get()
  list(@Req() req: Authed) {
    return this.tutoringsService.listFor(req.user.id, req.user.role);
  }
}
