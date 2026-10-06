import { IsEnum } from 'class-validator';
import { RequestStatus } from '@prisma/client';

export class ReviewSubjectRequestDto {
  @IsEnum(RequestStatus)
  status: RequestStatus;
}
