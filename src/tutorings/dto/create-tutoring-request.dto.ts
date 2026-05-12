import { Type } from 'class-transformer';
import { IsDate, IsNumber } from 'class-validator';

/** La tutoría siempre dura exactamente 1 hora; `endAt` se calcula en el servidor. */
export class CreateTutoringRequestDto {
  @IsNumber()
  @Type(() => Number)
  subjectId: number;

  @Type(() => Date)
  @IsDate()
  startAt: Date;
}
