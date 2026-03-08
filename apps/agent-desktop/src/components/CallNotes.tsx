import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Clock, 
  Copy, 
  Pin, 
  User,
  MessageCircle,
  FileText,
  Tag,
  Save,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';

// Note types for tagging
const NOTE_TAGS = [
  { value: 'customer-info', label: 'Thông tin khách', color: 'bg-blue-100 text-blue-800' },
  { value: 'callback', label: 'Hẹn gọi lại', color: 'bg-green-100 text-green-800' },
  { value: 'complaint', label: 'Khiếu nại', color: 'bg-red-100 text-red-800' },
  { value: 'technical', label: 'Kỹ thuật', color: 'bg-purple-100 text-purple-800' },
  { value: 'payment', label: 'Thanh toán', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'general', label: 'Chung', color: 'bg-muted text-foreground' }
];

interface CallNote {
  id: string;
  content: string;
  timestamp: Date;
  agentId: string;
  agentName: string;
  agentAvatar: string;
  tag?: string;
  isPinned?: boolean;
  isNew?: boolean; // For highlighting newly added notes
}

interface CallNotesProps {
  callId: string;
  isCallActive: boolean;
  initialNotes?: CallNote[];
  onAddNote?: (note: Omit<CallNote, 'id' | 'timestamp' | 'isNew'>) => void;
  currentAgentId?: string;
  currentAgentName?: string;
}

// Mock initial notes for demo
const mockInitialNotes: CallNote[] = [
  {
    id: 'note-1',
    content: 'Khách hàng gọi để tư vấn về gói nâng cấp dịch vụ. Hiện tại đang sử dụng gói Basic, muốn chuyển lên Premium. Đã giải thích chi tiết về các tính năng mới bao gồm băng thông cao hơn từ 100Mbps lên 500Mbps, hỗ trợ kỹ thuật 24/7 thay vì chỉ giờ hành chính.',
    timestamp: new Date(Date.now() - 8 * 60 * 1000), // 8 minutes ago
    agentId: 'AGT001',
    agentName: 'Agent Duc',
    agentAvatar: '👨‍💼',
    tag: 'customer-info'
  },
  {
    id: 'note-2',
    content: 'Đã giải thích chi tiết về lợi ích của gói Premium: băng thông cao hơn, hỗ trợ 24/7, và thêm 5GB lưu trữ cloud.',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    agentId: 'AGT001',
    agentName: 'Agent Duc',
    agentAvatar: '👨‍💼',
    tag: 'general'
  },
  {
    id: 'note-3',
    content: 'Khách hàng quan tâm đến giá cả. Đã báo giá 299k/tháng cho gói Premium, khách hàng đề nghị 250k/tháng.',
    timestamp: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
    agentId: 'AGT001',
    agentName: 'Agent Duc',
    agentAvatar: '👨‍💼',
    tag: 'payment',
    isPinned: true
  }
];

