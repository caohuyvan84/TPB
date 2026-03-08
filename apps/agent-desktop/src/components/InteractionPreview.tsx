import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Card, CardContent } from './ui/card';
import { 
  Phone, 
  Mail, 
  MessageCircle, 
  Calendar, 
  Clock, 
  User, 
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  Copy,
  FileText,
  Tag
} from "lucide-react";

interface InteractionPreviewProps {
  interaction: any;
  onClose: () => void;
  onNavigateToInteraction: (interactionId: string) => void;
}

export function InteractionPreview({ 
  interaction, 
  onClose, 
  onNavigateToInteraction 
}: InteractionPreviewProps) {
  const [copied, setCopied] = useState(false);

  if (!interaction) return null;

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-5 w-5 text-blue-600" />;
      case 'email': return <Mail className="h-5 w-5 text-orange-600" />;
      case 'chat': return <MessageCircle className="h-5 w-5 text-green-600" />;
      default: return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'escalated': return 'bg-red-100 text-red-800 border-red-200';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'resolved': return 'Đã giải quyết';
      case 'completed': return 'Hoàn thành';
      case 'escalated': return 'Chuyển cấp trên';
      case 'in-progress': return 'Đang xử lý';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low': return 'text-muted-foreground bg-muted/50 border-border';
      default: return 'text-muted-foreground bg-muted/50 border-border';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Khẩn cấp';
      case 'high': return 'Cao';
      case 'medium': return 'Trung bình';
      case 'low': return 'Thấp';
      default: return priority;
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(interaction.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNavigate = () => {
    onNavigateToInteraction(interaction.id);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <div className="flex items-center space-x-3">
            {getInteractionIcon(interaction.type)}
            <div>
              <DialogTitle className="text-xl">{interaction.subject}</DialogTitle>
              <DialogDescription className="flex items-center space-x-2 mt-1">
                <span>ID: {interaction.id}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyId}
                  className="h-6 w-6 p-0"
                >
                  {copied ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Priority */}
          <div className="flex items-center space-x-4">
            <Badge className={`${getStatusColor(interaction.status)} border`}>
              {getStatusText(interaction.status)}
            </Badge>
            <Badge className={`${getPriorityColor(interaction.priority)} border`}>
              {getPriorityText(interaction.priority)}
            </Badge>
          </div>

          {/* Basic Info */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Ngày tạo</p>
                    <p className="font-medium">{interaction.date} lúc {interaction.time}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Agent xử lý</p>
                    <p className="font-medium">{interaction.agent}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Thời gian xử lý</p>
                    <p className="font-medium">{interaction.duration}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Loại tương tác</p>
                    <p className="font-medium capitalize">
                      {interaction.type === 'call' ? 'Cuộc gọi' :
                       interaction.type === 'email' ? 'Email' : 'Chat'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <div>
            <h4 className="font-medium mb-3 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Tóm tắt tương tác
            </h4>
            <Card>
              <CardContent className="p-4">
                <p className="text-foreground/80 leading-relaxed">{interaction.summary}</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Content Based on Type */}
          {interaction.type === 'email' && (
            <div>
              <h4 className="font-medium mb-3 flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                Nội dung Email
              </h4>
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="text-sm">
                      <strong>Từ:</strong> customer@example.com<br />
                      <strong>Đến:</strong> support@company.com<br />
                      <strong>Chủ đề:</strong> {interaction.subject}
                    </div>
                    <Separator />
                    <div className="text-sm text-foreground/80">
                      <p>Kính gửi bộ phận hỗ trợ,</p>
                      <br />
                      <p>Tôi đang gặp vấn đề với sản phẩm và cần được hỗ trợ kỹ thuật.</p>
                      <p>Chi tiết vấn đề: [Mô tả chi tiết về vấn đề gặp phải]</p>
                      <br />
                      <p>Mong nhận được phản hồi sớm.</p>
                      <br />
                      <p>Trân trọng,<br />Trần Thị B</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {interaction.type === 'call' && (
            <div>
              <h4 className="font-medium mb-3 flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                Ghi chú cuộc gọi
              </h4>
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2 text-sm">
                    <p><strong>Cuộc gọi đến:</strong> {interaction.time}</p>
                    <p><strong>Thời lượng:</strong> {interaction.duration}</p>
                    <p><strong>Ghi chú:</strong></p>
                    <div className="bg-muted/50 p-3 rounded mt-2">
                      <p className="text-foreground/80">{interaction.summary}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded mt-2">
                      <p className="text-blue-800 font-medium">Hành động tiếp theo:</p>
                      <p className="text-blue-700 text-sm mt-1">
                        Theo dõi tình hình sau 24h, gọi lại nếu khách hàng chưa hài lòng.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {interaction.type === 'chat' && (
            <div>
              <h4 className="font-medium mb-3 flex items-center">
                <MessageCircle className="h-4 w-4 mr-2" />
                Cuộc trò chuyện
              </h4>
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-start">
                      <div className="bg-muted p-3 rounded-lg max-w-xs">
                        <p className="text-sm">Xin chào, tôi cần hỗ trợ về hóa đơn tháng này</p>
                        <span className="text-xs text-muted-foreground">16:45</span>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-blue-500 text-white p-3 rounded-lg max-w-xs">
                        <p className="text-sm">Chào anh/chị! Tôi sẽ kiểm tra hóa đơn cho anh/chị</p>
                        <span className="text-xs text-blue-100">16:46</span>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-muted p-3 rounded-lg max-w-xs">
                        <p className="text-sm">Cảm ơn bạn!</p>
                        <span className="text-xs text-muted-foreground">16:46</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Resolution */}
          {interaction.status === 'resolved' && (
            <div>
              <h4 className="font-medium mb-3 flex items-center text-green-600">
                <CheckCircle className="h-4 w-4 mr-2" />
                Kết quả xử lý
              </h4>
              <Card className="border-green-200">
                <CardContent className="p-4 bg-green-50">
                  <p className="text-green-800">
                    Vấn đề đã được giải quyết thành công. Khách hàng hài lòng với kết quả.
                  </p>
                  <div className="mt-2 text-sm text-green-700">
                    <strong>Hành động đã thực hiện:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Phân tích và xác định nguyên nhân</li>
                      <li>Thực hiện các bước khắc phục</li>
                      <li>Kiểm tra và xác nhận kết quả</li>
                      <li>Hướng dẫn khách hàng cách tránh vấn đề tương tự</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {interaction.status === 'escalated' && (
            <div>
              <h4 className="font-medium mb-3 flex items-center text-red-600">
                <AlertCircle className="h-4 w-4 mr-2" />
                Chuyển cấp trên
              </h4>
              <Card className="border-red-200">
                <CardContent className="p-4 bg-red-50">
                  <p className="text-red-800 mb-2">
                    Vấn đề đã được chuyển lên supervisor để xử lý.
                  </p>
                  <div className="text-sm text-red-700">
                    <strong>Lý do chuyển cấp:</strong>
                    <p className="mt-1">Vượt quá thẩm quyền của agent, cần quyết định từ cấp quản lý.</p>
                    <p className="mt-2"><strong>Supervisor nhận:</strong> Manager John</p>
                    <p><strong>Thời gian chuyển:</strong> {interaction.date} {interaction.time}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button onClick={handleNavigate} className="bg-blue-600 hover:bg-blue-700">
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Đi đến tương tác này
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}