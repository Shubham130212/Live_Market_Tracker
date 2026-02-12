import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
interface NewsArticle {
    title: string;
    description: string;
    url: string;
    source: string;
    publishedAt: string;
}
export interface NewsInsight {
    symbol: string;
    summary: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    keyPoints: string[];
    articleCount: number;
    timestamp: string;
}
export declare class AiAnalysisService {
    private readonly httpService;
    private readonly configService;
    private readonly logger;
    private readonly groqApiKey;
    constructor(httpService: HttpService, configService: ConfigService);
    analyzeNews(symbol: string, articles: NewsArticle[]): Promise<NewsInsight>;
    private safeParseJson;
    private buildInsight;
}
export {};
