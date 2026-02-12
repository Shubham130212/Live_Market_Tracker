import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import WebSocket from 'ws';
import { MarketGateway } from '../market-gateway/market.gateway';

@Injectable()
export class MarketDataService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketDataService.name);
  private ws: WebSocket;
  private reconnectTimeout: NodeJS.Timeout;
  private readonly finnhubApiKey: string;

  // Track which symbols we've subscribed to on Finnhub
  private readonly finnhubSubscriptions = new Set<string>();

  private readonly defaultSymbols = [
    { symbol: 'AAPL', description: 'Apple Inc' },
    { symbol: 'GOOGL', description: 'Alphabet Inc' },
    { symbol: 'MSFT', description: 'Microsoft Corp' },
    { symbol: 'AMZN', description: 'Amazon.com Inc' },
    { symbol: 'TSLA', description: 'Tesla Inc' },
    { symbol: 'META', description: 'Meta Platforms Inc' },
    { symbol: 'NVDA', description: 'Nvidia Corp' },
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject(forwardRef(() => MarketGateway))
    private readonly gateway: MarketGateway,
  ) {
    this.finnhubApiKey = this.configService.get<string>('FINNHUB_API_KEY');
  }

  onModuleInit() {
    this.connect();
  }

  onModuleDestroy() {
    if (this.ws) {
      this.ws.close();
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
  }

  private connect() {
    const url = `wss://ws.finnhub.io?token=${this.finnhubApiKey}`;
    this.logger.log('Connecting to Finnhub WebSocket...');

    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      this.logger.log('Connected to Finnhub WebSocket');

      // Re-subscribe to all tracked symbols after reconnection
      for (const symbol of this.finnhubSubscriptions) {
        this.sendFinnhubSubscribe(symbol);
      }
    });

    this.ws.on('message', (raw: WebSocket.Data) => {
      try {
        const data = JSON.parse(raw.toString());
        this.handleFinnhubMessage(data);
      } catch (err) {
        this.logger.error('Failed to parse Finnhub message', err);
      }
    });

    this.ws.on('close', () => {
      this.logger.warn('Finnhub WebSocket closed. Reconnecting in 5s...');
      this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
    });

    this.ws.on('error', (err) => {
      this.logger.error('Finnhub WebSocket error', err.message);
    });
  }

  // Finnhub trade messages
  private handleFinnhubMessage(message: any) {
    if (message.type === 'trade' && message.data) {
      for (const trade of message.data) {
        const priceData = {
          symbol: trade.s,
          price: trade.p,
          volume: trade.v,
          timestamp: trade.t,
        };
        this.gateway.emitPriceUpdate(trade.s, priceData);
      }
    }
  }

  // Subscribe to a symbol on Finnhub
  subscribeToFinnhub(symbol: string) {
    const upperSymbol = symbol.toUpperCase();
    if (this.finnhubSubscriptions.has(upperSymbol)) return;

    this.finnhubSubscriptions.add(upperSymbol);
    this.sendFinnhubSubscribe(upperSymbol);
    this.logger.log(`Subscribed to Finnhub: ${upperSymbol}`);
  }

  //Unsubscribe from a symbol on Finnhub
  unsubscribeFromFinnhub(symbol: string) {
    const upperSymbol = symbol.toUpperCase();
    if (!this.finnhubSubscriptions.has(upperSymbol)) return;

    this.finnhubSubscriptions.delete(upperSymbol);
    this.sendFinnhubUnsubscribe(upperSymbol);
    this.logger.log(`Unsubscribed from Finnhub: ${upperSymbol}`);
  }

  private sendFinnhubSubscribe(symbol: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', symbol }));
    }
  }

  private sendFinnhubUnsubscribe(symbol: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol }));
    }
  }

  async fetchQuote(symbol: string) {
    const upperSymbol = symbol.toUpperCase();
    const response = await firstValueFrom(
      this.httpService.get(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(upperSymbol)}&token=${this.finnhubApiKey}`,
      ),
    );

    const q = response.data;
    return {
      symbol: upperSymbol,
      price: q.c,
      change: q.d,
      changePercent: q.dp,
      high: q.h,
      low: q.l,
      open: q.o,
      previousClose: q.pc,
      timestamp: Date.now(),
    };
  }

  getDefaultSymbols() {
    return this.defaultSymbols;
  }

  async searchSymbols(query: string) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const response = await firstValueFrom(
      this.httpService.get(
        `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${this.finnhubApiKey}`,
      ),
    );

    return (response.data.result || []).slice(0, 10).map((item: any) => ({
      symbol: item.symbol,
      description: item.description,
    }));
  }
}
