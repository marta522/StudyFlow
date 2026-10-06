import { IsBoolean, IsInt, Min } from 'class-validator';

export class MarkAttendanceDto {
  @IsInt()
  @Min(1)
  booking_id: number;

  @IsBoolean()
  present: boolean;
}
