import { IsIn, IsNotEmpty, IsString, Matches } from 'class-validator';

const DAYS_OF_WEEK = [
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
  'Niedziela',
];

export class CreateAvailabilityDto {
  @IsString()
  @IsIn(DAYS_OF_WEEK)
  day_of_week: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  start_time: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  end_time: string;
}