export function CallNotes({ 
  callId, 
  isCallActive, 
  initialNotes = mockInitialNotes,
  onAddNote,
  currentAgentId = 'AGT001',
  currentAgentName = 'Agent Tung'
}: CallNotesProps) {
  const [notes, setNotes] = useState<CallNote[]>(initialNotes);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter' && isCallActive && isAddingNote) {
        e.preventDefault();
        handleAddNote();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [newNoteContent, selectedTag, isCallActive, isAddingNote]);

  // Auto-focus textarea when adding note
  useEffect(() => {
    if (isAddingNote && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isAddingNote]);

  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;

    const newNote: CallNote = {
      id: `note-${Date.now()}`,
      content: newNoteContent.trim(),
      timestamp: new Date(),
      agentId: currentAgentId,
      agentName: currentAgentName,
      agentAvatar: '👨‍💼',
      tag: selectedTag || undefined,
      isNew: true
    };

    // Add to local state
    setNotes(prev => [newNote, ...prev]);

    // Call parent callback if provided
    if (onAddNote) {
      onAddNote({
        content: newNote.content,
        agentId: newNote.agentId,
        agentName: newNote.agentName,
        agentAvatar: newNote.agentAvatar,
        tag: newNote.tag
      });
    }

    // Reset form
    setNewNoteContent('');
    setSelectedTag('');
    setIsAddingNote(false);

    // Scroll timeline to top to show new note
    if (timelineRef.current) {
      timelineRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Remove "new" highlighting after 3 seconds
    setTimeout(() => {
      setNotes(prev => prev.map(note => 
        note.id === newNote.id ? { ...note, isNew: false } : note
      ));
    }, 3000);
  };

  const handleCancelNote = () => {
    setNewNoteContent('');
    setSelectedTag('');
    setIsAddingNote(false);
  };

  const handleCopyNote = (noteId: string, noteContent: string) => {
    navigator.clipboard.writeText(noteContent);
    setCopiedNoteId(noteId);
    // Reset copied state after 2 seconds
    setTimeout(() => {
      setCopiedNoteId(null);
    }, 2000);
  };

  const handlePinNote = (noteId: string) => {
    setNotes(prev => prev.map(note =>
      note.id === noteId ? { ...note, isPinned: !note.isPinned } : note
    ));
  };

  const toggleExpandNote = (noteId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const shouldTruncateNote = (content: string) => {
    return content.length > 120; // Show expand option for notes longer than 120 chars
  };

  const getTruncatedContent = (content: string, noteId: string) => {
    if (!shouldTruncateNote(content) || expandedNotes.has(noteId)) {
      return content;
    }
    return content.substring(0, 120) + '...';
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (timestamp: Date) => {
    const today = new Date();
    const noteDate = new Date(timestamp);
    
    if (noteDate.toDateString() === today.toDateString()) {
      return 'Hôm nay';
    }
    
    return noteDate.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const getTagStyle = (tagValue: string) => {
    const tag = NOTE_TAGS.find(t => t.value === tagValue);
    return tag ? tag.color : 'bg-muted text-foreground';
  };

  const getTagLabel = (tagValue: string) => {
    const tag = NOTE_TAGS.find(t => t.value === tagValue);
    return tag ? tag.label : tagValue;
  };

  // Sort notes: pinned first, then by timestamp (newest first)
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center space-x-2">
            <MessageCircle className="h-4 w-4" />
            <span>Ghi chú cuộc gọi</span>
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {notes.length} ghi chú
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4 overflow-hidden">
        {/* Add Note Form - Available for both active and completed calls */}
        <div className="space-y-3">
          {!isAddingNote ? (
            <Button
              variant="outline"
              onClick={() => setIsAddingNote(true)}
              className={`w-full border-dashed border-2 transition-colors ${
                isCallActive 
                  ? 'border-green-300 hover:border-green-400 hover:bg-green-50 text-green-700' 
                  : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50 text-blue-700'
              }`}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isCallActive ? 'Thêm ghi chú mới' : 'Thêm ghi chú bổ sung'}
            </Button>
          ) : (
            <div className={`space-y-3 p-3 rounded-lg border animate-in slide-in-from-top duration-200 ${
              isCallActive 
                ? 'bg-green-50 border-green-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center space-x-2">
                <User className={`h-4 w-4 ${isCallActive ? 'text-green-600' : 'text-blue-600'}`} />
                <span className={`text-sm font-medium ${isCallActive ? 'text-green-800' : 'text-blue-800'}`}>
                  {currentAgentName}
                </span>
                <Badge variant="outline" className="text-xs">
                  {formatTime(new Date())}
                </Badge>
                {!isCallActive && (
                  <Badge variant="secondary" className="text-xs bg-muted text-foreground/80">
                    Ghi chú sau cuộc gọi
                  </Badge>
                )}
              </div>

              <Textarea
                ref={textareaRef}
                placeholder={isCallActive 
                  ? "Nhập nội dung ghi chú trong cuộc gọi..." 
                  : "Nhập ghi chú bổ sung sau cuộc gọi..."
                }
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="min-h-[80px] bg-background border-gray-300 focus:border-blue-500 resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.shiftKey) {
                    // Allow Shift+Enter for new line
                    return;
                  }
                }}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedTag} onValueChange={setSelectedTag}>
                    <SelectTrigger className="w-40 h-8">
                      <SelectValue placeholder="Chọn tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTE_TAGS.map((tag) => (
                        <SelectItem key={tag.value} value={tag.value}>
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${tag.color.split(' ')[0]}`} />
                            <span>{tag.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={handleCancelNote}>
                    Hủy
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleAddNote}
                    disabled={!newNoteContent.trim()}
                    className={`transition-colors ${
                      isCallActive 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {isCallActive ? 'Thêm ghi chú' : 'Lưu ghi chú'}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground flex items-center space-x-1">
                <span>💡 Tip:</span>
                <span>{isCallActive ? 'Nhấn Ctrl + Enter để lưu nhanh' : 'Ghi chú sẽ được đánh dấu thời gian hiện tại'}</span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Notes Timeline */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto space-y-3" ref={timelineRef}>
            {sortedNotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Chưa có ghi chú cho cuộc gọi này</p>
                <p className="text-xs mt-1 text-muted-foreground">
                  {isCallActive 
                    ? 'Thêm ghi chú đầu tiên bằng cách nhấn nút phía trên'
                    : 'Bạn có thể thêm ghi chú bổ sung cho cuộc gọi đã hoàn thành'
                  }
                </p>
              </div>
            ) : (
              sortedNotes.map((note, index) => (
                 <div 
                   key={note.id}
                   className={`relative p-3 rounded-lg border transition-all duration-500 group ${
                     note.isNew 
                       ? 'bg-blue-50 border-blue-200 shadow-lg scale-105 animate-in slide-in-from-top duration-300' 
                       : 'bg-background border-border hover:bg-muted/50'
                   } ${note.isPinned ? 'ring-2 ring-yellow-300 shadow-sm' : ''}`}
                 >
                   {/* Timeline connector */}
                   {index < sortedNotes.length - 1 && (
                     <div className="absolute left-6 top-12 bottom-0 w-px bg-border" />
                   )}

                   <div className="flex items-start space-x-3">
                     {/* Agent Avatar */}
                     <Avatar className="h-8 w-8 flex-shrink-0">
                       <AvatarFallback className="text-sm">
                         {note.agentAvatar}
                       </AvatarFallback>
                     </Avatar>

                     <div className="flex-1 min-w-0">
                       {/* Header */}
                       <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center space-x-2">
                           <span className="font-medium text-sm text-foreground">
                             {note.agentName}
                           </span>
                           <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                             <Clock className="h-3 w-3" />
                             <span>{formatTime(note.timestamp)}</span>
                             <span>•</span>
                             <span>{formatDate(note.timestamp)}</span>
                           </div>
                         </div>

                         <div className="flex items-center space-x-1">
                           {note.isPinned && (
                             <Pin className="h-3 w-3 text-yellow-600 fill-current" />
                           )}
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleCopyNote(note.id, note.content)}
                             className={`h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                               copiedNoteId === note.id ? 'opacity-100 text-green-600' : ''
                             }`}
                             title={copiedNoteId === note.id ? 'Đã copy!' : 'Copy nội dung'}
                           >
                             {copiedNoteId === note.id ? (
                               <Check className="h-3 w-3" />
                             ) : (
                               <Copy className="h-3 w-3" />
                             )}
                           </Button>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handlePinNote(note.id)}
                             className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                             title={note.isPinned ? 'Bỏ pin' : 'Pin ghi chú'}
                           >
                             <Pin className={`h-3 w-3 ${note.isPinned ? 'text-yellow-600 fill-current' : ''}`} />
                           </Button>
                         </div>
                       </div>

                       {/* Content */}
                       <div className="text-sm text-foreground/80 leading-relaxed mb-2">
                         {getTruncatedContent(note.content, note.id)}
                         {shouldTruncateNote(note.content) && (
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => toggleExpandNote(note.id)}
                             className="ml-2 p-0 h-auto text-blue-600 hover:text-blue-700 underline"
                           >
                             {expandedNotes.has(note.id) ? (
                               <>Thu gọn <ChevronUp className="h-3 w-3 ml-1 inline" /></>
                             ) : (
                               <>Xem thêm <ChevronDown className="h-3 w-3 ml-1 inline" /></>
                             )}
                           </Button>
                         )}
                       </div>

                       {/* Tag */}
                       {note.tag && (
                         <Badge className={`text-xs ${getTagStyle(note.tag)}`}>
                           {getTagLabel(note.tag)}
                         </Badge>
                       )}
                     </div>
                   </div>
                 </div>
               ))
            )}
          </div>
        </div>

        {/* Footer with note count and shortcuts */}
        {sortedNotes.length > 0 && (
          <div className="pt-2 border-t text-xs text-muted-foreground flex items-center justify-between">
            <span>
              {sortedNotes.length} ghi chú 
              {sortedNotes.filter(n => n.isPinned).length > 0 && 
                ` • ${sortedNotes.filter(n => n.isPinned).length} đã pin`
              }
            </span>
            <span>
              {isCallActive ? 'Ctrl + Enter để lưu nhanh' : 'Có thể thêm ghi chú bổ sung'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}