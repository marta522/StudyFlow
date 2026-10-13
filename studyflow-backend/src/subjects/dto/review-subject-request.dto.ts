import { IsEnum } from 'class-validator';
import { RequestStatus } from '../subject-status.enum';

export class ReviewSubjectRequestDto {
  @IsEnum(RequestStatus)
  status: RequestStatus;
}
