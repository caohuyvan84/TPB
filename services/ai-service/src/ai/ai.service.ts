import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIRequest } from '../entities';
import { MockLLMProvider } from '../providers/llm.provider';
import * as crypto from 'crypto';

@Injectable()
export class AIService {
  private llmProvider = new MockLLMProvider();
  private cache = new Map<string, { data: any; expires: number }>();

  constructor(
    @InjectRepository(AIRequest)
    private requestRepo: Repository<AIRequest>,
  ) {}

  async suggest(context: string, tenantId: string, userId: string) {
    const cacheKey = this.getCacheKey('suggest', context);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { suggestion: cached, cached: true };
    }

    const startTime = Date.now();
    const suggestion = await this.llmProvider.suggest(context);
    const latency = Date.now() - startTime;

    await this.logRequest({
      tenantId,
      userId,
      type: 'suggest',
      inputText: context,
      outputText: suggestion,
      model: 'mock-llm',
      tokensUsed: context.length + suggestion.length,
      latencyMs: latency,
    });

    this.setCache(cacheKey, suggestion);

    return { suggestion, cached: false };
  }

  async summarize(text: string, tenantId: string, userId: string) {
    const cacheKey = this.getCacheKey('summarize', text);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { summary: cached, cached: true };
    }

    const startTime = Date.now();
    const summary = await this.llmProvider.summarize(text);
    const latency = Date.now() - startTime;

    await this.logRequest({
      tenantId,
      userId,
      type: 'summarize',
      inputText: text,
      outputText: summary,
      model: 'mock-llm',
      tokensUsed: text.length + summary.length,
      latencyMs: latency,
    });

    this.setCache(cacheKey, summary);

    return { summary, cached: false };
  }

  async analyzeSentiment(text: string, tenantId: string, userId: string) {
    const cacheKey = this.getCacheKey('sentiment', text);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const startTime = Date.now();
    const result = await this.llmProvider.analyzeSentiment(text);
    const latency = Date.now() - startTime;

    await this.logRequest({
      tenantId,
      userId,
      type: 'sentiment',
      inputText: text,
      outputText: JSON.stringify(result),
      model: 'mock-llm',
      tokensUsed: text.length,
      latencyMs: latency,
    });

    this.setCache(cacheKey, result);

    return { ...result, cached: false };
  }

  async classify(text: string, tenantId: string, userId: string) {
    const cacheKey = this.getCacheKey('classify', text);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const startTime = Date.now();
    const result = await this.llmProvider.classify(text);
    const latency = Date.now() - startTime;

    await this.logRequest({
      tenantId,
      userId,
      type: 'classify',
      inputText: text,
      outputText: JSON.stringify(result),
      model: 'mock-llm',
      tokensUsed: text.length,
      latencyMs: latency,
    });

    this.setCache(cacheKey, result);

    return { ...result, cached: false };
  }

  private getCacheKey(type: string, input: string): string {
    return crypto.createHash('md5').update(`${type}:${input}`).digest('hex');
  }

  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any) {
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes
    this.cache.set(key, { data, expires });
  }

  private async logRequest(data: Partial<AIRequest>) {
    const request = this.requestRepo.create(data);
    await this.requestRepo.save(request);
  }
}
