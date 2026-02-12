"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var MarketDataService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketDataService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const ws_1 = __importDefault(require("ws"));
const market_gateway_1 = require("../market-gateway/market.gateway");
let MarketDataService = MarketDataService_1 = class MarketDataService {
    constructor(configService, httpService, gateway) {
        this.configService = configService;
        this.httpService = httpService;
        this.gateway = gateway;
        this.logger = new common_1.Logger(MarketDataService_1.name);
        this.finnhubSubscriptions = new Set();
        this.defaultSymbols = [
            { symbol: 'AAPL', description: 'Apple Inc' },
            { symbol: 'GOOGL', description: 'Alphabet Inc' },
            { symbol: 'MSFT', description: 'Microsoft Corp' },
            { symbol: 'AMZN', description: 'Amazon.com Inc' },
            { symbol: 'TSLA', description: 'Tesla Inc' },
            { symbol: 'META', description: 'Meta Platforms Inc' },
            { symbol: 'NVDA', description: 'Nvidia Corp' },
        ];
        this.finnhubApiKey = this.configService.get('FINNHUB_API_KEY');
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
    connect() {
        const url = `wss://ws.finnhub.io?token=${this.finnhubApiKey}`;
        this.logger.log('Connecting to Finnhub WebSocket...');
        this.ws = new ws_1.default(url);
        this.ws.on('open', () => {
            this.logger.log('Connected to Finnhub WebSocket');
            for (const symbol of this.finnhubSubscriptions) {
                this.sendFinnhubSubscribe(symbol);
            }
        });
        this.ws.on('message', (raw) => {
            try {
                const data = JSON.parse(raw.toString());
                this.handleFinnhubMessage(data);
            }
            catch (err) {
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
    handleFinnhubMessage(message) {
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
    subscribeToFinnhub(symbol) {
        const upperSymbol = symbol.toUpperCase();
        if (this.finnhubSubscriptions.has(upperSymbol))
            return;
        this.finnhubSubscriptions.add(upperSymbol);
        this.sendFinnhubSubscribe(upperSymbol);
        this.logger.log(`Subscribed to Finnhub: ${upperSymbol}`);
    }
    unsubscribeFromFinnhub(symbol) {
        const upperSymbol = symbol.toUpperCase();
        if (!this.finnhubSubscriptions.has(upperSymbol))
            return;
        this.finnhubSubscriptions.delete(upperSymbol);
        this.sendFinnhubUnsubscribe(upperSymbol);
        this.logger.log(`Unsubscribed from Finnhub: ${upperSymbol}`);
    }
    sendFinnhubSubscribe(symbol) {
        if (this.ws?.readyState === ws_1.default.OPEN) {
            this.ws.send(JSON.stringify({ type: 'subscribe', symbol }));
        }
    }
    sendFinnhubUnsubscribe(symbol) {
        if (this.ws?.readyState === ws_1.default.OPEN) {
            this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol }));
        }
    }
    async fetchQuote(symbol) {
        const upperSymbol = symbol.toUpperCase();
        const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(upperSymbol)}&token=${this.finnhubApiKey}`));
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
    async searchSymbols(query) {
        if (!query || query.trim().length === 0) {
            return [];
        }
        const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${this.finnhubApiKey}`));
        return (response.data.result || []).slice(0, 10).map((item) => ({
            symbol: item.symbol,
            description: item.description,
        }));
    }
};
exports.MarketDataService = MarketDataService;
exports.MarketDataService = MarketDataService = MarketDataService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => market_gateway_1.MarketGateway))),
    __metadata("design:paramtypes", [config_1.ConfigService,
        axios_1.HttpService,
        market_gateway_1.MarketGateway])
], MarketDataService);
//# sourceMappingURL=market-data.service.js.map