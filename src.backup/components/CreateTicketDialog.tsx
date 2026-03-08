import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, 
  Plus, 
  Edit, 
  Check, 
  Calendar, 
  User, 
  Tag, 
  Clock,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MessageSquare,
  Banknote,
  CreditCard,
  Wallet,
  Building,
  UserCircle,
  MapPin,
  PhoneCall
} from "lucide-react";
import { toast } from "sonner@2.0.3";

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interaction?: any;
  contact?: any;
  queryObject?: any; // thêm prop cho đối tượng truy vấn
}

export function CreateTicketDialog({ open, onOpenChange, interaction, contact, queryObject }: CreateTicketDialogProps) {
  const [mode, setMode] = useState<'edit' | 'view'>('edit'); // edit or view mode
  const [savedTicket, setSavedTicket] = useState<any>(null); // saved ticket data
  const [ticketData, setTicketData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: '',
    department: '',
    dueDate: ''
  });

  // Collapsible states for preview sections
  const [expandedInteraction, setExpandedInteraction] = useState(true);
  const [expandedContact, setExpandedContact] = useState(true);
  const [expandedQuery, setExpandedQuery] = useState(true);

  const categories = [
    'Khiếu nại dịch vụ',
    'Yêu cầu kỹ thuật',
    'Thay đổi thông tin',
    'Bảo hành sản phẩm',
    'Tài chính - Thanh toán',
    'Khác'
  ];

  const departments = [
    'Customer Service',
    'Technical Support',
    'Billing',
    'Sales',
    'Product Team'
  ];

  const handleCreate = () => {
    if (!ticketData.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề ticket');
      return;
    }
    
    if (!ticketData.description.trim()) {
      toast.error('Vui lòng nhập mô tả chi tiết');
      return;
    }

    const newTicket = {
      ...ticketData,
      id: `TKT-${Date.now()}`,
      number: `TKT-${Date.now()}`,
      status: 'in-progress',
      interactionId: interaction?.id,
      customerName: interaction?.customerName,
      createdBy: 'Agent Tung',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('Creating ticket:', newTicket);
    
    // Save ticket and switch to view mode
    setSavedTicket(newTicket);
    setMode('view');
    toast.success('Ticket đã được tạo thành công');
  };

  const handleEdit = () => {
    setMode('edit');
  };

  const handleClose = () => {
    // Reset form and state
    setTicketData({
      title: '',
      description: '',
      priority: 'medium',
      category: '',
      department: '',
      dueDate: ''
    });
    setSavedTicket(null);
    setMode('edit');
    onOpenChange(false);
  };

  const updateTicketData = (field: string, value: string) => {
    setTicketData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-muted-foreground';
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

  // Helper function to get interaction icon
  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'call':
        return Phone;
      case 'email':
        return Mail;
      case 'chat':
        return MessageSquare;
      default:
        return FileText;
    }
  };

  // Helper function to get query object icon
  const getQueryObjectIcon = (type: string) => {
    switch (type) {
      case 'loan':
        return Banknote;
      case 'card':
        return CreditCard;
      case 'account':
        return Wallet;
      case 'savings':
        return Building;
      default:
        return FileText;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Tạo Ticket mới' : 'Chi tiết Ticket'}
          </DialogTitle>
          {mode === 'edit' && (
            <DialogDescription>
              Tạo ticket để theo dõi và xử lý yêu cầu của khách hàng
            </DialogDescription>
          )}
        </DialogHeader>
        
        {mode === 'view' && savedTicket ? (
          /* View Mode - Ticket Detail */
          <div className="flex-1 overflow-y-auto py-4">
            <div className="space-y-4 px-1">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <Badge className="bg-blue-100 text-blue-800">
                  <Check className="h-3 w-3 mr-1" />
                  Đã tạo thành công
                </Badge>
                <span className="text-xs text-muted-foreground">{savedTicket.number}</span>
              </div>

              <Separator />

              {/* Interaction Info - Moved to top */}
              {interaction && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2 text-sm mb-2">
                    <span className="font-medium text-blue-900">Từ tương tác:</span>
                    <Badge className={`${
                      interaction.type === 'call' ? 'bg-blue-100 text-blue-800' :
                      interaction.type === 'email' ? 'bg-orange-100 text-orange-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {interaction.type === 'call' ? 'Cuộc gọi' :
                       interaction.type === 'email' ? 'Email' : 'Chat'}
                    </Badge>
                    <span className="text-blue-700">{interaction.customerName}</span>
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <Label className="text-xs text-muted-foreground">Tiêu đề ticket *</Label>
                <p className="text-sm font-medium mt-1">{savedTicket.title}</p>
              </div>

              {/* Ticket Info Grid - Category & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Danh mục</Label>
                  <p className="text-sm font-medium mt-1">{savedTicket.category || 'Chưa chọn'}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Độ ưu tiên</Label>
                  <p className={`text-sm font-medium mt-1 ${getPriorityColor(savedTicket.priority)}`}>
                    {getPriorityLabel(savedTicket.priority)}
                  </p>
                </div>
              </div>

              {/* Department & Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Bộ phận xử lý</Label>
                  <p className="text-sm font-medium mt-1">{savedTicket.department || 'Chưa chọn'}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Hạn xử lý</Label>
                  <p className="text-sm font-medium mt-1">
                    {savedTicket.dueDate 
                      ? new Date(savedTicket.dueDate).toLocaleDateString('vi-VN')
                      : 'Chưa đặt'}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-xs text-muted-foreground">Mô tả chi tiết *</Label>
                <p className="text-sm mt-1 whitespace-pre-wrap text-foreground/80 bg-muted/50 p-3 rounded-lg border">
                  {savedTicket.description}
                </p>
              </div>

              <Separator />

              {/* Auto-filled info from interaction */}
              {interaction && (
                <div className="bg-muted/50 p-3 rounded-lg border">
                  <h4 className="font-medium text-sm mb-2">Thông tin từ tương tác:</h4>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      <strong>Khách hàng:</strong> {interaction.customerName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Nội dung:</strong> {interaction.subject}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Thời gian:</strong> {interaction.time}
                    </p>
                  </div>
                </div>
              )}

              {/* Additional Info - Created By & Created At */}
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Người tạo:</span>
                    <p className="font-medium mt-0.5">{savedTicket.createdBy}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ngày tạo:</span>
                    <p className="font-medium mt-0.5">
                      {new Date(savedTicket.createdAt).toLocaleDateString('vi-VN')} {new Date(savedTicket.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Trạng thái:</span>
                    <p className="font-medium mt-0.5">Đang xử lý</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ID Ticket:</span>
                    <p className="font-medium mt-0.5">{savedTicket.id}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Edit Mode - Create/Edit Form */
          <div className="flex-1 overflow-y-auto py-4">
            <div className="space-y-3 px-1">
              
              {/* === SECTION 1: Đối tượng liên quan === */}
              <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-2">
                <h3 className="text-xs font-medium text-blue-900 mb-2 flex items-center">
                  <FileText className="h-3 w-3 mr-1" />
                  Đối tượng liên quan
                </h3>
                <div className="space-y-2">
                  
                  {/* Interaction Preview */}
                  {interaction && (
                    <Card className="border-[#155DFC]/30">
                      <CardContent className="p-2">
                        <button
                          onClick={() => setExpandedInteraction(!expandedInteraction)}
                          className="w-full flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            {(() => {
                              const Icon = getInteractionIcon(interaction.type);
                              return <Icon className="h-4 w-4 text-[#155DFC]" />;
                            })()}
                            <span className="font-medium text-[#155DFC]">Tương tác gốc</span>
                            <Badge className={`text-xs ${
                              interaction.type === 'call' ? 'bg-blue-100 text-blue-800' :
                              interaction.type === 'email' ? 'bg-orange-100 text-orange-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {interaction.type === 'call' ? 'Cuộc gọi' :
                               interaction.type === 'email' ? 'Email' : 'Chat'}
                            </Badge>
                          </div>
                          {expandedInteraction ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        
                        {expandedInteraction && (
                          <div className="mt-2 pt-2 border-t space-y-1">
                            <div className="text-xs">
                              <span className="text-muted-foreground">Chủ đề:</span>
                              <p className="font-medium mt-0.5">{interaction.subject || 'Không có tiêu đề'}</p>
                            </div>
                            {interaction.type === 'call' && (
                              <>
                                <div className="text-xs">
                                  <span className="text-muted-foreground">Thời lượng:</span>
                                  <p className="font-medium mt-0.5">{interaction.duration || 'N/A'}</p>
                                </div>
                                <div className="text-xs">
                                  <span className="text-muted-foreground">Trạng thái:</span>
                                  <p className="font-medium mt-0.5">{interaction.status || 'completed'}</p>
                                </div>
                              </>
                            )}
                            {interaction.type === 'email' && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">From:</span>
                                <p className="font-medium mt-0.5">{interaction.from || interaction.customerName}</p>
                              </div>
                            )}
                            {interaction.type === 'chat' && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">Kênh:</span>
                                <p className="font-medium mt-0.5">{interaction.channel || 'Web Chat'}</p>
                              </div>
                            )}
                            <div className="text-xs">
                              <span className="text-muted-foreground">Thời gian:</span>
                              <p className="font-medium mt-0.5">{interaction.time}</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Contact Preview */}
                  {contact && (
                    <Card className="border-purple-300">
                      <CardContent className="p-2">
                        <button
                          onClick={() => setExpandedContact(!expandedContact)}
                          className="w-full flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <UserCircle className="h-4 w-4 text-purple-600" />
                            <span className="font-medium text-purple-600">Liên hệ</span>
                          </div>
                          {expandedContact ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        
                        {expandedContact && (
                          <div className="mt-2 pt-2 border-t space-y-1">
                            <div className="text-xs">
                              <span className="text-muted-foreground">Tên:</span>
                              <p className="font-medium mt-0.5">{contact.name || 'N/A'}</p>
                            </div>
                            <div className="text-xs">
                              <span className="text-muted-foreground">CIF:</span>
                              <p className="font-medium mt-0.5 font-mono">{contact.cif || 'N/A'}</p>
                            </div>
                            {contact.phone && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">SĐT:</span>
                                <p className="font-medium mt-0.5 font-mono">{contact.phone}</p>
                              </div>
                            )}
                            {contact.email && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">Email:</span>
                                <p className="font-medium mt-0.5">{contact.email}</p>
                              </div>
                            )}
                            {contact.segment && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">Phân khúc:</span>
                                <p className="font-medium mt-0.5">{contact.segment}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Query Object Preview */}
                  {queryObject && (
                    <Card className="border-amber-300">
                      <CardContent className="p-2">
                        <button
                          onClick={() => setExpandedQuery(!expandedQuery)}
                          className="w-full flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            {(() => {
                              const Icon = getQueryObjectIcon(queryObject.type);
                              return <Icon className="h-4 w-4 text-amber-600" />;
                            })()}
                            <span className="font-medium text-amber-600">Thông tin truy vấn</span>
                            <Badge className="text-xs bg-amber-100 text-amber-800">
                              {queryObject.type === 'loan' ? 'Khoản vay' :
                               queryObject.type === 'card' ? 'Thẻ' :
                               queryObject.type === 'account' ? 'Tài khoản' :
                               queryObject.type === 'savings' ? 'Tiết kiệm' : 'Khác'}
                            </Badge>
                          </div>
                          {expandedQuery ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        
                        {expandedQuery && (
                          <div className="mt-2 pt-2 border-t space-y-1">
                            <div className="text-xs">
                              <span className="text-muted-foreground">Tên sản phẩm:</span>
                              <p className="font-medium mt-0.5">{queryObject.productName || 'N/A'}</p>
                            </div>
                            <div className="text-xs">
                              <span className="text-muted-foreground">Mã sản phẩm:</span>
                              <p className="font-medium mt-0.5 font-mono">{queryObject.productCode || 'N/A'}</p>
                            </div>
                            
                            {/* Specific fields based on type */}
                            {queryObject.type === 'loan' && (
                              <>
                                {queryObject.currentBalance && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Dư nợ:</span>
                                    <p className="font-medium mt-0.5 text-red-600">
                                      {formatCurrency(queryObject.currentBalance)}
                                    </p>
                                  </div>
                                )}
                                {queryObject.monthlyPayment && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Trả hàng tháng:</span>
                                    <p className="font-medium mt-0.5">
                                      {formatCurrency(queryObject.monthlyPayment)}
                                    </p>
                                  </div>
                                )}
                              </>
                            )}
                            
                            {queryObject.type === 'card' && (
                              <>
                                {queryObject.creditLimit && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Hạn mức:</span>
                                    <p className="font-medium mt-0.5">
                                      {formatCurrency(queryObject.creditLimit)}
                                    </p>
                                  </div>
                                )}
                                {queryObject.availableBalance && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Khả dụng:</span>
                                    <p className="font-medium mt-0.5 text-green-600">
                                      {formatCurrency(queryObject.availableBalance)}
                                    </p>
                                  </div>
                                )}
                              </>
                            )}
                            
                            {queryObject.type === 'account' && (
                              <>
                                {queryObject.balance && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Số dư:</span>
                                    <p className="font-medium mt-0.5 text-green-600">
                                      {formatCurrency(queryObject.balance)}
                                    </p>
                                  </div>
                                )}
                                {queryObject.accountType && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Loại TK:</span>
                                    <p className="font-medium mt-0.5">{queryObject.accountType}</p>
                                  </div>
                                )}
                              </>
                            )}
                            
                            {queryObject.type === 'savings' && (
                              <>
                                {queryObject.principal && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Số tiền gốc:</span>
                                    <p className="font-medium mt-0.5 text-blue-600">
                                      {formatCurrency(queryObject.principal)}
                                    </p>
                                  </div>
                                )}
                                {queryObject.interestRate && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Lãi suất:</span>
                                    <p className="font-medium mt-0.5 text-green-600">
                                      {queryObject.interestRate}% / năm
                                    </p>
                                  </div>
                                )}
                              </>
                            )}
                            
                            {queryObject.status && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">Trạng thái:</span>
                                <p className="font-medium mt-0.5">{queryObject.status}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  
                </div>
              </div>

              <Separator className="my-3" />

              {/* === SECTION 2: Thông tin ticket === */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground/80 flex items-center">
                  <Edit className="h-4 w-4 mr-2 text-[#155DFC]" />
                  Thông tin ticket
                </h3>

          {/* Title */}
          <div>
            <Label>Tiêu đề ticket *</Label>
            <Input
              placeholder="Mô tả ngắn gọn vấn đề..."
              value={ticketData.title}
              onChange={(e) => updateTicketData('title', e.target.value)}
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Danh mục</Label>
              <Select value={ticketData.category} onValueChange={(value) => updateTicketData('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Độ ưu tiên</Label>
              <Select value={ticketData.priority} onValueChange={(value) => updateTicketData('priority', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Thấp</SelectItem>
                  <SelectItem value="medium">Trung bình</SelectItem>
                  <SelectItem value="high">Cao</SelectItem>
                  <SelectItem value="urgent">Khẩn cấp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Department & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Bộ phận xử lý</Label>
              <Select value={ticketData.department} onValueChange={(value) => updateTicketData('department', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn bộ phận" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Hạn xử lý</Label>
              <Input
                type="date"
                value={ticketData.dueDate}
                onChange={(e) => updateTicketData('dueDate', e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label>Mô tả chi tiết *</Label>
            <Textarea
              placeholder="Mô tả chi tiết vấn đề, yêu cầu của khách hàng..."
              value={ticketData.description}
              onChange={(e) => updateTicketData('description', e.target.value)}
              rows={4}
            />
          </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {mode === 'view' ? (
            /* View Mode Buttons */
            <>
              <Button variant="outline" onClick={handleClose}>
                Đóng
              </Button>
              <Button onClick={handleEdit} className="bg-[#155DFC] hover:bg-[#1348D6]">
                <Edit className="h-4 w-4 mr-2" />
                Chỉnh sửa
              </Button>
            </>
          ) : (
            /* Edit Mode Buttons */
            <>
              <Button variant="outline" onClick={handleClose}>
                Hủy
              </Button>
              <Button 
                onClick={handleCreate}
                disabled={!ticketData.title || !ticketData.description}
                className="bg-[#155DFC] hover:bg-[#1348D6]"
              >
                <FileText className="h-4 w-4 mr-2" />
                Tạo Ticket
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}