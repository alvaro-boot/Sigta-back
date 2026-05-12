import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  Max,
  Min,
  IsString,
  Matches,
} from 'class-validator';

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
}

export class AddSpecialtyDto {
  @IsNumber()
  @Type(() => Number)
  subjectId: number;
}
