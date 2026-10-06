import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateManagedUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(45)
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(45)
  last_name!: string;

  @IsEmail()
  @MaxLength(100)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsIn(['student', 'tutor'])
  role!: 'student' | 'tutor';

  @IsOptional()
  @IsString()
  @MaxLength(45)
  phone?: string;
}
