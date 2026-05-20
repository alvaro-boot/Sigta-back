import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../../common/enums/user-role.enum';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsString()
  fullName: string;

  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @Matches(/^[\d\s+\-()]+$/, {
    message: 'Teléfono: solo dígitos, espacios y + - ( )',
  })
  whatsappPhone?: string;
}
