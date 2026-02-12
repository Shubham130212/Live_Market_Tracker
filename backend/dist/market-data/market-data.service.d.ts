import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { MarketGateway } from '../market-gateway/market.gateway';
export declare class MarketDataService implements OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly httpService;
    private readonly gateway;
    private readonly logger;
    private ws;
    private reconnectTimeout;
    private readonly finnhubApiKey;
    private readonly finnhubSubscriptions;
    private readonly defaultSymbols;
    constructor(configService: ConfigService, httpService: HttpService, gateway: MarketGateway);
    onModuleInit(): void;
    onModuleDestroy(): void;
    private connect;
    private handleFinnhubMessage;
    subscribeToFinnhub(symbol: string): void;
    unsubscribeFromFinnhub(symbol: string): void;
    private sendFinnhubSubscribe;
    private sendFinnhubUnsubscribe;
    fetchQuote(symbol: string): Promise<{
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
    getDefaultSymbols(): {
        symbol: string;
        description: string;
    }[];
    searchSymbols(query: string): Promise<any>;
}
