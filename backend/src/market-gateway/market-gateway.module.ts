import { Module, forwardRef } from '@nestjs/common';
import { MarketGateway } from './market.gateway';
import { MarketDataModule } from '../market-data/market-data.module';

@Module({
  imports: [forwardRef(() => MarketDataModule)],
  providers: [MarketGateway],
  exports: [MarketGateway],
})
export class MarketGatewayModule {}
