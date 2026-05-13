import { Type, Transform } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SessionModality } from '../../common/enums/session-modality.enum';

/** La tutoría siempre dura exactamente 1 hora; `endAt` se calcula en el servidor. */
export class CreateTutoringRequestDto {
  @IsNumber()
  @Type(() => Number)
  subjectId: number;

  @Type(() => Date)
  @IsDate()
  startAt: Date;

  @IsEnum(SessionModality)
  modality: SessionModality;

  /** Si se omite, el sistema asigna un profesor disponible (comportamiento anterior). */
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined ? undefined : value,
  )
  @IsNumber()
  @Type(() => Number)
  professorId?: number;

  /** Docente preferido en asignación automática (si está disponible para la franja). */
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined ? undefined : value,
  )
  @IsNumber()
  @Type(() => Number)
  preferredProfessorId?: number;

  /** Motivo o tema breve (opcional). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined ? undefined : value,
  )
  topic?: string;
}
