import { apiClient } from './api-client';

export interface KbArticle {
  id: string;
  tenantId: string;
  title: string;
  summary?: string;
  content: string;
  tags: string[];
  category?: string;
  folderId?: string;
  viewCount: number;
  rating?: number;
  dynamicFields?: Record<string, any>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface KbBookmark {
  id: string;
  userId: string;
  articleId: string;
  createdAt: string;
}

export interface GetArticlesParams {
  query?: string;
  category?: string;
  tags?: string[];
  folderId?: string;
  page?: number;
  limit?: number;
}

export interface GetArticlesResponse {
  data: KbArticle[];
  total: number;
  page: number;
  limit: number;
}

export const knowledgeApi = {
  getArticles: async (params?: GetArticlesParams): Promise<GetArticlesResponse> => {
    const { data } = await apiClient.get('/api/v1/kb/articles', { params });
    // API returns { articles: [...] } — normalize to { data: [...] }
    if (data.articles && !data.data) {
      return { data: data.articles, total: data.total ?? data.articles.length, page: data.page ?? 1, limit: data.limit ?? data.articles.length };
    }
    return data;
  },

  getArticleById: async (id: string): Promise<KbArticle> => {
    const { data } = await apiClient.get(`/api/v1/kb/articles/${id}`);
    return data;
  },

  createArticle: async (article: Partial<KbArticle>): Promise<KbArticle> => {
    const { data } = await apiClient.post('/api/v1/kb/articles', article);
    return data;
  },

  bookmarkArticle: async (articleId: string): Promise<KbBookmark> => {
    const { data } = await apiClient.post('/api/v1/kb/bookmarks', { articleId });
    return data;
  },

  getBookmarks: async (): Promise<KbBookmark[]> => {
    const { data } = await apiClient.get('/api/v1/kb/bookmarks');
    return data;
  },

  rateArticle: async (id: string, rating: number): Promise<KbArticle> => {
    const { data } = await apiClient.post(`/api/v1/kb/articles/${id}/rate`, { rating });
    return data;
  },
};
