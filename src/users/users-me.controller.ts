import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';

type Authed = Request & { user: { id: number } };

@Controller('users/me')
@UseGuards(AuthGuard('jwt'))
export class UsersMeController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  getProfile(@Req() req: Authed) {
    return this.usersService.getMyProfile(req.user.id);
  }

  @Patch('profile')
  updateProfile(@Req() req: Authed, @Body() dto: UpdateMyProfileDto) {
    return this.usersService.updateMyProfile(req.user.id, dto);
  }
}
