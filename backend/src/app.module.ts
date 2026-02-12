import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SubscriptionModule } from './subscription/subscription.module';
import { MarketGatewayModule } from './market-gateway/market-gateway.module';
import { MarketDataModule } from './market-data/market-data.module';
import { NewsModule } from './news/news.module';
import { AiAnalysisModule } from './ai-analysis/ai-analysis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    SubscriptionModule,
    MarketGatewayModule,
    MarketDataModule,
    NewsModule,
    AiAnalysisModule,
  ],
})
export class AppModule {}
