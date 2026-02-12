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
var MarketGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const subscription_service_1 = require("../subscription/subscription.service");
const market_data_service_1 = require("../market-data/market-data.service");
let MarketGateway = MarketGateway_1 = class MarketGateway {
    constructor(subscriptionService, marketDataService) {
        this.subscriptionService = subscriptionService;
        this.marketDataService = marketDataService;
        this.logger = new common_1.Logger(MarketGateway_1.name);
    }
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
        client.emit('connected', {
            message: 'Connected to Live Market Tracker',
            clientId: client.id,
        });
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        const emptySymbols = this.subscriptionService.removeClient(client.id);
        for (const symbol of emptySymbols) {
            this.marketDataService.unsubscribeFromFinnhub(symbol);
        }
    }
    handleSubscribe(client, data) {
        if (!data?.symbols || !Array.isArray(data.symbols)) {
            client.emit('error', {
                message: 'Invalid payload. Expected { symbols: string[] }',
            });
            return;
        }
        for (const symbol of data.symbols) {
            const upperSymbol = symbol.toUpperCase();
            const isFirst = this.subscriptionService.subscribe(client.id, upperSymbol);
            client.join(upperSymbol);
            if (isFirst) {
                this.marketDataService.subscribeToFinnhub(upperSymbol);
            }
        }
        const subscribedSymbols = data.symbols.map((s) => s.toUpperCase());
        client.emit('subscribed', { symbols: subscribedSymbols });
        this.logger.log(`Client ${client.id} subscribed to: ${subscribedSymbols.join(', ')}`);
    }
    handleUnsubscribe(client, data) {
        if (!data?.symbols || !Array.isArray(data.symbols)) {
            client.emit('error', {
                message: 'Invalid payload. Expected { symbols: string[] }',
            });
            return;
        }
        for (const symbol of data.symbols) {
            const upperSymbol = symbol.toUpperCase();
            const isLast = this.subscriptionService.unsubscribe(client.id, upperSymbol);
            client.leave(upperSymbol);
            if (isLast) {
                this.marketDataService.unsubscribeFromFinnhub(upperSymbol);
            }
        }
        client.emit('unsubscribed', {
            symbols: data.symbols.map((s) => s.toUpperCase()),
        });
    }
    emitPriceUpdate(symbol, priceData) {
        this.server.to(symbol.toUpperCase()).emit('priceUpdate', priceData);
    }
    emitNewsAnalyzing(symbol) {
        this.server.to(symbol.toUpperCase()).emit('newsAnalyzing', { symbol });
    }
    emitNewsInsight(symbol, insight) {
        this.server.to(symbol.toUpperCase()).emit('newsInsight', insight);
    }
};
exports.MarketGateway = MarketGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], MarketGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], MarketGateway.prototype, "handleSubscribe", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribe'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], MarketGateway.prototype, "handleUnsubscribe", null);
exports.MarketGateway = MarketGateway = MarketGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: '*' },
    }),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => market_data_service_1.MarketDataService))),
    __metadata("design:paramtypes", [subscription_service_1.SubscriptionService,
        market_data_service_1.MarketDataService])
], MarketGateway);
//# sourceMappingURL=market.gateway.js.map