import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

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

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);
  private readonly groqApiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.groqApiKey = this.configService.get<string>('GROQ_API_KEY');
  }

  // analyze new using Groq's LLM
  async analyzeNews(
    symbol: string,
    articles: NewsArticle[],
  ): Promise<NewsInsight> {
    const BATCH_SIZE = 30;
    const batchInsights: any[] = [];
    try {
      for (let i = 0; i < articles.length; i += BATCH_SIZE) {
        const batch = articles.slice(i, i + BATCH_SIZE);

        const articlesText = batch
          .map(
            (a, idx) =>
              `${idx + 1}. [${a.source}] "${a.title}" - ${
                a.description || 'No description'
              }`,
          )
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

        const response = await firstValueFrom(
          this.httpService.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
              model: 'llama-3.3-70b-versatile',
              response_format: { type: 'json_object' },
              messages: [
                {
                  role: 'system',
                  content:
                    'You are a financial analyst. Always respond with valid JSON only.',
                },
                { role: 'user', content: prompt },
              ],
              temperature: 0.3,
              max_tokens: 800,
            },
            {
              headers: {
                Authorization: `Bearer ${this.groqApiKey}`,
                'Content-Type': 'application/json',
              },
            },
          ),
        );

        const content = response.data.choices[0]?.message?.content;
        if (!content) continue;

        const parsed = this.safeParseJson(content);
        batchInsights.push(parsed);
      }

      // If only one batch
      if (batchInsights.length === 1) {
        return this.buildInsight(symbol, batchInsights[0], articles.length);
      }

      // Merge multiple batch insights
      const mergePrompt = `Combine the following analyses for "${symbol}" into one final result:

  ${JSON.stringify(batchInsights)}

  Return JSON only:
  {
    "summary": "final summary",
    "sentiment": "bullish|bearish|neutral",
    "keyPoints": ["point 1", "point 2", "point 3"]
  }`;

      const mergeResponse = await firstValueFrom(
        this.httpService.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content:
                  'You are a financial analyst. Always respond with valid JSON only.',
              },
              { role: 'user', content: mergePrompt },
            ],
            temperature: 0.3,
            max_tokens: 800,
          },
          {
            headers: {
              Authorization: `Bearer ${this.groqApiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const mergedContent = mergeResponse.data.choices[0]?.message?.content;

      const finalParsed = this.safeParseJson(mergedContent);

      return this.buildInsight(symbol, finalParsed, articles.length);
    } catch (err) {
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

  private safeParseJson(content: string) {
    try {
      // Remove markdown wrappers if present
      const cleaned = content
        .trim()
        .replace(/^```json/, '')
        .replace(/^```/, '')
        .replace(/```$/, '')
        .trim();

      // Extract JSON block safely
      const match = cleaned.match(/\{[\s\S]*\}/);

      if (!match) {
        throw new Error('No valid JSON found in AI response');
      }

      return JSON.parse(match[0]);
    } catch (error) {
      this.logger.error('Failed to parse AI JSON response:', content);
      throw error;
    }
  }

  private buildInsight(
    symbol: string,
    parsed: any,
    articleCount: number,
  ): NewsInsight {
    return {
      symbol,
      summary: parsed.summary || 'Unable to generate summary',
      sentiment: parsed.sentiment,
      keyPoints: parsed.keyPoints || [],
      articleCount,
      timestamp: new Date().toISOString(),
    };
  }
}
