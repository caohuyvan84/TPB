import { useState, useEffect } from "react";
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Textarea } from './ui/textarea';
import { TooltipProvider } from './ui/tooltip';
import { useTicket, useTicketComments, useTicketHistory, useUpdateTicket, useAddTicketComment } from '../hooks/useTickets';
import {
  Ticket,
  Clock,
  Mail,
  Phone,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Send,
  Edit,
  Save,
  X,
  Flag,
  Tag,
  History,
  Timer,
  Loader2
} from "lucide-react";

interface TicketDetailProps {
  ticketId: string | null;
  onClose?: () => void;
}

export function TicketDetail({ ticketId, onClose }: TicketDetailProps) {
  const { data: ticket, isLoading } = useTicket(ticketId);
  const { data: comments = [] } = useTicketComments(ticketId);
  const { data: history = [] } = useTicketHistory(ticketId);
  const updateTicket = useUpdateTicket();
  const addComment = useAddTicketComment();

  const [isEditing, setIsEditing] = useState(false);
  const [editableTitle, setEditableTitle] = useState('');
  const [editableDescription, setEditableDescription] = useState('');
  const [editablePriority, setEditablePriority] = useState('medium');
  const [editableStatus, setEditableStatus] = useState('open');
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);

  useEffect(() => {
    if (ticket) {
      setEditableTitle(ticket.title || '');
      setEditableDescription(ticket.description || '');
      setEditablePriority(ticket.priority || 'medium');
      setEditableStatus(ticket.status || 'open');
    }
  }, [ticket]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Ticket className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Chọn một ticket để xem chi tiết</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': case 'open': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-muted text-foreground';
      default: return 'bg-muted text-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': case 'open': return 'Mới';
      case 'in-progress': return 'Đang xử lý';
      case 'pending': return 'Chờ phản hồi';
      case 'resolved': return 'Đã giải quyết';
      case 'closed': return 'Đã đóng';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-muted text-foreground';
      default: return 'bg-muted text-foreground';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Khẩn cấp';
      case 'high': return 'Cao';
      case 'medium': return 'Trung bình';
      case 'low': return 'Thấp';
      default: return priority;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="h-3 w-3" />;
      case 'high': return <Flag className="h-3 w-3" />;
      default: return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="h-3 w-3" />;
      case 'in-progress': return <Timer className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const formatTime = (dateStr: string | undefined) => {
    if (!dateStr) return 'Chưa đặt';
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    const now = new Date();
    const diff = now.getTime() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} ngày trước`;
    if (hours > 0) return `${hours} giờ trước`;
    if (minutes > 0) return `${minutes} phút trước`;
    return 'Vừa xong';
  };

  const handleSaveEdit = async () => {
    if (!ticket) return;
    try {
      await updateTicket.mutateAsync({
        id: ticket.id,
        data: {
          title: editableTitle,
          description: editableDescription,
          priority: editablePriority,
          status: editableStatus,
        }
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update ticket:', error);
    }
  };

  const handleCancelEdit = () => {
    if (ticket) {
      setEditableTitle(ticket.title);
      setEditableDescription(ticket.description || '');
      setEditablePriority(ticket.priority);
      setEditableStatus(ticket.status);
    }
    setIsEditing(false);
  };

  const handleAddComment = async () => {
    if (!ticket || !newComment.trim()) return;
    try {
      await addComment.mutateAsync({
        id: ticket.id,
        content: newComment.trim(),
        isInternal: isInternalComment
      });
      setNewComment('');
      setIsInternalComment(false);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return;
    try {
      await updateTicket.mutateAsync({
        id: ticket.id,
        data: { status: newStatus }
      });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border p-3 bg-background">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Ticket className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm text-blue-600">#{ticket.displayId}</span>
              <Badge className={getStatusColor(ticket.status)}>
                {getStatusIcon(ticket.status)}
                <span className="ml-1 text-xs">{getStatusLabel(ticket.status)}</span>
              </Badge>
            </div>
            <div className="flex items-center space-x-1">
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
                  <X className="h-3 w-3" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)} className="h-7 w-7 p-0">
                <Edit className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Title and Description */}
          <div className="space-y-2">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editableTitle}
                  onChange={(e) => setEditableTitle(e.target.value)}
                  className="w-full text-sm font-medium border border-gray-300 rounded px-2 py-1"
                  placeholder="Tiêu đề ticket"
                />
                <Textarea
                  value={editableDescription}
                  onChange={(e) => setEditableDescription(e.target.value)}
                  className="min-h-[60px] text-sm"
                  placeholder="Mô tả chi tiết"
                />
                <div className="flex space-x-2">
                  <Button size="sm" onClick={handleSaveEdit} disabled={updateTicket.isPending} className="h-7 text-xs">
                    <Save className="h-3 w-3 mr-1" />
                    Lưu
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCancelEdit} className="h-7 text-xs">
                    <X className="h-3 w-3 mr-1" />
                    Hủy
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-medium text-foreground mb-1">{ticket.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{ticket.description}</p>
              </div>
            )}
          </div>

          {/* Priority and Category */}
          <div className="flex items-center flex-wrap gap-2 mt-3">
            <Badge className={getPriorityColor(ticket.priority)}>
              {getPriorityIcon(ticket.priority)}
              <span className="ml-1 text-xs">{getPriorityLabel(ticket.priority)}</span>
            </Badge>
            {ticket.category && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                <Tag className="h-3 w-3 mr-1" />
                {ticket.category}
              </Badge>
            )}
            {ticket.department && (
              <Badge variant="outline" className="text-xs">
                {ticket.department}
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Quick Actions */}
          <div className="flex-shrink-0 border-b border-border p-3 bg-muted/50">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => handleStatusChange('in-progress')}
                disabled={ticket.status === 'in-progress' || updateTicket.isPending}
                className="h-7 text-xs"
              >
                <Timer className="h-3 w-3 mr-1" />
                Xử lý
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => handleStatusChange('resolved')}
                disabled={ticket.status === 'resolved' || updateTicket.isPending}
                className="h-7 text-xs bg-green-50 text-green-700 border-green-200"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Giải quyết
              </Button>
            </div>
          </div>

          {/* Ticket Details */}
          <div className="flex-shrink-0 border-b border-border p-3 bg-background">
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-foreground">Thông tin ticket</h4>

              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Độ ưu tiên</Label>
                      <Select value={editablePriority} onValueChange={setEditablePriority}>
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low" className="text-xs">Thấp</SelectItem>
                          <SelectItem value="medium" className="text-xs">Trung bình</SelectItem>
                          <SelectItem value="high" className="text-xs">Cao</SelectItem>
                          <SelectItem value="urgent" className="text-xs">Khẩn cấp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Trạng thái</Label>
                      <Select value={editableStatus} onValueChange={setEditableStatus}>
                        <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open" className="text-xs">Mới</SelectItem>
                          <SelectItem value="in-progress" className="text-xs">Đang xử lý</SelectItem>
                          <SelectItem value="pending" className="text-xs">Chờ phản hồi</SelectItem>
                          <SelectItem value="resolved" className="text-xs">Đã giải quyết</SelectItem>
                          <SelectItem value="closed" className="text-xs">Đã đóng</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <Label className="text-xs text-muted-foreground">Danh mục</Label>
                      <p className="font-medium mt-0.5">{ticket.category || 'Chưa phân loại'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Bộ phận</Label>
                      <p className="font-medium mt-0.5">{ticket.department || 'Chưa phân công'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Độ ưu tiên</Label>
                      <p className={`font-medium mt-0.5 ${
                        ticket.priority === 'urgent' ? 'text-red-600' :
                        ticket.priority === 'high' ? 'text-orange-600' :
                        ticket.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                      }`}>{getPriorityLabel(ticket.priority)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Trạng thái</Label>
                      <p className={`font-medium mt-0.5 ${
                        ticket.status === 'in-progress' ? 'text-blue-600' :
                        ticket.status === 'resolved' ? 'text-green-600' : 'text-muted-foreground'
                      }`}>{getStatusLabel(ticket.status)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Hạn xử lý</Label>
                      <p className="font-medium mt-0.5">{formatTime(ticket.dueAt)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Ngày tạo</Label>
                      <p className="font-medium mt-0.5">{formatTime(ticket.createdAt)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Cập nhật</Label>
                      <p className="font-medium mt-0.5">{formatTime(ticket.updatedAt)}</p>
                    </div>
                    {ticket.resolvedAt && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Giải quyết lúc</Label>
                        <p className="font-medium mt-0.5 text-green-600">{formatTime(ticket.resolvedAt)}</p>
                      </div>
                    )}
                  </div>

                  {ticket.interactionId && (
                    <div className="pt-2 border-t border-border/50">
                      <Label className="text-xs text-muted-foreground">Từ tương tác</Label>
                      <p className="font-medium mt-0.5 text-blue-600 text-xs">{ticket.interactionId}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="flex-shrink-0 border-b border-border p-3 bg-muted/30">
              <div className="flex items-center space-x-2 mb-2">
                <History className="h-3 w-3 text-muted-foreground" />
                <h4 className="font-medium text-xs text-muted-foreground">Lịch sử thay đổi</h4>
              </div>
              {history.slice(0, 5).map((h: any) => (
                <div key={h.id} className="text-xs text-muted-foreground py-1">
                  <span className="font-medium text-foreground">{h.agentName}</span>
                  {' '}đã thay đổi <span className="font-medium">{h.fieldName}</span>
                  {': '}<span className="line-through">{h.oldValue}</span>
                  {' → '}<span className="text-foreground">{h.newValue}</span>
                  <span className="ml-2">{formatRelativeTime(h.changedAt)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Comments Timeline */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-3">
                <div className="flex items-center space-x-2 mb-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium text-sm text-foreground">
                    Bình luận ({comments.length})
                  </h3>
                </div>

                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Chưa có bình luận</p>
                )}

                {comments.map((comment: any) => (
                  <Card key={comment.id} className={
                    comment.isInternal ? 'border-yellow-200 bg-yellow-50' : 'border-border'
                  }>
                    <CardContent className="p-3">
                      <div className="flex items-start space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {(comment.agentName || 'A').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-xs">{comment.agentName || 'Agent'}</span>
                            {comment.isInternal && (
                              <Badge className="text-xs bg-yellow-100 text-yellow-800">Nội bộ</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(comment.createdAt)}
                            </span>
                          </div>
                          <div className="text-xs text-foreground/80 leading-relaxed">
                            {comment.content}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Add Comment */}
          <div className="flex-shrink-0 border-t border-border p-3 bg-muted/50">
            <div className="space-y-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Thêm bình luận hoặc cập nhật..."
                className="min-h-[60px] text-sm"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 text-xs">
                  <input
                    type="checkbox"
                    checked={isInternalComment}
                    onChange={(e) => setIsInternalComment(e.target.checked)}
                    className="rounded"
                  />
                  <span>Nội bộ</span>
                </label>
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || addComment.isPending}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 h-7"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Gửi
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
