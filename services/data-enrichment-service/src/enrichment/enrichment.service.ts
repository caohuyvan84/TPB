import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnrichmentSource, EnrichmentRequest } from '../entities';
import { CreateEnrichmentSourceDto, RequestEnrichmentDto } from './dto/enrichment.dto';

@Injectable()
export class EnrichmentService {
  private cache = new Map<string, { data: any; expires: number }>();

  constructor(
    @InjectRepository(EnrichmentSource)
    private sourceRepo: Repository<EnrichmentSource>,
    @InjectRepository(EnrichmentRequest)
    private requestRepo: Repository<EnrichmentRequest>,
  ) {}

  async createSource(tenantId: string, dto: CreateEnrichmentSourceDto) {
    const source = this.sourceRepo.create({ tenantId, ...dto });
    return this.sourceRepo.save(source);
  }

  async findAllSources(tenantId: string) {
    return this.sourceRepo.find({ where: { tenantId, isActive: true } });
  }

  async requestEnrichment(tenantId: string, dto: RequestEnrichmentDto) {
    const sources = dto.sourceIds
      ? await this.sourceRepo.findByIds(dto.sourceIds)
      : await this.findAllSources(tenantId);

    const requests = [];
    for (const source of sources) {
      const cacheKey = `${source.id}:${dto.objectType}:${dto.objectId}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && cached.expires > Date.now()) {
        requests.push({
          id: 'cached',
          status: 'completed',
          data: cached.data,
        });
        continue;
      }

      const startTime = Date.now();
      const request = this.requestRepo.create({
        tenantId,
        sourceId: source.id,
        objectType: dto.objectType,
        objectId: dto.objectId,
        status: 'pending',
      });

      try {
        // Mock external API call
        const mockData = await this.fetchExternalData(source, dto.objectType, dto.objectId);
        const duration = Date.now() - startTime;

        request.status = 'completed';
        request.responseData = mockData;
        request.durationMs = duration;
        request.completedAt = new Date();

        // Cache result
        this.cache.set(cacheKey, {
          data: mockData,
          expires: Date.now() + source.cacheTtlSeconds * 1000,
        });
      } catch (error: any) {
        request.status = 'failed';
        request.error = error.message;
        request.completedAt = new Date();
      }

      const saved = await this.requestRepo.save(request);
      requests.push(saved);
    }

    return requests;
  }

  async getRequestStatus(requestId: string, tenantId: string) {
    return this.requestRepo.findOne({ where: { id: requestId, tenantId } });
  }

  private async fetchExternalData(source: EnrichmentSource, objectType: string, objectId: string): Promise<any> {
    // Mock external API call
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      enrichedAt: new Date().toISOString(),
      source: source.name,
      data: {
        creditScore: 750,
        accountBalance: 125000,
        lastTransaction: '2026-03-08',
      },
    };
  }
}
