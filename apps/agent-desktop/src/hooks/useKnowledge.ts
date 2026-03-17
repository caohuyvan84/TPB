import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeApi, GetArticlesParams } from '../lib/knowledge-api';

export const useKbArticles = (params?: GetArticlesParams) => {
  return useQuery({
    queryKey: ['kb', 'articles', params],
    queryFn: () => knowledgeApi.getArticles(params),
  });
};

export const useKbArticle = (id: string) => {
  return useQuery({
    queryKey: ['kb', 'articles', id],
    queryFn: () => knowledgeApi.getArticleById(id),
    enabled: !!id,
  });
};

export const useCreateKbArticle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: knowledgeApi.createArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb', 'articles'] });
    },
  });
};

export const useBookmarkArticle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (articleId: string) => knowledgeApi.bookmarkArticle(articleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb', 'bookmarks'] });
    },
  });
};

export const useKbBookmarks = () => {
  return useQuery({
    queryKey: ['kb', 'bookmarks'],
    queryFn: () => knowledgeApi.getBookmarks(),
  });
};

export const useRateArticle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number }) =>
      knowledgeApi.rateArticle(id, rating),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kb', 'articles', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['kb', 'articles'] });
    },
  });
};
