import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => (value === '' || value === null ? null : value))
  @Matches(/^[\d\s+\-()]+$/, {
    message: 'Teléfono: solo dígitos, espacios y + - ( )',
  })
  whatsappPhone?: string | null;

  @IsOptional()
  @IsBoolean()
  whatsappNotifyEnabled?: boolean;
}
