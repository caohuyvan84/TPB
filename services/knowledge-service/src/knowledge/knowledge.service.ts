import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KbArticle, KbBookmark } from '../entities';
import { CreateArticleDto, SearchArticlesDto } from './dto/article.dto';

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(KbArticle)
    private articleRepo: Repository<KbArticle>,
    @InjectRepository(KbBookmark)
    private bookmarkRepo: Repository<KbBookmark>,
  ) {}

  async searchArticles(dto: SearchArticlesDto, tenantId: string) {
    const qb = this.articleRepo.createQueryBuilder('article');
    
    qb.where('article.tenant_id = :tenantId', { tenantId });

    if (dto.query) {
      qb.andWhere(
        '(article.title ILIKE :query OR article.content ILIKE :query)',
        { query: `%${dto.query}%` }
      );
    }

    if (dto.category) {
      qb.andWhere('article.category = :category', { category: dto.category });
    }

    if (dto.folderId) {
      qb.andWhere('article.folder_id = :folderId', { folderId: dto.folderId });
    }

    const page = dto.page || 1;
    const limit = dto.limit || 20;
    qb.skip((page - 1) * limit).take(limit);
    qb.orderBy('article.view_count', 'DESC');

    const [articles, total] = await qb.getManyAndCount();

    return { articles, total, page, limit };
  }

  async getArticle(id: string, tenantId: string) {
    const article = await this.articleRepo.findOne({
      where: { id, tenantId },
    });

    if (article) {
      await this.articleRepo.increment({ id }, 'viewCount', 1);
    }

    return article;
  }

  async createArticle(dto: CreateArticleDto, tenantId: string, userId: string) {
    const article = this.articleRepo.create({
      ...dto,
      tenantId,
      createdBy: userId,
    });

    return this.articleRepo.save(article);
  }

  async bookmarkArticle(articleId: string, userId: string) {
    const existing = await this.bookmarkRepo.findOne({
      where: { articleId, userId },
    });

    if (existing) {
      return existing;
    }

    const bookmark = this.bookmarkRepo.create({ articleId, userId });
    return this.bookmarkRepo.save(bookmark);
  }

  async getBookmarks(userId: string) {
    return this.bookmarkRepo.find({
      where: { userId },
      relations: ['article'],
    });
  }

  async rateArticle(id: string, rating: number, tenantId: string) {
    const article = await this.articleRepo.findOne({
      where: { id, tenantId },
    });

    if (!article) {
      return null;
    }

    // Simple average (in production, store individual ratings)
    const currentRating = article.rating || 0;
    const newRating = currentRating === 0 ? rating : (currentRating + rating) / 2;

    await this.articleRepo.update(id, { rating: newRating });

    return this.articleRepo.findOne({ where: { id } });
  }
}
