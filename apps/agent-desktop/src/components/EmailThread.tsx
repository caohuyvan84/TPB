import { useState } from "react";
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { EmailReplyInline } from './EmailReplyInline';
import { 
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Clock,
  Mail,
  Paperclip,
  Download,
  Eye,
  User,
  Quote,
  History,
  MessageSquare,
  Reply,
  ReplyAll,
  Forward,
  MoreHorizontal
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

interface EmailMessage {
  id: string;
  from: {
    name: string;
    email: string;
    avatar: string;
  };
  to: Array<{
    name: string;
    email: string;
  }>;
  cc?: Array<{
    name: string;
    email: string;
  }>;
  subject: string;
  date: string;
  time: string;
  content: string;
  quotedContent?: string;
  attachments?: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
  }>;
  direction: 'sent' | 'received';
  isLatest?: boolean;
}

interface EmailThreadProps {
  messages: EmailMessage[];
  className?: string;
  onReply?: (message: EmailMessage, mode: 'reply' | 'reply-all' | 'forward') => void;
}

export function EmailThread({ messages, className = "", onReply }: EmailThreadProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set([messages[messages.length - 1]?.id]) // Latest message expanded by default
  );
  const [showQuotedContent, setShowQuotedContent] = useState<Set<string>>(new Set());
  const [replyingToMessageId, setReplyingToMessageId] = useState<string | null>(null);
  const [replyMode, setReplyMode] = useState<'reply' | 'reply-all' | 'forward'>('reply');

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const toggleQuotedContent = (messageId: string) => {
    setShowQuotedContent(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    if (type.includes('pdf')) return '📄';
    return '📎';
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'received' ? (
      <ArrowDown className="h-3 w-3 text-green-600" />
    ) : (
      <ArrowUp className="h-3 w-3 text-blue-600" />
    );
  };

  const getDirectionBorder = (direction: string) => {
    return direction === 'received' 
      ? 'border-l-green-500' 
      : 'border-l-blue-500';
  };

  const handleReplyClick = (message: EmailMessage, mode: 'reply' | 'reply-all' | 'forward') => {
    setReplyingToMessageId(message.id);
    setReplyMode(mode);
    
    // Also call the parent callback if provided
    if (onReply) {
      onReply(message, mode);
    }
  };

  const createInteractionFromMessage = (message: EmailMessage) => {
    return {
      id: message.id,
      customerName: message.from.name,
      customerEmail: message.from.email,
      subject: message.subject,
      type: 'email'
    };
  };

  if (!messages || messages.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Thread Header */}
      <div className="flex items-center space-x-2 mb-4">
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground/80">
          Chuỗi email ({messages.length} tin nhắn)
        </span>
        <Badge variant="secondary" className="text-xs">
          Thread
        </Badge>
      </div>

      {/* Email Messages */}
      {messages.map((message, index) => {
        const isExpanded = expandedMessages.has(message.id);
        const showQuoted = showQuotedContent.has(message.id);
        const isLatest = index === messages.length - 1;
        const isReplying = replyingToMessageId === message.id;

        return (
          <div key={message.id}>
            <Card 
              className={`border-l-4 ${getDirectionBorder(message.direction)} ${
                isLatest ? 'ring-1 ring-blue-200' : ''
              } transition-all duration-200`}
            >
              {/* Message Header - Always Visible */}
              <CardHeader 
                className="pb-2 cursor-pointer hover:bg-muted/50"
                onClick={() => toggleMessageExpansion(message.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      message.direction === 'sent' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      {message.from.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        {getDirectionIcon(message.direction)}
                        <span className="font-medium text-sm truncate">
                          {message.from.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {message.direction === 'sent' ? 'đã gửi' : 'đã nhận'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {message.from.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{message.time} - {message.date}</span>
                      </div>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                          <Paperclip className="h-3 w-3" />
                          <span>{message.attachments.length} file</span>
                        </div>
                      )}
                    </div>
                    
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Subject (for collapsed view) */}
                {!isExpanded && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground truncate">
                      {message.subject}
                    </p>
                  </div>
                )}
              </CardHeader>

              {/* Message Content - Expanded View */}
              {isExpanded && (
                <CardContent className="pt-0">
                  {/* Full Subject (for expanded view) */}
                  <div className="mb-3">
                    <h4 className="font-medium text-sm">{message.subject}</h4>
                    
                    {/* Recipients */}
                    <div className="text-xs text-muted-foreground mt-1 space-y-1">
                      <div>
                        <span className="font-medium">Đến: </span>
                        {message.to.map((recipient, i) => (
                          <span key={i}>
                            {recipient.name} &lt;{recipient.email}&gt;
                            {i < message.to.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                      {message.cc && message.cc.length > 0 && (
                        <div>
                          <span className="font-medium">CC: </span>
                          {message.cc.map((recipient, i) => (
                            <span key={i}>
                              {recipient.name} &lt;{recipient.email}&gt;
                              {message.cc && i < message.cc.length - 1 && ', '}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="prose max-w-none text-sm">
                    <div className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>

                  {/* Quoted Content */}
                  {message.quotedContent && (
                    <div className="mt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleQuotedContent(message.id)}
                        className="text-muted-foreground hover:text-foreground/80 p-0 h-auto"
                      >
                        <Quote className="h-3 w-3 mr-1" />
                        <span className="text-xs">
                          {showQuoted ? 'Ẩn tin nhắn đã trích dẫn' : 'Hiển thị tin nhắn đã trích dẫn'}
                        </span>
                        {showQuoted ? (
                          <ChevronUp className="h-3 w-3 ml-1" />
                        ) : (
                          <ChevronDown className="h-3 w-3 ml-1" />
                        )}
                      </Button>

                      {showQuoted && (
                        <div className="mt-2 pl-4 border-l-2 border-border bg-muted/50 rounded-r-lg">
                          <div className="p-3 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {message.quotedContent}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Attachments */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-4">
                      <Separator className="mb-3" />
                      <div className="flex items-center space-x-2 mb-2">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground/80">
                          File đính kèm ({message.attachments.length})
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {message.attachments.map((attachment) => (
                          <div key={attachment.id} className="flex items-center justify-between p-2 bg-muted/50 rounded border hover:bg-muted transition-colors">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <span className="text-lg">{getFileIcon(attachment.type)}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{attachment.name}</p>
                                <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message Actions */}
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReplyClick(message, 'reply')}
                          className="text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Reply className="h-3 w-3 mr-1" />
                          Reply
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReplyClick(message, 'reply-all')}
                          className="text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                        >
                          <ReplyAll className="h-3 w-3 mr-1" />
                          Reply All
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReplyClick(message, 'forward')}
                          className="text-muted-foreground hover:text-foreground/80 hover:bg-muted/50"
                        >
                          <Forward className="h-3 w-3 mr-1" />
                          Forward
                        </Button>
                      </div>

                      {/* More Actions Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground/80"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => console.log('Mark as spam', message.id)}>
                            <span className="text-red-600">Đánh dấu spam</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => console.log('Print message', message.id)}>
                            In tin nhắn
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => console.log('Copy message', message.id)}>
                            Sao chép nội dung
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => console.log('Save to templates', message.id)}>
                            Lưu làm template
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              )}

              {/* Latest Message Indicator */}
              {isLatest && (
                <div className="px-4 pb-3">
                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Tin nhắn mới nhất
                  </Badge>
                </div>
              )}
            </Card>
            
            {/* Inline Reply Form */}
            {isReplying && (
              <div className="mt-3">
                <EmailReplyInline
                  isVisible={true}
                  interaction={createInteractionFromMessage(message)}
                  mode={replyMode}
                  onClose={() => setReplyingToMessageId(null)}
                  onCancel={() => setReplyingToMessageId(null)}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Thread Actions */}
      <div className="flex justify-center pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (expandedMessages.size === messages.length) {
              // Collapse all including latest
              setExpandedMessages(new Set());
            } else {
              // Expand all
              setExpandedMessages(new Set(messages.map(m => m.id)));
            }
          }}
          className="text-muted-foreground hover:text-foreground/80"
        >
          {expandedMessages.size === messages.length ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Thu gọn tất cả
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Mở rộng tất cả
            </>
          )}
        </Button>
      </div>
    </div>
  );
}