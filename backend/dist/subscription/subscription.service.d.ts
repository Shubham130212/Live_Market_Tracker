export declare class SubscriptionService {
    private readonly logger;
    private readonly subscriptions;
    subscribe(clientId: string, symbol: string): boolean;
    unsubscribe(clientId: string, symbol: string): boolean;
    removeClient(clientId: string): string[];
    getActiveSymbols(): string[];
    getClients(symbol: string): Set<string>;
    hasSubscribers(symbol: string): boolean;
}
