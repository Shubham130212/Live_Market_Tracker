import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  // symbol -> Set of client IDs
  private readonly subscriptions = new Map<string, Set<string>>();

  //  Add a client to a symbol
  subscribe(clientId: string, symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();

    if (!this.subscriptions.has(upperSymbol)) {
      this.subscriptions.set(upperSymbol, new Set());
    }

    const clients = this.subscriptions.get(upperSymbol);
    const isFirst = clients.size === 0;
    clients.add(clientId);

    this.logger.log(
      `Client ${clientId} subscribed to ${upperSymbol} (total: ${clients.size})`,
    );

    return isFirst;
  }

  // Remove a client from a symbol. Returns true if this was the LAST client
  unsubscribe(clientId: string, symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();
    const clients = this.subscriptions.get(upperSymbol);

    if (!clients) return false;

    clients.delete(clientId);
    const isLast = clients.size === 0;

    if (isLast) {
      this.subscriptions.delete(upperSymbol);
    }

    this.logger.log(
      `Client ${clientId} unsubscribed from ${upperSymbol} (remaining: ${clients?.size ?? 0})`,
    );

    return isLast;
  }

  /**
   * Remove a client from ALL symbols (used on disconnect).
   * Returns list of symbols that now have zero clients.
   */
  removeClient(clientId: string): string[] {
    const emptySymbols: string[] = [];

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
      this.logger.log(
        `Client ${clientId} disconnected. Symbols with no clients: ${emptySymbols.join(', ')}`,
      );
    }

    return emptySymbols;
  }

  /**
   * Get all symbols that have at least one subscriber.
   */
  getActiveSymbols(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Get all client IDs subscribed to a symbol.
   */
  getClients(symbol: string): Set<string> {
    return this.subscriptions.get(symbol.toUpperCase()) || new Set();
  }

  /**
   * Check if a symbol has any subscribers.
   */
  hasSubscribers(symbol: string): boolean {
    const clients = this.subscriptions.get(symbol.toUpperCase());
    return clients !== undefined && clients.size > 0;
  }
}
