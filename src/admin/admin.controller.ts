import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { UpsertSettingDto } from './dto/upsert-setting.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('settings')
  listSettings() {
    return this.adminService.listSettings();
  }

  @Put('settings/:key')
  upsert(
    @Param('key') key: string,
    @Body() dto: UpsertSettingDto,
  ) {
    return this.adminService.upsert(key, dto.value);
  }
}
