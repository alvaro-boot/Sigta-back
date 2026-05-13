import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProfessorService } from './professor.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';

/** Directorio de docentes para reservas dirigidas (estudiantes y resto de roles autenticados). */
@Controller('catalog')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.STUDENT, UserRole.PROFESSOR, UserRole.ADMIN)
export class ProfessorCatalogController {
  constructor(private readonly professorService: ProfessorService) {}

  @Get('professors')
  listProfessors() {
    return this.professorService.listCatalogProfessors();
  }

  @Get('professors/:id')
  getProfessor(@Param('id', ParseIntPipe) id: number) {
    return this.professorService.getCatalogProfessorById(id);
  }
}
