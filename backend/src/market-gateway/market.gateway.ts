import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SubscriptionService } from '../subscription/subscription.service';
import { MarketDataService } from '../market-data/market-data.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class MarketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MarketGateway.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => MarketDataService))
    private readonly marketDataService: MarketDataService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connected', {
      message: 'Connected to Live Market Tracker',
      clientId: client.id,
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // symbols which have no clients
    const emptySymbols = this.subscriptionService.removeClient(client.id);

    // Unsubscribe from Finnhub for symbols with no remaining clients
    for (const symbol of emptySymbols) {
      this.marketDataService.unsubscribeFromFinnhub(symbol);
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { symbols: string[] },
  ) {
    if (!data?.symbols || !Array.isArray(data.symbols)) {
      client.emit('error', {
        message: 'Invalid payload. Expected { symbols: string[] }',
      });
      return;
    }

    for (const symbol of data.symbols) {
      const upperSymbol = symbol.toUpperCase();
      const isFirst = this.subscriptionService.subscribe(
        client.id,
        upperSymbol,
      );
      client.join(upperSymbol);

      // First client for this symbol — subscribe on Finnhub
      if (isFirst) {
        this.marketDataService.subscribeToFinnhub(upperSymbol);
      }
    }

    const subscribedSymbols = data.symbols.map((s) => s.toUpperCase());
    client.emit('subscribed', { symbols: subscribedSymbols });

    this.logger.log(
      `Client ${client.id} subscribed to: ${subscribedSymbols.join(', ')}`,
    );
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { symbols: string[] },
  ) {
    if (!data?.symbols || !Array.isArray(data.symbols)) {
      client.emit('error', {
        message: 'Invalid payload. Expected { symbols: string[] }',
      });
      return;
    }

    for (const symbol of data.symbols) {
      const upperSymbol = symbol.toUpperCase();
      const isLast = this.subscriptionService.unsubscribe(
        client.id,
        upperSymbol,
      );
      client.leave(upperSymbol);

      // Last client left — unsubscribe from Finnhub
      if (isLast) {
        this.marketDataService.unsubscribeFromFinnhub(upperSymbol);
      }
    }

    client.emit('unsubscribed', {
      symbols: data.symbols.map((s) => s.toUpperCase()),
    });
  }

  //Emit a price update to all clients in the symbol's room.
  emitPriceUpdate(symbol: string, priceData: any) {
    this.server.to(symbol.toUpperCase()).emit('priceUpdate', priceData);
  }

  // Emit news analyzing event to clients in the symbol's room
  emitNewsAnalyzing(symbol: string) {
    this.server.to(symbol.toUpperCase()).emit('newsAnalyzing', { symbol });
  }

  // Emit news insight to clients in the symbol's room
  emitNewsInsight(symbol: string, insight: any) {
    this.server.to(symbol.toUpperCase()).emit('newsInsight', insight);
  }
}
