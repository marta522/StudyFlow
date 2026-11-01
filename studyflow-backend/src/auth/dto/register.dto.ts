import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsIn,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(45)
  first_name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(45)
  last_name: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(100)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Hasło musi zawierać małą i wielką literę oraz cyfrę.',
  })
  @MaxLength(72)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(45)
  phone?: string;

  @IsString()
  @IsIn(['student', 'tutor'])
  role: 'student' | 'tutor';
}
