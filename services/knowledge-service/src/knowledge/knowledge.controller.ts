import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { KnowledgeService } from './knowledge.service';
import { CreateArticleDto, SearchArticlesDto, RateArticleDto } from './dto/article.dto';

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000000';
const DEFAULT_USER   = '00000000-0000-0000-0000-000000000001';

@Controller('kb')
export class KnowledgeController {
  constructor(private knowledgeService: KnowledgeService) {}

  @Get('articles')
  searchArticles(@Query() dto: SearchArticlesDto, @Req() req: Request) {
    const user = (req as any).user;
    const tenantId = user?.tenantId || DEFAULT_TENANT;
    return this.knowledgeService.searchArticles(dto, tenantId);
  }

  @Get('articles/:id')
  async getArticle(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const tenantId = user?.tenantId || DEFAULT_TENANT;
    const article = await this.knowledgeService.getArticle(id, tenantId);

    if (!article) {
      return { statusCode: 404, message: 'Article not found' };
    }

    return article;
  }

  @Post('articles')
  createArticle(@Body() dto: CreateArticleDto, @Req() req: Request) {
    const user = (req as any).user;
    const tenantId = user?.tenantId || DEFAULT_TENANT;
    const userId   = user?.sub || user?.id || DEFAULT_USER;
    return this.knowledgeService.createArticle(dto, tenantId, userId);
  }

  @Post('bookmarks')
  bookmarkArticle(@Body('articleId') articleId: string, @Req() req: Request) {
    const user = (req as any).user;
    const userId = user?.sub || user?.id || DEFAULT_USER;
    return this.knowledgeService.bookmarkArticle(articleId, userId);
  }

  @Get('bookmarks')
  getBookmarks(@Req() req: Request) {
    const user = (req as any).user;
    const userId = user?.sub || user?.id || DEFAULT_USER;
    return this.knowledgeService.getBookmarks(userId);
  }

  @Post('articles/:id/rate')
  rateArticle(@Param('id') id: string, @Body() dto: RateArticleDto, @Req() req: Request) {
    const user = (req as any).user;
    const tenantId = user?.tenantId || DEFAULT_TENANT;
    return this.knowledgeService.rateArticle(id, dto.rating, tenantId);
  }
}
