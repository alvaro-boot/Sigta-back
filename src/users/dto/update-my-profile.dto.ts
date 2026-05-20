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
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'boolean') return value;
    if (value === 1 || value === '1' || value === 'true') return true;
    if (value === 0 || value === '0' || value === 'false') return false;
    return Boolean(value);
  })
  @IsBoolean()
  whatsappNotifyEnabled?: boolean;
}
