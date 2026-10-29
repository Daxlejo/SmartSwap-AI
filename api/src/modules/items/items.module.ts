import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { GeoModule } from '../geo/geo.module';
import { StorageModule } from '../storage/storage.module';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { ItemMapper } from './mappers/item.mapper';

@Module({
  imports: [AiModule, GeoModule, StorageModule],
  controllers: [ItemsController],
  providers: [ItemsService, ItemMapper],
  exports: [ItemsService, ItemMapper],
})
export class ItemsModule {}
