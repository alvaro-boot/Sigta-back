import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelTutoringDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined ? undefined : value,
  )
  reason?: string;
}
