import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

/** Registro público: solo crea cuenta de estudiante (el rol no se envía). */
export class RegisterStudentDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  fullName: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @Matches(/^[\d\s+\-()]+$/, {
    message: 'Teléfono: solo dígitos, espacios y + - ( )',
  })
  whatsappPhone?: string;
}
