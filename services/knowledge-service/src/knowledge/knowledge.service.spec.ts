import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { KnowledgeService } from './knowledge.service';
import { KbArticle, KbBookmark } from '../entities';

describe('KnowledgeService', () => {
  let service: KnowledgeService;
  let mockArticleRepo: any;
  let mockBookmarkRepo: any;

  beforeEach(async () => {
    mockArticleRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'test-id', ...entity })),
      increment: jest.fn(),
      update: jest.fn(),
    };

    mockBookmarkRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'bookmark-id', ...entity })),
      find: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: getRepositoryToken(KbArticle), useValue: mockArticleRepo },
        { provide: getRepositoryToken(KbBookmark), useValue: mockBookmarkRepo },
      ],
    }).compile();

    service = module.get<KnowledgeService>(KnowledgeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should search articles', async () => {
    const result = await service.searchArticles({ query: 'test' }, 'tenant-1');
    expect(result).toHaveProperty('articles');
    expect(result).toHaveProperty('total');
  });

  it('should get article and increment view count', async () => {
    mockArticleRepo.findOne.mockResolvedValue({ id: 'article-1', title: 'Test' });

    const result = await service.getArticle('article-1', 'tenant-1');

    expect(mockArticleRepo.findOne).toHaveBeenCalled();
    expect(mockArticleRepo.increment).toHaveBeenCalledWith({ id: 'article-1' }, 'viewCount', 1);
    expect(result).toHaveProperty('title', 'Test');
  });

  it('should create article', async () => {
    const dto = { title: 'New Article', content: 'Content here' };

    const result = await service.createArticle(dto, 'tenant-1', 'user-1');

    expect(mockArticleRepo.create).toHaveBeenCalled();
    expect(mockArticleRepo.save).toHaveBeenCalled();
    expect(result).toHaveProperty('title', 'New Article');
  });

  it('should bookmark article', async () => {
    mockBookmarkRepo.findOne.mockResolvedValue(null);

    const result = await service.bookmarkArticle('article-1', 'user-1');

    expect(mockBookmarkRepo.create).toHaveBeenCalled();
    expect(mockBookmarkRepo.save).toHaveBeenCalled();
  });

  it('should not duplicate bookmark', async () => {
    const existing = { id: 'bookmark-1', articleId: 'article-1', userId: 'user-1' };
    mockBookmarkRepo.findOne.mockResolvedValue(existing);

    const result = await service.bookmarkArticle('article-1', 'user-1');

    expect(result).toEqual(existing);
    expect(mockBookmarkRepo.save).not.toHaveBeenCalled();
  });

  it('should get bookmarks', async () => {
    mockBookmarkRepo.find.mockResolvedValue([{ id: 'bookmark-1' }]);

    const result = await service.getBookmarks('user-1');

    expect(mockBookmarkRepo.find).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      relations: ['article'],
    });
    expect(result).toHaveLength(1);
  });

  it('should rate article', async () => {
    mockArticleRepo.findOne.mockResolvedValue({ id: 'article-1', rating: null });

    await service.rateArticle('article-1', 5, 'tenant-1');

    expect(mockArticleRepo.update).toHaveBeenCalledWith('article-1', { rating: 5 });
  });
});
