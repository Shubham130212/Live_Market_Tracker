import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from '../subscription/subscription.service';
import { AiAnalysisService } from '../ai-analysis/ai-analysis.service';
import { MarketGateway } from '../market-gateway/market.gateway';
export declare class NewsService {
    private readonly httpService;
    private readonly configService;
    private readonly subscriptionService;
    private readonly aiAnalysisService;
    private readonly gateway;
    private readonly logger;
    private readonly sentArticleUrls;
    constructor(httpService: HttpService, configService: ConfigService, subscriptionService: SubscriptionService, aiAnalysisService: AiAnalysisService, gateway: MarketGateway);
    handleNewsFetchCron(): Promise<void>;
    private fetchNewsForSymbol;
}
