import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

export class RescheduleTutoringDto {
  @Type(() => Date)
  @IsDate()
  startAt: Date;
}
