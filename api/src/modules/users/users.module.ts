import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserMapper } from './mappers/user.mapper';

@Module({
  imports: [],
  controllers: [UsersController],
  providers: [UsersService, UserMapper],
  exports: [UsersService, UserMapper],
})
export class UsersModule {}
