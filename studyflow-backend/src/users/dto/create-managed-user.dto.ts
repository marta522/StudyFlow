import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateManagedUserDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(45)
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(45)
  last_name!: string;

  @IsEmail()
  @MaxLength(100)
  email!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Hasło musi zawierać małą i wielką literę oraz cyfrę.',
  })
  @MaxLength(72)
  password!: string;

  @IsIn(['student', 'tutor'])
  role!: 'student' | 'tutor';

  @IsOptional()
  @IsString()
  @MaxLength(45)
  phone?: string;
}
