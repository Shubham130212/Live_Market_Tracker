"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SubscriptionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const common_1 = require("@nestjs/common");
let SubscriptionService = SubscriptionService_1 = class SubscriptionService {
    constructor() {
        this.logger = new common_1.Logger(SubscriptionService_1.name);
        this.subscriptions = new Map();
    }
    subscribe(clientId, symbol) {
        const upperSymbol = symbol.toUpperCase();
        if (!this.subscriptions.has(upperSymbol)) {
            this.subscriptions.set(upperSymbol, new Set());
        }
        const clients = this.subscriptions.get(upperSymbol);
        const isFirst = clients.size === 0;
        clients.add(clientId);
        this.logger.log(`Client ${clientId} subscribed to ${upperSymbol} (total: ${clients.size})`);
        return isFirst;
    }
    unsubscribe(clientId, symbol) {
        const upperSymbol = symbol.toUpperCase();
        const clients = this.subscriptions.get(upperSymbol);
        if (!clients)
            return false;
        clients.delete(clientId);
        const isLast = clients.size === 0;
        if (isLast) {
            this.subscriptions.delete(upperSymbol);
        }
        this.logger.log(`Client ${clientId} unsubscribed from ${upperSymbol} (remaining: ${clients?.size ?? 0})`);
        return isLast;
    }
    removeClient(clientId) {
        const emptySymbols = [];
        for (const [symbol, clients] of this.subscriptions.entries()) {
            if (clients.has(clientId)) {
                clients.delete(clientId);
                if (clients.size === 0) {
                    this.subscriptions.delete(symbol);
                    emptySymbols.push(symbol);
                }
            }
        }
        if (emptySymbols.length > 0) {
            this.logger.log(`Client ${clientId} disconnected. Symbols with no clients: ${emptySymbols.join(', ')}`);
        }
        return emptySymbols;
    }
    getActiveSymbols() {
        return Array.from(this.subscriptions.keys());
    }
    getClients(symbol) {
        return this.subscriptions.get(symbol.toUpperCase()) || new Set();
    }
    hasSubscribers(symbol) {
        const clients = this.subscriptions.get(symbol.toUpperCase());
        return clients !== undefined && clients.size > 0;
    }
};
exports.SubscriptionService = SubscriptionService;
exports.SubscriptionService = SubscriptionService = SubscriptionService_1 = __decorate([
    (0, common_1.Injectable)()
], SubscriptionService);
//# sourceMappingURL=subscription.service.js.map