import { apiClient } from './api-client';

export interface AiSuggestRequest {
  context: string;
  customerMessage?: string;
  interactionType?: 'call' | 'email' | 'chat';
  customerSentiment?: 'positive' | 'neutral' | 'negative';
}

export interface AiSuggestResponse {
  suggestions: string[];
  confidence: number;
  reasoning?: string;
}

export interface AiSummarizeRequest {
  text: string;
  maxLength?: number;
  style?: 'brief' | 'detailed' | 'bullet-points';
}

export interface AiSummarizeResponse {
  summary: string;
  keyPoints: string[];
  confidence: number;
}

export interface AiClassifyRequest {
  text: string;
  categories: string[];
}

export interface AiClassifyResponse {
  category: string;
  confidence: number;
  scores: Record<string, number>;
}

export interface AiSentimentRequest {
  text: string;
}

export interface AiSentimentResponse {
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  scores: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface AiGenerateRequest {
  prompt: string;
  type: 'email' | 'response' | 'summary' | 'explanation';
  tone?: 'professional' | 'friendly' | 'formal';
  maxLength?: number;
}

export interface AiGenerateResponse {
  text: string;
  confidence: number;
}

export const aiApi = {
  suggest: async (request: AiSuggestRequest): Promise<AiSuggestResponse> => {
    const { data } = await apiClient.post('/ai/suggest', request);
    return data;
  },

  summarize: async (request: AiSummarizeRequest): Promise<AiSummarizeResponse> => {
    const { data } = await apiClient.post('/ai/summarize', request);
    return data;
  },

  classify: async (request: AiClassifyRequest): Promise<AiClassifyResponse> => {
    const { data } = await apiClient.post('/ai/classify', request);
    return data;
  },

  sentiment: async (request: AiSentimentRequest): Promise<AiSentimentResponse> => {
    const { data } = await apiClient.post('/ai/sentiment', request);
    return data;
  },

  generate: async (request: AiGenerateRequest): Promise<AiGenerateResponse> => {
    const { data } = await apiClient.post('/ai/generate', request);
    return data;
  },
};
