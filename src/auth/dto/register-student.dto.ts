import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

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
}
