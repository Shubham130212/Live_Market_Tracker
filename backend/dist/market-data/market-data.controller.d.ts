import { MarketDataService } from './market-data.service';
export declare class MarketDataController {
    private readonly marketDataService;
    constructor(marketDataService: MarketDataService);
    getDefaults(): {
        symbol: string;
        description: string;
    }[];
    search(query: string): Promise<any>;
    getQuote(symbol: string): Promise<{
        symbol: string;
        price: any;
        change: any;
        changePercent: any;
        high: any;
        low: any;
        open: any;
        previousClose: any;
        timestamp: number;
    }>;
}
