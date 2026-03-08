import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ChatMessageProps } from './types';
import { 
  Bot,
  User,
  Target,
  BookOpen,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  FileText,
  Search
} from "lucide-react";

export function ChatMessage({ 
  message, 
  onCopyMessage, 
  onActionClick, 
  onSuggestionClick 
}: ChatMessageProps) {
  return (
    <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
        {/* Message bubble */}
        <div
          className={`rounded-lg p-3 ${
            message.type === 'user'
              ? 'bg-blue-600 text-white ml-2'
              : 'bg-gray-100 text-gray-900 mr-2'
          }`}
        >
          <div className="flex items-start space-x-2">
            <div className={`flex-shrink-0 ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
              {message.type === 'user' ? (
                <User className="h-4 w-4 mt-0.5" />
              ) : (
                <Bot className="h-4 w-4 mt-0.5 text-blue-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content}
              </div>

              {/* Context info for AI messages */}
              {message.type === 'ai' && message.context && (
                <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Target className="h-3 w-3" />
                      <span>Độ tin cậy: {Math.round(message.context.confidence * 100)}%</span>
                    </div>
                    {message.context.sources && (
                      <div className="flex items-center space-x-1">
                        <BookOpen className="h-3 w-3" />
                        <span>{message.context.sources.length} nguồn</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              {message.actions && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {message.actions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => onActionClick(action)}
                      className="text-xs h-7"
                    >
                      {action.type === 'knowledge' && <BookOpen className="h-3 w-3 mr-1" />}
                      {action.type === 'email' && <FileText className="h-3 w-3 mr-1" />}
                      {action.type === 'search' && <Search className="h-3 w-3 mr-1" />}
                      {action.type === 'ticket' && <FileText className="h-3 w-3 mr-1" />}
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}

              {/* Message actions */}
              {message.type === 'ai' && (
                <div className="mt-2 flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCopyMessage(message.content)}
                    className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timestamp */}
        <div className={`mt-1 text-xs text-gray-500 ${
          message.type === 'user' ? 'text-right mr-2' : 'text-left ml-2'
        }`}>
          {message.timestamp.toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>

        {/* Suggestions for AI messages */}
        {message.type === 'ai' && message.suggestions && (
          <div className="mt-3 ml-2">
            <p className="text-xs text-gray-500 mb-2">Gợi ý:</p>
            <div className="flex flex-wrap gap-1">
              {message.suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => onSuggestionClick(suggestion)}
                  className="text-xs h-7 border-dashed hover:border-solid"
                >
                  <Lightbulb className="h-3 w-3 mr-1" />
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}