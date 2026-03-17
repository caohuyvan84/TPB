import { useMutation } from '@tanstack/react-query';
import { 
  aiApi, 
  AiSuggestRequest, 
  AiSummarizeRequest, 
  AiClassifyRequest, 
  AiSentimentRequest, 
  AiGenerateRequest 
} from '../lib/ai-api';

export const useAiSuggest = () => {
  return useMutation({
    mutationFn: (request: AiSuggestRequest) => aiApi.suggest(request),
  });
};

export const useAiSummarize = () => {
  return useMutation({
    mutationFn: (request: AiSummarizeRequest) => aiApi.summarize(request),
  });
};

export const useAiClassify = () => {
  return useMutation({
    mutationFn: (request: AiClassifyRequest) => aiApi.classify(request),
  });
};

export const useAiSentiment = () => {
  return useMutation({
    mutationFn: (request: AiSentimentRequest) => aiApi.sentiment(request),
  });
};

export const useAiGenerate = () => {
  return useMutation({
    mutationFn: (request: AiGenerateRequest) => aiApi.generate(request),
  });
};
