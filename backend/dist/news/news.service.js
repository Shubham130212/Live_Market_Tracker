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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var NewsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
const subscription_service_1 = require("../subscription/subscription.service");
const ai_analysis_service_1 = require("../ai-analysis/ai-analysis.service");
const market_gateway_1 = require("../market-gateway/market.gateway");
const p_limit_1 = __importDefault(require("p-limit"));
let NewsService = NewsService_1 = class NewsService {
    constructor(httpService, configService, subscriptionService, aiAnalysisService, gateway) {
        this.httpService = httpService;
        this.configService = configService;
        this.subscriptionService = subscriptionService;
        this.aiAnalysisService = aiAnalysisService;
        this.gateway = gateway;
        this.logger = new common_1.Logger(NewsService_1.name);
        this.sentArticleUrls = new Set();
    }
    async handleNewsFetchCron() {
        const activeSymbols = this.subscriptionService.getActiveSymbols();
        const limit = (0, p_limit_1.default)(3);
        if (activeSymbols.length === 0) {
            this.logger.log('No active subscriptions. Skipping news fetch.');
            return;
        }
        this.logger.log(`Fetching news for active symbols: ${activeSymbols.join(', ')}`);
        await Promise.all(activeSymbols.map((symbol) => limit(async () => {
            try {
                const articles = await this.fetchNewsForSymbol(symbol);
                if (articles.length === 0)
                    return;
                this.gateway.emitNewsAnalyzing(symbol);
                const insight = await this.aiAnalysisService.analyzeNews(symbol, articles);
                this.gateway.emitNewsInsight(symbol, insight);
                this.logger.log(`Processed ${symbol}`);
            }
            catch (err) {
                this.logger.error(`Error processing ${symbol}`, err);
            }
        })));
    }
    async fetchNewsForSymbol(symbol) {
        try {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const finnhubApiKey = this.configService.get('FINNHUB_API_KEY');
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${todayStr}&to=${todayStr}&token=${finnhubApiKey}`));
            const articles = [];
            for (const item of response.data) {
                if (this.sentArticleUrls.has(item.url))
                    continue;
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
        }
        catch (err) {
            this.logger.error(`Finnhub news fetch failed for ${symbol}`);
            return [];
        }
    }
};
exports.NewsService = NewsService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_10_SECONDS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NewsService.prototype, "handleNewsFetchCron", null);
exports.NewsService = NewsService = NewsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService,
        subscription_service_1.SubscriptionService,
        ai_analysis_service_1.AiAnalysisService,
        market_gateway_1.MarketGateway])
], NewsService);
//# sourceMappingURL=news.service.js.map