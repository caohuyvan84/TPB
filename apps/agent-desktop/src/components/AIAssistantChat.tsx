import { useState, useRef, useEffect } from "react";
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { AIAssistantChatProps, ChatMessage } from './ai-assistant/types';
import { initialMessages } from './ai-assistant/constants';
import { generateAIResponse, getContextualSuggestions } from './ai-assistant/utils';
import { ChatMessage as ChatMessageComponent } from './ai-assistant/ChatMessage';
import { 
  Send,
  Bot,
  Brain,
  Sparkles,
  Zap,
  RefreshCw
} from "lucide-react";

export function AIAssistantChat({ interaction, onKnowledgeSearch, onInsertContent }: AIAssistantChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(async () => {
      const aiResponse = await generateAIResponse(userMessage.content, interaction);
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500 + Math.random() * 1000);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  // Handle action click
  const handleActionClick = (action: any) => {
    switch (action.type) {
      case 'knowledge':
        if (onKnowledgeSearch) {
          onKnowledgeSearch(action.data);
        }
        break;
      case 'email': {
        const lastAIMessage = messages.filter(m => m.type === 'ai').pop();
        if (lastAIMessage && onInsertContent) {
          onInsertContent(lastAIMessage.content);
        }
        break;
      }
      case 'search':
        if (onKnowledgeSearch) {
          onKnowledgeSearch(action.data);
        }
        break;
      default:
        console.log('Action clicked:', action);
    }
  };

  // Handle copy message
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">AI Assistant</h3>
            <p className="text-sm text-muted-foreground">Được train với dữ liệu doanh nghiệp</p>
          </div>
          <div className="flex-1"></div>
          <Badge className="bg-green-100 text-green-800">
            <Sparkles className="h-3 w-3 mr-1" />
            Online
          </Badge>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message) => (
            <ChatMessageComponent
              key={message.id}
              message={message}
              onCopyMessage={handleCopyMessage}
              onActionClick={handleActionClick}
              onSuggestionClick={handleSuggestionClick}
            />
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-muted text-foreground rounded-lg p-3 mr-2 max-w-[80%]">
                <div className="flex items-center space-x-2">
                  <Bot className="h-4 w-4 text-blue-600" />
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-sm text-muted-foreground">AI đang suy nghĩ...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="px-4 py-2 border-t border-border/50 bg-muted/50">
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-muted-foreground">Thao tác nhanh:</span>
          {getContextualSuggestions(interaction).slice(0, 2).map((suggestion, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={() => handleSuggestionClick(suggestion)}
              className="h-6 px-2 text-xs"
            >
              <Zap className="h-3 w-3 mr-1" />
              {suggestion.length > 20 ? suggestion.substring(0, 20) + '...' : suggestion}
            </Button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-background">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Hỏi AI về bất kỳ điều gì... (Enter để gửi)"
              className="pr-12"
              disabled={isTyping}
            />
            {inputValue && (
              <Button
                onClick={handleSendMessage}
                size="sm"
                disabled={isTyping}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              >
                <Send className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMessages(initialMessages)}
            className="flex-shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground text-center">
          AI được train với dữ liệu doanh nghiệp. Thông tin có thể không hoàn toàn chính xác.
        </div>
      </div>
    </div>
  );
}