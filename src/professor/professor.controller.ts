import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ProfessorService } from './professor.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { AddAvailabilityDto, AddSpecialtyDto } from './dto/professor-profile.dto';

type Authed = Request & { user: { id: number } };

@Controller('professor')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.PROFESSOR)
export class ProfessorController {
  constructor(private readonly professorService: ProfessorService) {}

  @Get('specialties')
  listSpecialties(@Req() req: Authed) {
    return this.professorService.listSpecialties(req.user.id);
  }

  @Post('specialties')
  addSpecialty(@Req() req: Authed, @Body() dto: AddSpecialtyDto) {
    return this.professorService.addSpecialty(req.user.id, dto.subjectId);
  }

  @Delete('specialties/:subjectId')
  removeSpecialty(
    @Req() req: Authed,
    @Param('subjectId', ParseIntPipe) subjectId: number,
  ) {
    return this.professorService.removeSpecialty(req.user.id, subjectId);
  }

  @Get('availability')
  listAvailability(@Req() req: Authed) {
    return this.professorService.listAvailability(req.user.id);
  }

  @Post('availability')
  addAvailability(@Req() req: Authed, @Body() dto: AddAvailabilityDto) {
    return this.professorService.addAvailability(req.user.id, dto);
  }

  @Delete('availability/:id')
  removeAvailability(
    @Req() req: Authed,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.professorService.removeAvailability(req.user.id, id);
  }
}
