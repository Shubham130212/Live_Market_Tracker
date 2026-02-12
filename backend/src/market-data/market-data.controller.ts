import { Controller, Get, Param, Query } from '@nestjs/common';
import { MarketDataService } from './market-data.service';

@Controller('symbols')
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get()
  getDefaults() {
    return this.marketDataService.getDefaultSymbols();
  }

  @Get('search')
  search(@Query('q') query: string) {
    return this.marketDataService.searchSymbols(query);
  }

  @Get('quote/:symbol')
  getQuote(@Param('symbol') symbol: string) {
    return this.marketDataService.fetchQuote(symbol);
  }
}
