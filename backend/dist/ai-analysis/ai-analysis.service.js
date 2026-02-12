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
var AiAnalysisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiAnalysisService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
let AiAnalysisService = AiAnalysisService_1 = class AiAnalysisService {
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
        this.logger = new common_1.Logger(AiAnalysisService_1.name);
        this.groqApiKey = this.configService.get('GROQ_API_KEY');
    }
    async analyzeNews(symbol, articles) {
        const BATCH_SIZE = 30;
        const batchInsights = [];
        try {
            for (let i = 0; i < articles.length; i += BATCH_SIZE) {
                const batch = articles.slice(i, i + BATCH_SIZE);
                const articlesText = batch
                    .map((a, idx) => `${idx + 1}. [${a.source}] "${a.title}" - ${a.description || 'No description'}`)
                    .join('\n');
                const prompt = `You are a financial market analyst. Analyze the following news articles about "${symbol}" and provide:

  1. A concise summary (2-3 sentences)
  2. Market sentiment: exactly one of "bullish", "bearish", or "neutral"
  3. 3-5 key takeaway points

  Articles:
  ${articlesText}

  Respond in raw JSON only:
  {
    "summary": "text",
    "sentiment": "bullish|bearish|neutral",
    "keyPoints": ["point 1", "point 2"]
  }`;
                const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post('https://api.groq.com/openai/v1/chat/completions', {
                    model: 'llama-3.3-70b-versatile',
                    response_format: { type: 'json_object' },
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a financial analyst. Always respond with valid JSON only.',
                        },
                        { role: 'user', content: prompt },
                    ],
                    temperature: 0.3,
                    max_tokens: 800,
                }, {
                    headers: {
                        Authorization: `Bearer ${this.groqApiKey}`,
                        'Content-Type': 'application/json',
                    },
                }));
                const content = response.data.choices[0]?.message?.content;
                if (!content)
                    continue;
                const parsed = this.safeParseJson(content);
                batchInsights.push(parsed);
            }
            if (batchInsights.length === 1) {
                return this.buildInsight(symbol, batchInsights[0], articles.length);
            }
            const mergePrompt = `Combine the following analyses for "${symbol}" into one final result:

  ${JSON.stringify(batchInsights)}

  Return JSON only:
  {
    "summary": "final summary",
    "sentiment": "bullish|bearish|neutral",
    "keyPoints": ["point 1", "point 2", "point 3"]
  }`;
            const mergeResponse = await (0, rxjs_1.firstValueFrom)(this.httpService.post('https://api.groq.com/openai/v1/chat/completions', {
                model: 'llama-3.3-70b-versatile',
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: 'You are a financial analyst. Always respond with valid JSON only.',
                    },
                    { role: 'user', content: mergePrompt },
                ],
                temperature: 0.3,
                max_tokens: 800,
            }, {
                headers: {
                    Authorization: `Bearer ${this.groqApiKey}`,
                    'Content-Type': 'application/json',
                },
            }));
            const mergedContent = mergeResponse.data.choices[0]?.message?.content;
            const finalParsed = this.safeParseJson(mergedContent);
            return this.buildInsight(symbol, finalParsed, articles.length);
        }
        catch (err) {
            this.logger.error(`AI analysis failed for ${symbol}`, err);
            return {
                symbol,
                summary: `${articles.length} recent news articles found for ${symbol}. AI analysis temporarily unavailable.`,
                sentiment: 'neutral',
                keyPoints: articles.slice(0, 3).map((a) => a.title),
                articleCount: articles.length,
                timestamp: new Date().toISOString(),
            };
        }
    }
    safeParseJson(content) {
        try {
            const cleaned = content
                .trim()
                .replace(/^```json/, '')
                .replace(/^```/, '')
                .replace(/```$/, '')
                .trim();
            const match = cleaned.match(/\{[\s\S]*\}/);
            if (!match) {
                throw new Error('No valid JSON found in AI response');
            }
            return JSON.parse(match[0]);
        }
        catch (error) {
            this.logger.error('Failed to parse AI JSON response:', content);
            throw error;
        }
    }
    buildInsight(symbol, parsed, articleCount) {
        return {
            symbol,
            summary: parsed.summary || 'Unable to generate summary',
            sentiment: parsed.sentiment,
            keyPoints: parsed.keyPoints || [],
            articleCount,
            timestamp: new Date().toISOString(),
        };
    }
};
exports.AiAnalysisService = AiAnalysisService;
exports.AiAnalysisService = AiAnalysisService = AiAnalysisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], AiAnalysisService);
//# sourceMappingURL=ai-analysis.service.js.map