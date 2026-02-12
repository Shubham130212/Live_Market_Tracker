import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NewsService } from './news.service';
import { AiAnalysisModule } from '../ai-analysis/ai-analysis.module';
import { MarketGatewayModule } from '../market-gateway/market-gateway.module';

@Module({
  imports: [HttpModule, AiAnalysisModule, MarketGatewayModule],
  providers: [NewsService],
})
export class NewsModule {}
