import { Type } from 'class-transformer';
import { IsDate, IsNumber } from 'class-validator';

export class CreateTutoringRequestDto {
  @IsNumber()
  @Type(() => Number)
  subjectId: number;

  @Type(() => Date)
  @IsDate()
  startAt: Date;

  @Type(() => Date)
  @IsDate()
  endAt: Date;
}
