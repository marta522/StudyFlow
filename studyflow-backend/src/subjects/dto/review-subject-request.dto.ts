import { IsIn } from 'class-validator';
import {
  SubjectRequestStatus,
  type SubjectRequestStatusValue,
} from '../../common/statuses';

export class ReviewSubjectRequestDto {
  @IsIn(Object.values(SubjectRequestStatus))
  status: SubjectRequestStatusValue;
}
