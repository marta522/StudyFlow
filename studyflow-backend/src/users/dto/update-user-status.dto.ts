import { IsIn } from 'class-validator';
import { UserStatus, type UserStatusValue } from '../../common/statuses';

export class UpdateUserStatusDto {
  @IsIn(Object.values(UserStatus))
  status: UserStatusValue;
}
