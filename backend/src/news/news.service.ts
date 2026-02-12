import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SubscriptionService } from '../subscription/subscription.service';
import { AiAnalysisService } from '../ai-analysis/ai-analysis.service';
import { MarketGateway } from '../market-gateway/market.gateway';
import pLimit from 'p-limit';

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  // Track already-sent article URLs to avoid duplicates
  private readonly sentArticleUrls = new Set<string>();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly subscriptionService: SubscriptionService,
    private readonly aiAnalysisService: AiAnalysisService,
    private readonly gateway: MarketGateway,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleNewsFetchCron() {
    const activeSymbols = this.subscriptionService.getActiveSymbols();
    const limit = pLimit(3);

    if (activeSymbols.length === 0) {
      this.logger.log('No active subscriptions. Skipping news fetch.');
      return;
    }

    this.logger.log(
      `Fetching news for active symbols: ${activeSymbols.join(', ')}`,
    );

    await Promise.all(
      activeSymbols.map((symbol) =>
        limit(async () => {
          try {
            const articles = await this.fetchNewsForSymbol(symbol);
            if (articles.length === 0) return;

            this.gateway.emitNewsAnalyzing(symbol);

            const insight = await this.aiAnalysisService.analyzeNews(
              symbol,
              articles,
            );

            this.gateway.emitNewsInsight(symbol, insight);

            this.logger.log(`Processed ${symbol}`);
          } catch (err) {
            this.logger.error(`Error processing ${symbol}`, err);
          }
        }),
      ),
    );
  }

  //Fetch news articles for a given symbol from Finnhub company
  private async fetchNewsForSymbol(symbol: string): Promise<NewsArticle[]> {
    try {
      // Use Finnhub company news endpoint
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const finnhubApiKey = this.configService.get<string>('FINNHUB_API_KEY');

      const response = await firstValueFrom(
        this.httpService.get(
          `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${todayStr}&to=${todayStr}&token=${finnhubApiKey}`,
        ),
      );

      const articles: NewsArticle[] = [];
      for (const item of response.data) {
        // Deduplicate using sentArticleUrls
        if (this.sentArticleUrls.has(item.url)) continue;

        this.sentArticleUrls.add(item.url);
        articles.push({
          title: item.headline,
          description: item.summary,
          url: item.url,
          source: item.source,
          publishedAt: new Date(item.datetime * 1000).toISOString(),
        });
      }

      if (this.sentArticleUrls.size > 1000) {
        const urls = Array.from(this.sentArticleUrls);
        this.sentArticleUrls.clear();
        urls.slice(-500).forEach((u) => this.sentArticleUrls.add(u));
      }

      return articles;
    } catch (err) {
      this.logger.error(`Finnhub news fetch failed for ${symbol}`);
      return [];
    }
  }
}
