import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { SessionModality } from '../../common/enums/session-modality.enum';

export class AvailableSlotsQueryDto {
  @IsNumber()
  @Type(() => Number)
  subjectId: number;

  /** Fecha civil en la zona de la app (YYYY-MM-DD). */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date debe tener formato YYYY-MM-DD',
  })
  date: string;

  @IsEnum(SessionModality)
  modality: SessionModality;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  professorId?: number;
}
