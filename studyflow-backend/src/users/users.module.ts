import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { StudentsController } from './students.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, StudentsController],
  providers: [UsersService],
})
export class UsersModule {}
