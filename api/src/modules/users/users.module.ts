import { Module } from '@nestjs/common';
import { GeoModule } from '../geo/geo.module';
import { StorageModule } from '../storage/storage.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserMapper } from './mappers/user.mapper';

@Module({
  imports: [GeoModule, StorageModule],
  controllers: [UsersController],
  providers: [UsersService, UserMapper],
  exports: [UsersService, UserMapper],
})
export class UsersModule {}
