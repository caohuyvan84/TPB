import { apiClient } from '../api-client';

export const knowledgeApi = {
  searchArticles: (params?: { query?: string; category?: string; limit?: number }) =>
    apiClient.get('/api/v1/kb/articles', { params }),
  
  getArticle: (id: string) =>
    apiClient.get(`/api/v1/kb/articles/${id}`),
  
  createArticle: (data: { title: string; content: string; category?: string; tags?: string[] }) =>
    apiClient.post('/api/v1/kb/articles', data),
  
  getBookmarks: () =>
    apiClient.get('/api/v1/kb/bookmarks'),
  
  addBookmark: (articleId: string) =>
    apiClient.post('/api/v1/kb/bookmarks', { articleId }),
  
  rateArticle: (id: string, rating: number) =>
    apiClient.post(`/api/v1/kb/articles/${id}/rate`, { rating }),
};
