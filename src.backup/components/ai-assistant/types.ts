export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  actions?: Array<{
    type: 'knowledge' | 'ticket' | 'email' | 'search';
    label: string;
    data?: any;
  }>;
  context?: {
    confidence: number;
    sources?: string[];
    category?: string;
  };
}

export interface AIAssistantChatProps {
  interaction: any;
  onKnowledgeSearch?: (query: string) => void;
  onInsertContent?: (content: string) => void;
}

export interface AIKnowledgeEntry {
  confidence: number;
  response: string;
  sources: string[];
  category: string;
}

export interface ChatMessageProps {
  message: ChatMessage;
  onCopyMessage: (content: string) => void;
  onActionClick: (action: any) => void;
  onSuggestionClick: (suggestion: string) => void;
}