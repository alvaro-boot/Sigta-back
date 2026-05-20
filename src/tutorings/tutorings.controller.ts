import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { TutoringsService } from './tutorings.service';
import { CreateTutoringRequestDto } from './dto/create-tutoring-request.dto';
import { CancelTutoringDto } from './dto/cancel-tutoring.dto';
import { RescheduleTutoringDto } from './dto/reschedule-tutoring.dto';
import { AvailableSlotsQueryDto } from './dto/available-slots-query.dto';
import { UserRole } from '../common/enums/user-role.enum';

type Authed = Request & {
  user: { id: number; role: UserRole };
};

@Controller('tutorings')
@UseGuards(AuthGuard('jwt'))
export class TutoringsController {
  constructor(private readonly tutoringsService: TutoringsService) {}

  @Get('queue/unassigned')
  queueUnassigned(@Req() req: Authed) {
    return this.tutoringsService.listUnassignedQueue(req.user.id, req.user.role);
  }

  @Get('available-slots')
  availableSlots(@Req() req: Authed, @Query() query: AvailableSlotsQueryDto) {
    return this.tutoringsService.listAvailableSlotsForStudent(
      req.user.role,
      query,
    );
  }

  @Get()
  list(@Req() req: Authed) {
    return this.tutoringsService.listFor(req.user.id, req.user.role);
  }

  @Post('request')
  create(@Req() req: Authed, @Body() dto: CreateTutoringRequestDto) {
    return this.tutoringsService.createForStudent(req.user.id, req.user.role, dto);
  }

  @Post(':id/cancel')
  cancel(
    @Req() req: Authed,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelTutoringDto,
  ) {
    return this.tutoringsService.cancelByStudent(req.user.id, req.user.role, id, dto);
  }

  @Post(':id/reschedule')
  reschedule(
    @Req() req: Authed,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RescheduleTutoringDto,
  ) {
    return this.tutoringsService.rescheduleByStudent(
      req.user.id,
      req.user.role,
      id,
      dto,
    );
  }

  @Post(':id/confirm')
  confirm(@Req() req: Authed, @Param('id', ParseIntPipe) id: number) {
    return this.tutoringsService.confirmByProfessor(req.user.id, req.user.role, id);
  }

  @Post(':id/release')
  release(@Req() req: Authed, @Param('id', ParseIntPipe) id: number) {
    return this.tutoringsService.releaseByProfessor(req.user.id, req.user.role, id);
  }

  @Post(':id/complete')
  complete(@Req() req: Authed, @Param('id', ParseIntPipe) id: number) {
    return this.tutoringsService.completeByProfessor(req.user.id, req.user.role, id);
  }

  @Post(':id/claim')
  claim(@Req() req: Authed, @Param('id', ParseIntPipe) id: number) {
    return this.tutoringsService.claimUnassigned(req.user.id, req.user.role, id);
  }
}
