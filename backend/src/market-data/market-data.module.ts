import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MarketDataService } from './market-data.service';
import { MarketGatewayModule } from '../market-gateway/market-gateway.module';
import { MarketDataController } from './market-data.controller';

@Module({
  imports: [forwardRef(() => MarketGatewayModule), HttpModule],
  controllers: [MarketDataController],
  providers: [MarketDataService],
  exports: [MarketDataService],
})
export class MarketDataModule {}
