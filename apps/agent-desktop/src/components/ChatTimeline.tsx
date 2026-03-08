import { useState, useRef, useEffect } from "react";
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Avatar } from './ui/avatar';
import {
  Bot,
  User,
  UserCircle,
  Paperclip,
  Send,
  X,
  File,
  Image as ImageIcon,
  FileText,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from './ui/utils';

export interface ChatMessage {
  id: string;
  sender: "customer" | "agent" | "bot";
  senderName?: string;
  message: string;
  time: string;
  timestamp: Date;
  avatar?: string;
  attachments?: {
    name: string;
    size: number;
    type: string;
    url: string;
  }[];
  status?: "sending" | "sent" | "failed";
}

export interface ChatSession {
  type: "bot" | "agent";
  agentName?: string;
  startTime: string;
  endTime?: string;
  messages: ChatMessage[];
}

interface ChatTimelineProps {
  sessions: ChatSession[];
  onSendMessage?: (message: string, files?: File[]) => void;
  isDisabled?: boolean;
  isAgentSession?: boolean;
  maxFileSize?: number; // in MB
}

export function ChatTimeline({
  sessions,
  onSendMessage,
  isDisabled = false,
  isAgentSession = true,
  maxFileSize = 5,
}: ChatTimelineProps) {
  const [message, setMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [sessions]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSizeBytes = maxFileSize * 1024 * 1024;

    // Check total size
    const totalSize = [...selectedFiles, ...files].reduce(
      (sum, file) => sum + file.size,
      0
    );

    if (totalSize > maxSizeBytes) {
      alert(`Tổng dung lượng file không được vượt quá ${maxFileSize}MB`);
      return;
    }

    setSelectedFiles((prev) => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!message.trim() && selectedFiles.length === 0) return;

    setSending(true);
    try {
      await onSendMessage?.(message, selectedFiles);
      setMessage("");
      setSelectedFiles([]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (type.includes("pdf")) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const renderSessionDivider = (session: ChatSession, index: number) => {
    if (index === 0 && session.type === "agent") return null;

    return (
      <div className="flex items-center gap-3 py-4 my-4">
        <Separator className="flex-1" />
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#155DFC]/5 border border-[#155DFC]/20 rounded-full">
          {session.type === "bot" ? (
            <Bot className="h-4 w-4 text-[#155DFC]" />
          ) : (
            <UserCircle className="h-4 w-4 text-[#155DFC]" />
          )}
          <span className="text-xs">
            {session.type === "bot"
              ? `Phiên Chatbot (${session.startTime}${
                  session.endTime ? ` - ${session.endTime}` : ""
                })`
              : `Phiên Agent - ${session.agentName} (${session.startTime}${
                  session.endTime ? ` - ${session.endTime}` : ""
                })`}
          </span>
        </div>
        <Separator className="flex-1" />
      </div>
    );
  };

  const renderHandoverDivider = (fromSession: ChatSession, toSession: ChatSession) => {
    if (fromSession.type === "bot" && toSession.type === "agent") {
      return (
        <div className="flex items-center justify-center py-4 my-2">
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-900">
              🔄 Phiên chat được chuyển từ Chatbot sang Agent{" "}
              <span className="font-medium">{toSession.agentName}</span> lúc{" "}
              {toSession.startTime}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderMessage = (msg: ChatMessage, sessionType: "bot" | "agent") => {
    const isCustomer = msg.sender === "customer";
    const isBot = msg.sender === "bot";
    const isAgent = msg.sender === "agent";

    return (
      <div
        key={msg.id}
        className={cn(
          "flex gap-3 mb-4",
          isCustomer ? "justify-start" : "justify-end"
        )}
      >
        {isCustomer && (
          <Avatar className="h-8 w-8 flex-shrink-0 bg-muted flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </Avatar>
        )}

        <div
          className={cn(
            "flex flex-col gap-1 max-w-[70%]",
            isCustomer ? "items-start" : "items-end"
          )}
        >
          {/* Sender name */}
          <div className="flex items-center gap-2 px-1">
            {isBot && <Bot className="h-3 w-3 text-muted-foreground" />}
            {isAgent && <UserCircle className="h-3 w-3 text-[#155DFC]" />}
            <span className="text-xs text-muted-foreground">
              {isCustomer
                ? "Khách hàng"
                : isBot
                ? "Chatbot"
                : msg.senderName || "Agent"}
            </span>
            <span className="text-xs text-muted-foreground">{msg.time}</span>
          </div>

          {/* Message bubble */}
          <div
            className={cn(
              "px-4 py-2 rounded-lg",
              isCustomer
                ? "bg-background border border-border"
                : isBot
                ? "bg-muted border border-border"
                : "bg-[#155DFC] text-white"
            )}
          >
            <p className="text-sm whitespace-pre-wrap break-words">
              {msg.message}
            </p>

            {/* Attachments */}
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {msg.attachments.map((file, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded border",
                      isCustomer || isBot
                        ? "bg-muted/50 border-border"
                        : "bg-[#155DFC]/10 border-white/20"
                    )}
                  >
                    {getFileIcon(file.type)}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-xs truncate",
                          isCustomer || isBot ? "text-foreground/80" : "text-white"
                        )}
                      >
                        {file.name}
                      </p>
                      <p
                        className={cn(
                          "text-xs",
                          isCustomer || isBot
                            ? "text-muted-foreground"
                            : "text-white/70"
                        )}
                      >
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "h-6 w-6 p-0",
                        isCustomer || isBot
                          ? "hover:bg-border"
                          : "hover:bg-background/10 text-white"
                      )}
                      onClick={() => window.open(file.url, "_blank")}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message status */}
          {!isCustomer && msg.status && (
            <div className="flex items-center gap-1 px-1">
              {msg.status === "sent" && (
                <>
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-muted-foreground">Đã gửi</span>
                </>
              )}
              {msg.status === "sending" && (
                <>
                  <Clock className="h-3 w-3 text-muted-foreground animate-spin" />
                  <span className="text-xs text-muted-foreground">Đang gửi...</span>
                </>
              )}
              {msg.status === "failed" && (
                <>
                  <AlertCircle className="h-3 w-3 text-red-600" />
                  <span className="text-xs text-red-600">Gửi thất bại</span>
                </>
              )}
            </div>
          )}
        </div>

        {!isCustomer && (
          <Avatar
            className={cn(
              "h-8 w-8 flex-shrink-0 flex items-center justify-center",
              isBot ? "bg-border" : "bg-[#155DFC]/10"
            )}
          >
            {isBot ? (
              <Bot className="h-4 w-4 text-muted-foreground" />
            ) : (
              <UserCircle className="h-4 w-4 text-[#155DFC]" />
            )}
          </Avatar>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Messages area with scroll */}
      <div className="flex-1 overflow-hidden" ref={scrollAreaRef}>
        <ScrollArea className="h-full">
          <div className="px-4 py-4">
            {sessions.map((session, sessionIndex) => (
              <div key={sessionIndex}>
                {/* Session divider */}
                {renderSessionDivider(session, sessionIndex)}

                {/* Messages in session */}
                {session.messages.map((msg) => renderMessage(msg, session.type))}

                {/* Handover divider */}
                {sessionIndex < sessions.length - 1 &&
                  renderHandoverDivider(session, sessions[sessionIndex + 1])}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Input area - Fixed at bottom */}
      <div className="flex-shrink-0 border-t bg-background p-4">
        {/* File previews */}
        {selectedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-lg"
              >
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground/80 truncate max-w-[150px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0"
                  onClick={() => handleRemoveFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isDisabled
                  ? "Phiên chat do bot xử lý..."
                  : "Nhập tin nhắn..."
              }
              disabled={isDisabled || sending}
              className="w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#155DFC] focus:border-transparent disabled:bg-muted/50 disabled:cursor-not-allowed"
              rows={2}
              style={{
                minHeight: "44px",
                maxHeight: "120px",
              }}
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={isDisabled || sending}
          />

          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isDisabled || sending}
            className="h-11 px-3"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            onClick={handleSend}
            disabled={
              isDisabled || sending || (!message.trim() && selectedFiles.length === 0)
            }
            className="h-11 px-4 bg-[#155DFC] hover:bg-[#155DFC]/90"
          >
            {sending ? (
              <Clock className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* File size info */}
        <p className="text-xs text-muted-foreground mt-2">
          Tối đa {maxFileSize}MB mỗi tin nhắn
          {selectedFiles.length > 0 &&
            ` • Đã chọn: ${formatFileSize(
              selectedFiles.reduce((sum, f) => sum + f.size, 0)
            )}`}
        </p>
      </div>
    </div>
  );
}