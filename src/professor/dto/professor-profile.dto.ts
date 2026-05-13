import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  Max,
  Min,
  IsString,
  Matches,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { SessionModality } from '../../common/enums/session-modality.enum';

export class AddAvailabilityDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, {
    message: 'startTime debe ser HH:mm o HH:mm:ss',
  })
  startTime: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/, {
    message: 'endTime debe ser HH:mm o HH:mm:ss',
  })
  endTime: string;

  @IsEnum(SessionModality)
  modality: SessionModality;
}

export class AddSpecialtyDto {
  @IsNumber()
  @Type(() => Number)
  subjectId: number;
}

export class UpdateProfessorProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  @Transform(({ value }) => (value === '' ? null : value))
  profileBio?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (value === '' ? null : value))
  officeLocation?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  @Transform(({ value }) => (value === '' ? null : value))
  virtualMeetingUrl?: string | null;
}
