import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SubscriptionService } from '../subscription/subscription.service';
import { MarketDataService } from '../market-data/market-data.service';
export declare class MarketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly subscriptionService;
    private readonly marketDataService;
    server: Server;
    private readonly logger;
    constructor(subscriptionService: SubscriptionService, marketDataService: MarketDataService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleSubscribe(client: Socket, data: {
        symbols: string[];
    }): void;
    handleUnsubscribe(client: Socket, data: {
        symbols: string[];
    }): void;
    emitPriceUpdate(symbol: string, priceData: any): void;
    emitNewsAnalyzing(symbol: string): void;
    emitNewsInsight(symbol: string, insight: any): void;
}
