import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Ticket,
  Clock,
  User,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Paperclip,
  Send,
  Edit,
  Save,
  X,
  ArrowLeft,
  MoreHorizontal,
  Flag,
  Users,
  Tag,
  History,
  Timer,
  FileText,
  Star
} from "lucide-react";

interface TicketData {
  id: string;
  number: string;
  classification?: string;
  classificationLabel?: string;
  title: string;
  titleLabel?: string;
  description: string;
  status: 'new' | 'in-progress' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  customer: {
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    isVIP?: boolean;
  };
  assignedAgent?: string;
  assignedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  resolvedAt?: Date;
  tags: string[];
  attachments?: string[];
  interactionId?: string;
  source?: string;
  comments: Array<{
    id: string;
    author: string;
    content: string;
    timestamp: Date;
    type: 'comment' | 'status-change' | 'assignment';
    isInternal?: boolean;
  }>;
}

interface TicketDetailProps {
  ticket: TicketData | null;
  onClose?: () => void;
  onUpdateTicket?: (ticketId: string, updates: Partial<TicketData>) => void;
  onAddComment?: (ticketId: string, comment: string, isInternal?: boolean) => void;
}

export function TicketDetail({ 
  ticket, 
  onClose, 
  onUpdateTicket, 
  onAddComment 
}: TicketDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editableTitle, setEditableTitle] = useState(ticket?.title || '');
  const [editableDescription, setEditableDescription] = useState(ticket?.description || '');
  const [editableClassification, setEditableClassification] = useState(ticket?.classification || '');
  const [editablePriority, setEditablePriority] = useState(ticket?.priority || 'medium');
  const [editableStatus, setEditableStatus] = useState(ticket?.status || 'new');
  const [editableDueDate, setEditableDueDate] = useState(
    ticket?.dueDate ? new Date(ticket.dueDate).toISOString().split('T')[0] : ''
  );
  const [editableAssignedAgent, setEditableAssignedAgent] = useState(ticket?.assignedAgent || '');
  const [newComment, setNewComment] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);

  // Available options for dropdowns
  const categories = [
    'Technical Support',
    'Account Management',
    'Billing & Payment',
    'Customer Complaint',
    'General Inquiry',
    'Product Request'
  ];

  const agents = [
    'Agent Mai',
    'Agent Duc',
    'Agent Linh',
    'Agent Tung',
    'Agent Hoa'
  ];

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

  const getStatusColor = (status: TicketData['status']) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-muted text-foreground';
      default: return 'bg-muted text-foreground';
    }
  };

  const getPriorityColor = (priority: TicketData['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-muted text-foreground';
      default: return 'bg-muted text-foreground';
    }
  };

  const getPriorityIcon = (priority: TicketData['priority']) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="h-3 w-3" />;
      case 'high': return <Flag className="h-3 w-3" />;
      default: return null;
    }
  };

  const getStatusIcon = (status: TicketData['status']) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="h-3 w-3" />;
      case 'in-progress': return <Timer className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} ngày trước`;
    if (hours > 0) return `${hours} giờ trước`;
    if (minutes > 0) return `${minutes} phút trước`;
    return 'Vừa xong';
  };

  const handleSaveEdit = () => {
    if (onUpdateTicket) {
      onUpdateTicket(ticket.id, {
        title: editableTitle,
        description: editableDescription,
        classification: editableClassification,
        priority: editablePriority as TicketData['priority'],
        status: editableStatus as TicketData['status'],
        dueDate: editableDueDate ? new Date(editableDueDate) : undefined,
        assignedAgent: editableAssignedAgent
      });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditableTitle(ticket.title);
    setEditableDescription(ticket.description);
    setEditableClassification(ticket.classification || '');
    setEditablePriority(ticket.priority);
    setEditableStatus(ticket.status);
    setEditableDueDate(ticket.dueDate ? new Date(ticket.dueDate).toISOString().split('T')[0] : '');
    setEditableAssignedAgent(ticket.assignedAgent || '');
    setIsEditing(false);
  };

  const handleAddComment = () => {
    if (newComment.trim() && onAddComment) {
      onAddComment(ticket.id, newComment.trim(), isInternalComment);
      setNewComment('');
      setIsInternalComment(false);
    }
  };

  const handleStatusChange = (newStatus: TicketData['status']) => {
    if (onUpdateTicket) {
      onUpdateTicket(ticket.id, { status: newStatus });
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
              <span className="font-medium text-sm text-blue-600">#{ticket.number}</span>
              <Badge className={getStatusColor(ticket.status)}>
                {getStatusIcon(ticket.status)}
                <span className="ml-1 text-xs">
                  {ticket.status === 'new' ? 'Mới' :
                   ticket.status === 'in-progress' ? 'Đang xử lý' :
                   ticket.status === 'pending' ? 'Chờ phản hồi' :
                   ticket.status === 'resolved' ? 'Đã giải quyết' : 'Đã đóng'}
                </span>
              </Badge>
            </div>

            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="h-7 w-7 p-0"
              >
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
                  <Button size="sm" onClick={handleSaveEdit} className="h-7 text-xs">
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
                <h3 className="text-sm font-medium text-foreground mb-1">
                  {ticket.titleLabel || ticket.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{ticket.description}</p>
              </div>
            )}
          </div>

          {/* Priority, Classification and Status */}
          <div className="flex items-center flex-wrap gap-2 mt-3">
            <Badge className={getPriorityColor(ticket.priority)}>
              {getPriorityIcon(ticket.priority)}
              <span className="ml-1 text-xs">
                {ticket.priority === 'urgent' ? 'Khẩn cấp' :
                 ticket.priority === 'high' ? 'Cao' :
                 ticket.priority === 'medium' ? 'Trung bình' : 'Thấp'}
              </span>
            </Badge>
            {ticket.classificationLabel && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                <Tag className="h-3 w-3 mr-1" />
                {ticket.classificationLabel}
              </Badge>
            )}
            <Badge variant="outline" className={`text-xs ${
              ticket.status === 'new' ? 'bg-muted/50 text-foreground/80 border-gray-300' :
              ticket.status === 'in-progress' ? 'bg-blue-50 text-blue-700 border-blue-300' :
              ticket.status === 'resolved' ? 'bg-green-50 text-green-700 border-green-300' :
              'bg-muted text-muted-foreground border-gray-400'
            }`}>
              {ticket.status === 'new' ? 'Mới' :
               ticket.status === 'in-progress' ? 'Đang xử lý' :
               ticket.status === 'resolved' ? 'Đã xử lý' : 'Đóng'}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Customer Info - Compact */}
          <div className="flex-shrink-0 border-b border-border p-3 bg-muted/50">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={ticket.customer.avatar || undefined} />
                <AvatarFallback className="text-xs">
                  {ticket.customer.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm">{ticket.customer.name}</span>
                  {ticket.customer.isVIP && (
                    <Badge className="text-xs bg-yellow-100 text-yellow-800">VIP</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{ticket.customer.email}</div>
              </div>
              <div className="flex space-x-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Phone className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Mail className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex-shrink-0 border-b border-border p-3 bg-muted/50">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('in-progress')}
                disabled={ticket.status === 'in-progress'}
                className="h-7 text-xs"
              >
                <Timer className="h-3 w-3 mr-1" />
                Xử lý
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('resolved')}
                disabled={ticket.status === 'resolved'}
                className="h-7 text-xs bg-green-50 text-green-700 border-green-200"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Giải quyết
              </Button>
            </div>
          </div>

          {/* Ticket Details - Expanded */}
          <div className="flex-shrink-0 border-b border-border p-3 bg-background">
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-foreground">Thông tin ticket</h4>
              
              {isEditing ? (
                /* Edit Mode - Form Fields */
                <div className="space-y-3">
                  {/* Priority & Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Độ ưu tiên</Label>
                      <Select value={editablePriority} onValueChange={setEditablePriority}>
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low" className="text-xs">Thấp</SelectItem>
                          <SelectItem value="medium" className="text-xs">Trung bình</SelectItem>
                          <SelectItem value="high" className="text-xs">Cao</SelectItem>
                          <SelectItem value="urgent" className="text-xs">Khẩn cấp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Trạng thái xử lý</Label>
                      <Select value={editableStatus} onValueChange={setEditableStatus}>
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new" className="text-xs">Mới</SelectItem>
                          <SelectItem value="in-progress" className="text-xs">Đang xử lý</SelectItem>
                          <SelectItem value="resolved" className="text-xs">Đã xử lý</SelectItem>
                          <SelectItem value="closed" className="text-xs">Đóng</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Assigned Agent & Due Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Người xử lý</Label>
                      <Select value={editableAssignedAgent} onValueChange={setEditableAssignedAgent}>
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue placeholder="Chọn agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {agents.map((agent) => (
                            <SelectItem key={agent} value={agent} className="text-xs">
                              {agent}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Hạn xử lý</Label>
                      <Input
                        type="date"
                        value={editableDueDate}
                        onChange={(e) => setEditableDueDate(e.target.value)}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  </div>

                  {/* Read-only info */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                    <div>
                      <Label className="text-xs text-muted-foreground">Ngày tạo</Label>
                      <p className="font-medium mt-0.5 text-xs text-muted-foreground">{formatTime(ticket.createdAt)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Cập nhật</Label>
                      <p className="font-medium mt-0.5 text-xs text-muted-foreground">{formatTime(ticket.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* View Mode - Display Fields */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <Label className="text-xs text-muted-foreground">Phân loại</Label>
                      <p className="font-medium mt-0.5">{ticket.classificationLabel || 'Chưa phân loại'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Tiêu đề</Label>
                      <p className="font-medium mt-0.5">{ticket.titleLabel || ticket.title || 'Chưa có tiêu đề'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Độ ưu tiên</Label>
                      <p className={`font-medium mt-0.5 ${
                        ticket.priority === 'urgent' ? 'text-red-600' :
                        ticket.priority === 'high' ? 'text-orange-600' :
                        ticket.priority === 'medium' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {ticket.priority === 'urgent' ? 'Khẩn cấp' :
                         ticket.priority === 'high' ? 'Cao' :
                         ticket.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Trạng thái xử lý</Label>
                      <p className={`font-medium mt-0.5 ${
                        ticket.status === 'new' ? 'text-muted-foreground' :
                        ticket.status === 'in-progress' ? 'text-blue-600' :
                        ticket.status === 'resolved' ? 'text-green-600' :
                        'text-muted-foreground'
                      }`}>
                        {ticket.status === 'new' ? 'Mới' :
                         ticket.status === 'in-progress' ? 'Đang xử lý' :
                         ticket.status === 'resolved' ? 'Đã xử lý' : 'Đóng'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Người xử lý</Label>
                      <p className="font-medium mt-0.5">{ticket.assignedAgent || 'Chưa phân công'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Hạn xử lý</Label>
                      <p className="font-medium mt-0.5">
                        {ticket.dueDate ? formatTime(ticket.dueDate) : 'Chưa đặt'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Ngày tạo</Label>
                      <p className="font-medium mt-0.5">{formatTime(ticket.createdAt)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Cập nhật</Label>
                      <p className="font-medium mt-0.5">{formatTime(ticket.updatedAt)}</p>
                    </div>
                  </div>

                  {/* Interaction Link */}
                  {ticket.interactionId && (
                    <div className="pt-2 border-t border-border/50">
                      <Label className="text-xs text-muted-foreground">Từ tương tác</Label>
                      <p className="font-medium mt-0.5 text-blue-600 text-xs">
                        {ticket.interactionId} {ticket.source ? `- ${ticket.source}` : ''}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {ticket.tags && ticket.tags.length > 0 && (
                    <div className="pt-2 border-t border-border/50">
                      <Label className="text-xs text-muted-foreground mb-2 block">Tags</Label>
                      <div className="flex flex-wrap gap-1">
                        {ticket.tags.map((tag: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            <Tag className="h-2 w-2 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Comments Timeline */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-3">
                <div className="flex items-center space-x-2 mb-3">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium text-sm text-foreground">Lịch sử tương tác</h3>
                </div>

                {ticket.comments.map((comment) => (
                  <Card key={comment.id} className={`${
                    comment.isInternal ? 'border-yellow-200 bg-yellow-50' : 'border-border'
                  }`}>
                    <CardContent className="p-3">
                      <div className="flex items-start space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {comment.author.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-xs">{comment.author}</span>
                            {comment.isInternal && (
                              <Badge className="text-xs bg-yellow-100 text-yellow-800">Nội bộ</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(comment.timestamp)}
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
                  disabled={!newComment.trim()}
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