import { useState, useEffect } from "react";
import { Interaction } from './useInteractionStats';
import { useCustomer, useCustomerInteractions, useCustomerTickets, useCustomerNotes, useAddCustomerNote } from '../hooks/useCustomers';
import { useCreateTicket } from '../hooks/useTickets';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { InteractionPreview } from './InteractionPreview';
import { CoreBFSI } from './CoreBFSI';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';

import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from "sonner"; // Fix: remove version from import path
import { 
  Search, 
  Filter, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Clock,
  Tag,
  MessageCircle,
  FileText,
  AlertCircle,
  Star,
  Eye,
  ChevronRight,
  Plus,
  Edit,
  Copy,
  Check,
  Ticket,
  ExternalLink,
  User2,
  Building,
  Globe,
  Shield,
  ChevronDown,
  ChevronUp,
  Users,
  X,
  File,
  Paperclip
} from "lucide-react";

interface CustomerInfoProps {
  interaction: Interaction;
  onNavigateToInteraction?: (interactionId: string) => void;
  onViewTicket?: (ticketId: string) => void;
  defaultTab?: string;
  onCreateTicket?: (ticketData: any) => void;
}

// Mock customer data with multiple contacts
const mockCustomer = {
  id: 'CUST-001',
  name: 'Trần Thị B',
  emails: [
    { id: 1, email: 'tran.thi.b@email.com', type: 'primary', verified: true },
    { id: 2, email: 'tran.thi.b@company.com', type: 'work', verified: true },
    { id: 3, email: 'tran.backup@gmail.com', type: 'secondary', verified: false }
  ],
  phones: [
    { id: 1, phone: '0123 456 789', type: 'mobile', verified: true },
    { id: 2, phone: '028 3456 7890', type: 'office', verified: true },
    { id: 3, phone: '0987 654 321', type: 'home', verified: false }
  ],
  address: '123 Nguyễn Huệ, Q1, TP.HCM',
  level: 'VIP',
  joinDate: '15/03/2022',
  totalInteractions: 24,
  satisfaction: 4.5,
  tags: ['VIP Customer', 'Tech Support'],
  company: 'ABC Technology Solutions',
  position: 'IT Manager',
  preferredContact: 'email',
  timezone: 'Asia/Ho_Chi_Minh',
  language: 'Vietnamese'
};


export function CustomerInfo({ interaction, onNavigateToInteraction, onViewTicket, defaultTab = 'tickets', onCreateTicket }: CustomerInfoProps) {
  // Fetch customer data from API
  const customerId = interaction?.customerId as string | null;
  const { data: customer, isLoading: customerLoading } = useCustomer(customerId);
  const { data: customerInteractions = [], isLoading: interactionsLoading } = useCustomerInteractions(customerId);
  const { data: customerTickets = [], isLoading: ticketsLoading } = useCustomerTickets(customerId);
  const { data: customerNotes = [], isLoading: notesLoading } = useCustomerNotes(customerId);
  const createTicketMutation = useCreateTicket();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [previewInteraction, setPreviewInteraction] = useState<any>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [ticketSearchTerm, setTicketSearchTerm] = useState('');
  const [ticketFilter, setTicketFilter] = useState('all');
  const [historySubTab, setHistorySubTab] = useState('all');
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [newNote, setNewNote] = useState('');
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    contact: true,
    business: true,
    preferences: true
  });
  
  // State for Create Ticket View
  const [showCreateTicketForm, setShowCreateTicketForm] = useState(false);
  const [selectedTicketForView, setSelectedTicketForView] = useState<any>(null);
  const [ticketFormData, setTicketFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: '',
    department: '',
    dueDate: '',
    assignedAgent: '',
    assignedTeam: ''
  });
  
  // Ticket attachments state
  const [ticketFormAttachments, setTicketFormAttachments] = useState<File[]>([]);

  // Map API customer data to display shape, fallback to mock for missing fields
  const displayCustomer = customer ? {
    id: customer.id,
    name: customer.fullName || interaction?.customerName || 'Unknown',
    emails: [
      { id: 1, email: customer.email || '', type: 'primary', verified: true },
    ],
    phones: [
      { id: 1, phone: customer.phone || '', type: 'mobile', verified: true },
    ],
    address: customer.dynamicFields?.address || '',
    level: customer.isVip ? 'VIP' : (customer.segment || 'Standard'),
    joinDate: customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('vi-VN') : '',
    totalInteractions: customerInteractions.length,
    satisfaction: customer.satisfactionRating ?? 0,
    tags: [customer.segment, customer.isVip ? 'VIP' : ''].filter(Boolean),
    company: customer.dynamicFields?.company || customer.dynamicFields?.occupation || '',
    position: customer.dynamicFields?.position || customer.dynamicFields?.occupation || '',
    preferredContact: 'email',
    timezone: 'Asia/Ho_Chi_Minh',
    language: 'Vietnamese',
    cif: customer.cif || '',
    segment: customer.segment || '',
  } : mockCustomer;

  // Data for ticket creation
  const categories = [
    'Technical Support',
    'Account Management',
    'Billing & Payment',
    'Customer Complaint',
    'General Inquiry',
    'Product Request'
  ];

  const departments = [
    'Hỗ trợ kỹ thuật',
    'Chăm sóc khách hàng',
    'Kế toán',
    'Bán hàng',
    'Vận hành'
  ];

  const agents = [
    { id: 'agent-1', name: 'Agent Mai', status: 'available', department: 'Hỗ trợ KT' },
    { id: 'agent-2', name: 'Agent Duc', status: 'busy', department: 'Chăm sóc KH' },
    { id: 'agent-3', name: 'Agent Linh', status: 'available', department: 'Hỗ trợ KT' },
    { id: 'agent-4', name: 'Agent Tung', status: 'available', department: 'Chăm sóc KH' },
    { id: 'agent-5', name: 'Agent Hoa', status: 'away', department: 'Kế toán' }
  ];

  const teams = [
    { id: 'team-1', name: 'Tech Support Team', memberCount: 5, department: 'Hỗ trợ KT' },
    { id: 'team-2', name: 'Customer Care Team', memberCount: 8, department: 'Chăm sóc KH' },
    { id: 'team-3', name: 'Billing Team', memberCount: 4, department: 'Kế toán' },
    { id: 'team-4', name: 'Sales Team', memberCount: 6, department: 'Bán hàng' }
  ];

  // Normalize type from channel when type field is wrong (e.g. 'inbound'/'outbound')
  const normalizeInteractionType = (item: any): string => {
    const channelMap: Record<string, string> = { voice: 'call', email: 'email', chat: 'chat' };
    const validTypes = ['call', 'missed-call', 'email', 'chat'];
    if (validTypes.includes(item.type)) return item.type;
    return channelMap[item.channel] || 'call';
  };

  const filteredHistory = (customerInteractions || []).filter((item: any) => {
    const subject = (item.subject || '').toLowerCase();
    const agent = (item.assignedAgentName || item.agent || '').toLowerCase();
    const matchesSearch = subject.includes(searchTerm.toLowerCase()) || agent.includes(searchTerm.toLowerCase());
    const itemType = normalizeInteractionType(item);
    // 'call' sub-tab matches both 'call' and 'missed-call'
    const itemTabKey = itemType === 'missed-call' ? 'call' : itemType;
    const matchesFilter = selectedFilter === 'all' || itemTabKey === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredTickets = (customerTickets || []).filter((ticket: any) => {
    const titleText = ticket.title || '';
    const matchesSearch = titleText.toLowerCase().includes(ticketSearchTerm.toLowerCase()) ||
                         (ticket.displayId || '').toLowerCase().includes(ticketSearchTerm.toLowerCase()) ||
                         (ticket.category || '').toLowerCase().includes(ticketSearchTerm.toLowerCase());
    const matchesFilter = ticketFilter === 'all' || ticket.status === ticketFilter;
    return matchesSearch && matchesFilter;
  });

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'missed-call': return <Phone className="h-4 w-4 text-red-500" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'chat': return <MessageCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'waiting': return 'bg-orange-100 text-orange-800';
      case 'closed': return 'bg-muted text-foreground';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'escalated': return 'bg-red-100 text-red-800';
      default: return 'bg-muted text-foreground';
    }
  };

  const getInteractionStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Đang hoạt động';
      case 'in-progress': return 'Đang xử lý';
      case 'waiting': return 'Đang chờ';
      case 'closed': return 'Đã đóng';
      case 'resolved': return 'Đã giải quyết';
      case 'completed': return 'Hoàn thành';
      case 'escalated': return 'Chuyển cấp trên';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-blue-600';
      case 'low': return 'text-muted-foreground';
      default: return 'text-muted-foreground';
    }
  };

  const getTicketStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-muted text-foreground';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-border text-foreground/80';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'escalated': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-muted text-foreground';
      default: return 'bg-muted text-foreground';
    }
  };

  const getTicketStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'Mới';
      case 'in-progress': return 'Đang xử lý';
      case 'resolved': return 'Đã xử lý';
      case 'closed': return 'Đóng';
      case 'completed': return 'Hoàn thành';
      case 'pending': return 'Chờ xử lý';
      case 'escalated': return 'Chuyển cấp trên';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  const getTicketIcon = (classification: string) => {
    switch (classification) {
      case 'bug': return <AlertCircle className="h-4 w-4" />;
      case 'account': return <User2 className="h-4 w-4" />;
      case 'transfer': return <FileText className="h-4 w-4" />;
      case 'insurance': return <Shield className="h-4 w-4" />;
      case 'promotion': return <Star className="h-4 w-4" />;
      case 'other': return <MessageCircle className="h-4 w-4" />;
      default: return <Ticket className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (date: Date | string | undefined | null) => {
    if (!date) return '';
    if (typeof date === 'string') date = new Date(date);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Vừa xong';
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const handleCopyToClipboard = (text: string, itemId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedItem(itemId);
      setTimeout(() => setCopiedItem(null), 2000);
    });
  };

  const handleNavigateToInteraction = (interactionId: string) => {
    if (onNavigateToInteraction) {
      onNavigateToInteraction(interactionId);
    }
    setPreviewInteraction(null);
  };

  const handleViewTicket = (ticketId: string) => {
    if (onViewTicket) {
      onViewTicket(ticketId);
    }
  };

  const handleViewTicketDetail = (ticket: any) => {
    setSelectedTicketForView(ticket);
    setShowCreateTicketForm(false);
  };

  const handleBackToTicketList = () => {
    setSelectedTicketForView(null);
  };

  const handleViewTicketInteraction = (interactionId: string | null) => {
    if (interactionId && onNavigateToInteraction) {
      onNavigateToInteraction(interactionId);
    }
  };

  const handleCreateNewTicket = () => {
    // Initialize form with interaction data
    setTicketFormData({
      title: `Ticket từ tương tác: ${interaction?.subject || 'Untitled'}`,
      description: `Ticket được tạo từ tương tác ${interaction?.id}: ${interaction?.subject || 'Untitled'}`,
      priority: interaction?.priority || 'medium',
      category: '',
      department: '',
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      assignedAgent: '',
      assignedTeam: ''
    });
    setShowCreateTicketForm(true);
  };

  const handleCancelCreateTicket = () => {
    setShowCreateTicketForm(false);
    // Reset form
    setTicketFormData({
      title: '',
      description: '',
      priority: 'medium',
      category: '',
      department: '',
      dueDate: '',
      assignedAgent: '',
      assignedTeam: ''
    });
    // Reset attachments
    setTicketFormAttachments([]);
  };

  const updateTicketFormData = (field: string, value: any) => {
    setTicketFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle file attachment for ticket form
  const handleTicketFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setTicketFormAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveTicketAttachment = (index: number) => {
    setTicketFormAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext || '')) {
      return <FileText className="h-4 w-4 text-blue-500" />;
    } else if (['pdf'].includes(ext || '')) {
      return <FileText className="h-4 w-4 text-red-500" />;
    } else if (['doc', 'docx'].includes(ext || '')) {
      return <FileText className="h-4 w-4 text-blue-600" />;
    } else if (['xls', 'xlsx'].includes(ext || '')) {
      return <FileText className="h-4 w-4 text-green-600" />;
    } else {
      return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleSaveTicketFromForm = async () => {
    if (!ticketFormData.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề ticket');
      return;
    }

    if (!ticketFormData.category) {
      toast.error('Vui lòng chọn danh mục ticket');
      return;
    }

    const customerIdForTicket = customerId || customer?.id;
    if (!customerIdForTicket) {
      toast.error('Không xác định được khách hàng cho ticket này');
      return;
    }

    try {
      const result = await createTicketMutation.mutateAsync({
        title: ticketFormData.title,
        description: ticketFormData.description,
        priority: ticketFormData.priority,
        category: ticketFormData.category,
        customerId: customerIdForTicket,
        interactionId: interaction?.id,
      });

      const newTicket = { ...result, number: result.displayId };

      if (onCreateTicket) {
        onCreateTicket(newTicket);
      }

      setShowCreateTicketForm(false);

      // Reset form
      setTicketFormData({
        title: '',
        description: '',
        priority: 'medium',
        category: '',
        department: '',
        dueDate: '',
        assignedAgent: '',
        assignedTeam: ''
      });

      // Reset attachments
      setTicketFormAttachments([]);
    } catch (error) {
      // Error toast already shown by mutation onError
      console.error('Failed to save ticket:', error);
    }
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      // In a real app, this would make an API call to save the note
      console.log('Adding note:', { content: newNote, isPrivate: isPrivateNote });
      setNewNote('');
      setIsPrivateNote(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Auto-switch to ticket tab when defaultTab changes
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  if (!interaction) {
    return (
      <div className="h-full bg-background border-l border-border flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p>Chọn tương tác để xem thông tin khách hàng</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background border-l border-border flex flex-col">
      {/* Compact Customer Header */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{displayCustomer.name}</h3>
            <div className="flex items-center space-x-2">
              <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                {displayCustomer.level}
              </Badge>
              <div className="flex items-center text-xs text-muted-foreground">
                <Star className="h-3 w-3 mr-1 text-yellow-500" />
                {displayCustomer.satisfaction}
              </div>
            </div>
          </div>
        </div>
        
        {/* Quick Contact Info */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center text-muted-foreground">
            <Mail className="h-3 w-3 mr-1" />
            <span className="truncate">{displayCustomer.emails[0].email}</span>
          </div>
          <div className="flex items-center text-muted-foreground">
            <Phone className="h-3 w-3 mr-1" />
            <span>{displayCustomer.phones[0].phone}</span>
          </div>
        </div>
      </div>

      {/* Tabs Content - Fixed height and scroll issues */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="flex-shrink-0 px-4 pt-3 bg-muted/30">
            <TabsList className="grid w-full grid-cols-5 h-10">
              <TabsTrigger value="profile" className="text-sm">Hồ sơ</TabsTrigger>
              <TabsTrigger value="history" className="text-sm">Lịch sử</TabsTrigger>
              <TabsTrigger value="tickets" className="text-sm">Ticket</TabsTrigger>
              <TabsTrigger value="bfsi" className="text-sm">Truy vấn core</TabsTrigger>
              <TabsTrigger value="notes" className="text-sm">Ghi chú</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Tickets Tab - New separate tab */}
            <TabsContent value="tickets" className="mt-3 h-full flex flex-col data-[state=active]:flex">
              {selectedTicketForView ? (
                /* Ticket Detail View */
                <div className="flex-1 flex flex-col px-4 min-h-0">
                  {/* Header */}
                  <div className="flex-shrink-0 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleBackToTicketList}
                          className="h-8 px-2"
                        >
                          <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
                          Quay lại
                        </Button>
                      </div>
                      <Badge className={getTicketStatusColor(selectedTicketForView.status)}>
                        {getTicketStatusLabel(selectedTicketForView.status)}
                      </Badge>
                    </div>
                    <h3 className="flex items-center text-base font-medium">
                      <Ticket className="h-5 w-5 mr-2 text-[#155DFC]" />
                      {selectedTicketForView.displayId}
                    </h3>
                    <Separator className="mt-3" />
                  </div>

                  {/* Content - Scrollable */}
                  <div className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-0">
                    {/* Title */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Tiêu đề</Label>
                      <p className="text-sm font-medium mt-1">{selectedTicketForView.title}</p>
                    </div>

                    {/* Description */}
                    {selectedTicketForView.description && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Mô tả</Label>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{selectedTicketForView.description}</p>
                      </div>
                    )}

                    <Separator />

                    {/* Ticket Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Phân loại</Label>
                        <p className="text-sm font-medium mt-1">{selectedTicketForView.category || 'Chưa phân loại'}</p>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Trạng thái xử lý</Label>
                        <p className={`text-sm font-medium mt-1 ${
                          selectedTicketForView.status === 'new' ? 'text-muted-foreground' :
                          selectedTicketForView.status === 'in-progress' ? 'text-blue-600' :
                          selectedTicketForView.status === 'resolved' ? 'text-green-600' :
                          'text-muted-foreground'
                        }`}>
                          {selectedTicketForView.status === 'new' ? 'Mới' :
                           selectedTicketForView.status === 'in-progress' ? 'Đang xử lý' :
                           selectedTicketForView.status === 'resolved' ? 'Đã xử lý' : 'Đóng'}
                        </p>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Độ ưu tiên</Label>
                        <p className={`text-sm font-medium mt-1 ${getPriorityColor(selectedTicketForView.priority)}`}>
                          {selectedTicketForView.priority === 'urgent' ? 'Khẩn cấp' :
                           selectedTicketForView.priority === 'high' ? 'Cao' :
                           selectedTicketForView.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                        </p>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Người xử lý</Label>
                        <p className="text-sm font-medium mt-1">{selectedTicketForView.assignedAgentId ? `Agent: ${selectedTicketForView.assignedAgentId.slice(0, 8)}` : 'Chưa phân công'}</p>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Hạn xử lý</Label>
                        <p className="text-sm font-medium mt-1">
                          {selectedTicketForView.dueAt
                            ? new Date(selectedTicketForView.dueAt).toLocaleDateString('vi-VN')
                            : 'Chưa có'}
                        </p>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Ngày tạo</Label>
                        <p className="text-sm font-medium mt-1">
                          {new Date(selectedTicketForView.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Cập nhật lần cuối</Label>
                        <p className="text-sm font-medium mt-1">
                          {formatTimeAgo(selectedTicketForView.updatedAt)}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Customer Info */}
                    {selectedTicketForView.customerId && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Khách hàng
                        </h4>
                        <div className="rounded-md border border-border bg-muted/50 p-3">
                          <p className="text-xs text-muted-foreground">ID: <span className="font-mono font-medium">{selectedTicketForView.customerId}</span></p>
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {selectedTicketForView.tags && selectedTicketForView.tags.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Tags</Label>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedTicketForView.tags.map((tag: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              <Tag className="h-2 w-2 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interaction Link */}
                    {selectedTicketForView.interactionId && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Liên kết tương tác</Label>
                        <button
                          onClick={() => handleViewTicketInteraction(selectedTicketForView.interactionId)}
                          className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 hover:underline mt-1"
                        >
                          <ChevronRight className="h-3 w-3" />
                          <span>{selectedTicketForView.interactionId}</span>
                        </button>
                      </div>
                    )}

                    <Separator />

                    {/* Comments/History */}
                    {selectedTicketForView.comments && selectedTicketForView.comments.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3 flex items-center">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Ghi chú & Lịch sử ({selectedTicketForView.comments.length})
                        </h4>
                        <div className="space-y-3">
                          {selectedTicketForView.comments.map((comment: any) => (
                            <div key={comment.id} className="border-l-2 border-border pl-3">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-medium text-foreground/80">{comment.agentName || 'Agent'}</span>
                                  {comment.isInternal && (
                                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                                      Nội bộ
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatTimeAgo(comment.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">{comment.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex-shrink-0 pt-3 border-t mt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Future: Open edit mode or external ticket detail
                          if (onViewTicket) {
                            onViewTicket(selectedTicketForView.id);
                          }
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Xem đầy đủ
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Chỉnh sửa
                      </Button>
                    </div>
                  </div>
                </div>
              ) : !showCreateTicketForm ? (
                <div className="flex-1 flex flex-col px-4 min-h-0">
                  {/* Create New Ticket Button */}
                  <div className="flex-shrink-0 mb-3">
                    <Button
                      onClick={handleCreateNewTicket}
                      className="w-full bg-[#155DFC] hover:bg-[#1348D6] text-white"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Tạo ticket từ tương tác này
                    </Button>
                  </div>

                {/* Ticket Search and Filter */}
                <div className="flex-shrink-0 space-y-2 mb-3">
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        placeholder="Tìm kiếm ticket..."
                        value={ticketSearchTerm}
                        onChange={(e) => setTicketSearchTerm(e.target.value)}
                        className="pl-7 h-8 text-xs"
                      />
                    </div>
                    <Button variant="outline" size="sm" className="h-8 px-2">
                      <Filter className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Ticket Filter Tabs */}
                  <Tabs value={ticketFilter} onValueChange={setTicketFilter}>
                    <TabsList className="grid w-full grid-cols-5 h-8">
                      <TabsTrigger value="all" className="text-xs">Tất cả</TabsTrigger>
                      <TabsTrigger value="pending" className="text-xs">Chờ</TabsTrigger>
                      <TabsTrigger value="in-progress" className="text-xs">Đang xử lý</TabsTrigger>
                      <TabsTrigger value="escalated" className="text-xs">Chuyển lên</TabsTrigger>
                      <TabsTrigger value="completed" className="text-xs">Hoàn thành</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Tickets List - Scrollable */}
                <div className="flex-1 overflow-y-auto space-y-2 pb-4 min-h-0">
                  {filteredTickets.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Ticket className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">Không tìm thấy ticket nào</p>
                    </div>
                  ) : (
                    filteredTickets.map((ticket: any) => (
                      <Card 
                        key={ticket.id} 
                        className="cursor-pointer hover:shadow-sm border-l-4 border-l-transparent hover:border-l-purple-500 transition-all"
                        onClick={() => handleViewTicketDetail(ticket)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-start space-x-2 flex-1 min-w-0">
                              <div className={`p-1 rounded ${
                                ticket.category === 'bug' ? 'bg-red-100' :
                                ticket.category === 'account' ? 'bg-blue-100' :
                                ticket.category === 'transfer' ? 'bg-green-100' :
                                ticket.category === 'insurance' ? 'bg-purple-100' :
                                ticket.category === 'promotion' ? 'bg-yellow-100' : 'bg-muted'
                              }`}>
                                {getTicketIcon(ticket.category)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center flex-wrap gap-1 mb-1">
                                  <p className="text-xs font-medium text-muted-foreground">{ticket.displayId}</p>
                                  <Badge className={getTicketStatusColor(ticket.status)}>
                                    {getTicketStatusLabel(ticket.status)}
                                  </Badge>
                                  {ticket.category && (
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                                      {ticket.category}
                                    </Badge>
                                  )}
                                </div>
                                <p className="font-medium text-sm truncate mb-1">{ticket.title}</p>
                                <p className="text-xs text-muted-foreground">{ticket.assignedAgentId ? `Agent: ${ticket.assignedAgentId.slice(0, 8)}` : 'Chưa phân công'}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  handleViewTicket(ticket.id);
                                }}
                                className="h-6 w-6 p-0"
                                title="Xem ticket ở tab riêng"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-3">
                              <span className={`${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority === 'urgent' ? 'Khẩn cấp' :
                                 ticket.priority === 'high' ? 'Cao' :
                                 ticket.priority === 'medium' ? 'TB' : 'Thấp'}
                              </span>
                            </div>
                            <div className="flex items-center text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>{formatTimeAgo(ticket.updatedAt)}</span>
                            </div>
                          </div>

                          {/* Connection to interaction */}
                          {ticket.interactionId && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <button
                                onClick={() => handleViewTicketInteraction(ticket.interactionId)}
                                className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <ChevronRight className="h-3 w-3" />
                                <span>Từ tương tác: {ticket.interactionId}</span>
                              </button>
                            </div>
                          )}

                          {/* Due date warning */}
                          {ticket.status !== 'completed' && ticket.dueAt && new Date() > new Date(ticket.dueAt) && (
                            <div className="mt-2 flex items-center space-x-1 text-xs text-red-600">
                              <AlertCircle className="h-3 w-3" />
                              <span>Quá hạn: {formatTimeAgo(new Date(ticket.dueAt))}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col px-4 min-h-0">
                <div className="flex-shrink-0 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="flex items-center text-base font-medium">
                      <Ticket className="h-5 w-5 mr-2 text-[#155DFC]" />
                      Tạo Ticket Mới
                    </h3>
                    <Button variant="ghost" size="sm" onClick={handleCancelCreateTicket} className="h-8 w-8 p-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Separator />
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-0">
                  <div className="space-y-2">
                    <Label htmlFor="ticket-title">Tiêu đề <span className="text-red-500">*</span></Label>
                    <Input id="ticket-title" value={ticketFormData.title} onChange={(e) => updateTicketFormData('title', e.target.value)} placeholder="Nhập tiêu đề ticket..." className="w-full" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ticket-description">Mô tả</Label>
                    <Textarea id="ticket-description" rows={4} value={ticketFormData.description} onChange={(e) => updateTicketFormData('description', e.target.value)} placeholder="Mô tả chi tiết vấn đề..." className="resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="ticket-priority">Độ ưu tiên</Label>
                      <Select value={ticketFormData.priority} onValueChange={(value: string) => updateTicketFormData('priority', value)}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Chọn độ ưu tiên" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Thấp</SelectItem>
                          <SelectItem value="medium">Trung bình</SelectItem>
                          <SelectItem value="high">Cao</SelectItem>
                          <SelectItem value="urgent">Khẩn cấp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticket-category">Danh mục <span className="text-red-500">*</span></Label>
                      <Select value={ticketFormData.category} onValueChange={(value: string) => updateTicketFormData('category', value)}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
                        <SelectContent>{categories.map((category) => (<SelectItem key={category} value={category}>{category}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="ticket-department">Phòng ban</Label>
                      <Select value={ticketFormData.department} onValueChange={(value: string) => updateTicketFormData('department', value)}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
                        <SelectContent>{departments.map((department) => (<SelectItem key={department} value={department}>{department}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticket-due">Hạn xử lý</Label>
                      <Input id="ticket-due" type="date" value={ticketFormData.dueDate} onChange={(e) => updateTicketFormData('dueDate', e.target.value)} className="w-full" />
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="flex items-center text-sm font-medium"><Users className="h-4 w-4 mr-2" />Phân công xử lý</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="ticket-agent" className="text-xs">Chọn Agent</Label>
                        <Select value={ticketFormData.assignedAgent} onValueChange={(value: string) => {updateTicketFormData('assignedAgent', value); if (value) updateTicketFormData('assignedTeam', '');}}>
                          <SelectTrigger className="w-full h-9 text-xs"><SelectValue placeholder="Chọn agent" /></SelectTrigger>
                          <SelectContent>{agents.map((agent) => (<SelectItem key={agent.id} value={agent.id}><div className="flex items-center justify-between w-full"><span className="text-xs">{agent.name}</span></div></SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ticket-team" className="text-xs">Hoặc chọn Team</Label>
                        <Select value={ticketFormData.assignedTeam} onValueChange={(value: string) => {updateTicketFormData('assignedTeam', value); if (value) updateTicketFormData('assignedAgent', '');}}>
                          <SelectTrigger className="w-full h-9 text-xs"><SelectValue placeholder="Chọn team" /></SelectTrigger>
                          <SelectContent>{teams.map((team) => (<SelectItem key={team.id} value={team.id}><div className="flex items-center justify-between w-full"><span className="text-xs">{team.name}</span></div></SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* File Attachments */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center space-x-2 text-xs">
                        <Paperclip className="h-4 w-4" />
                        <span>Đính kèm file</span>
                      </Label>
                      <input
                        type="file"
                        id="customer-ticket-file-upload"
                        multiple
                        onChange={handleTicketFileSelect}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('customer-ticket-file-upload')?.click()}
                        className="h-7 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Chọn file
                      </Button>
                    </div>

                    {/* Attachment Preview List */}
                    {ticketFormAttachments.length > 0 && (
                      <div className="space-y-2">
                        {ticketFormAttachments.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 border border-border rounded-md bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              {getFileIcon(file.name)}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveTicketAttachment(index)}
                              className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600 flex-shrink-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {ticketFormAttachments.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2 border border-dashed border-border rounded-md">
                        Chưa có file đính kèm
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 pt-3 border-t mt-3">
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={handleCancelCreateTicket} className="flex-1" size="sm"><X className="h-4 w-4 mr-1" />Hủy</Button>
                    <Button onClick={handleSaveTicketFromForm} className="flex-1 bg-[#155DFC] hover:bg-[#1348D6]" size="sm" disabled={createTicketMutation.isPending}><Check className="h-4 w-4 mr-1" />{createTicketMutation.isPending ? 'Đang tạo...' : 'Tạo Ticket'}</Button>
                  </div>
                </div>
              </div>
            )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="mt-3 h-full flex flex-col data-[state=active]:flex">
              {/* Sub-tabs for history */}
              <div className="flex-shrink-0 px-4 mb-3">
                <Tabs value={historySubTab} onValueChange={setHistorySubTab}>
                  <TabsList className="grid w-full grid-cols-4 h-8">
                    <TabsTrigger value="all" className="text-xs">Tất cả</TabsTrigger>
                    <TabsTrigger value="call" className="text-xs">Call</TabsTrigger>
                    <TabsTrigger value="chat" className="text-xs">Chat</TabsTrigger>
                    <TabsTrigger value="email" className="text-xs">Email</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* History List - Scrollable */}
              <div className="flex-1 flex flex-col px-4 min-h-0">
                {/* Search and Filter for Interactions */}
                <div className="flex-shrink-0 space-y-2 mb-3">
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        placeholder="Tìm kiếm tương tác..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-7 h-8 text-xs"
                      />
                    </div>
                    <Button variant="outline" size="sm" className="h-8 px-2">
                      <Filter className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* History List - Scrollable */}
                <div className="flex-1 overflow-y-auto space-y-2 pb-4 min-h-0">
                  {interactionsLoading ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Đang tải lịch sử...</p>
                  ) : filteredHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Không có lịch sử tương tác</p>
                  ) : null}
                  {filteredHistory
                    .filter((item: any) => {
                      if (historySubTab === 'all') return true;
                      const itemType = normalizeInteractionType(item);
                      const itemTabKey = itemType === 'missed-call' ? 'call' : itemType;
                      return itemTabKey === historySubTab;
                    })
                    .map((item: any) => {
                      const itemType = normalizeInteractionType(item);
                      return (
                    <Card
                      key={item.id}
                      className="group cursor-pointer hover:shadow-sm border-l-4 border-l-transparent hover:border-l-blue-500 transition-all"
                      onClick={() => setPreviewInteraction(item)}
                      data-interaction-id={item.id}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className={`p-1 rounded ${
                              itemType === 'call' || itemType === 'missed-call' ? 'bg-blue-100' :
                              itemType === 'email' ? 'bg-orange-100' : 'bg-green-100'
                            }`}>
                              {getInteractionIcon(itemType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.subject || item.displayId}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.assignedAgentName || item.agent || 'Chưa phân công'}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(item.status)}>
                              {getInteractionStatusLabel(item.status)}
                            </Badge>
                            <span className={`${getPriorityColor(item.priority)}`}>
                              {item.priority === 'urgent' ? 'Khẩn cấp' :
                               item.priority === 'high' ? 'Cao' :
                               item.priority === 'medium' ? 'TB' : 'Thấp'}
                            </span>
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>{formatTimeAgo(item.createdAt || item.date)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );})}
                </div>
              </div>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile" className="mt-3 h-full flex flex-col data-[state=active]:flex">
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="space-y-4">
                  
                  {/* Basic Information */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>Thông tin cơ bản</span>
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSection('basic')}
                          className="h-6 w-6 p-0"
                        >
                          {expandedSections.basic ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                          }
                        </Button>
                      </div>
                    </CardHeader>
                    {expandedSections.basic && (
                      <CardContent className="pt-0 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Tên khách hàng</p>
                            <p className="font-medium">{displayCustomer.name}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Mức độ</p>
                            <Badge className="bg-yellow-100 text-yellow-800">
                              {displayCustomer.level}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Ngày tham gia</p>
                            <p>{displayCustomer.joinDate}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Tổng tương tác</p>
                            <p>{displayCustomer.totalInteractions}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Đánh giá hài lòng</p>
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span>{displayCustomer.satisfaction}/5</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Tags</p>
                            <div className="flex flex-wrap gap-1">
                              {displayCustomer.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Contact Information */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center space-x-2">
                          <Phone className="h-4 w-4" />
                          <span>Thông tin liên lạc</span>
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSection('contact')}
                          className="h-6 w-6 p-0"
                        >
                          {expandedSections.contact ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                          }
                        </Button>
                      </div>
                    </CardHeader>
                    {expandedSections.contact && (
                      <CardContent className="pt-0 space-y-4">
                        {/* Email Addresses */}
                        <div>
                          <p className="text-muted-foreground text-xs mb-2">Email</p>
                          <div className="space-y-2">
                            {displayCustomer.emails.map((email) => (
                              <div key={email.id} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm">{email.email}</span>
                                  <Badge 
                                    variant={email.type === 'primary' ? 'default' : 'outline'} 
                                    className="text-xs"
                                  >
                                    {email.type}
                                  </Badge>
                                  {email.verified && (
                                    <Shield className="h-3 w-3 text-green-500" />
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopyToClipboard(email.email, `email-${email.id}`)}
                                  className="h-6 w-6 p-0"
                                >
                                  {copiedItem === `email-${email.id}` ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Phone Numbers */}
                        <div>
                          <p className="text-muted-foreground text-xs mb-2">Số điện thoại</p>
                          <div className="space-y-2">
                            {displayCustomer.phones.map((phone) => (
                              <div key={phone.id} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm">{phone.phone}</span>
                                  <Badge 
                                    variant={phone.type === 'mobile' ? 'default' : 'outline'} 
                                    className="text-xs"
                                  >
                                    {phone.type}
                                  </Badge>
                                  {phone.verified && (
                                    <Shield className="h-3 w-3 text-green-500" />
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopyToClipboard(phone.phone, `phone-${phone.id}`)}
                                  className="h-6 w-6 p-0"
                                >
                                  {copiedItem === `phone-${phone.id}` ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Address */}
                        <div>
                          <p className="text-muted-foreground text-xs mb-2">Địa chỉ</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{displayCustomer.address}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyToClipboard(displayCustomer.address, 'address')}
                              className="h-6 w-6 p-0"
                            >
                              {copiedItem === 'address' ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Business Information */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center space-x-2">
                          <Building className="h-4 w-4" />
                          <span>Thông tin doanh nghiệp</span>
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSection('business')}
                          className="h-6 w-6 p-0"
                        >
                          {expandedSections.business ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                          }
                        </Button>
                      </div>
                    </CardHeader>
                    {expandedSections.business && (
                      <CardContent className="pt-0 space-y-3">
                        <div className="grid grid-cols-1 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Công ty</p>
                            <p className="font-medium">{displayCustomer.company}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Chức vụ</p>
                            <p>{displayCustomer.position}</p>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Preferences */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center space-x-2">
                          <Globe className="h-4 w-4" />
                          <span>Tùy chọn</span>
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSection('preferences')}
                          className="h-6 w-6 p-0"
                        >
                          {expandedSections.preferences ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                          }
                        </Button>
                      </div>
                    </CardHeader>
                    {expandedSections.preferences && (
                      <CardContent className="pt-0 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Kênh liên lạc ưu tiên</p>
                            <p className="capitalize">{displayCustomer.preferredContact}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Múi giờ</p>
                            <p>{displayCustomer.timezone}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Ngôn ngữ</p>
                            <p>{displayCustomer.language}</p>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Truy vấn core Tab */}
            <TabsContent value="bfsi" className="mt-3 h-full flex flex-col data-[state=active]:flex">
              <div className="flex-1 overflow-hidden">
                <CoreBFSI customerId={displayCustomer.id} />
              </div>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-3 h-full flex flex-col data-[state=active]:flex">
              <div className="flex-1 flex flex-col px-4 min-h-0">
                {/* Add New Note */}
                <div className="flex-shrink-0 mb-4">
                  <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                    <Textarea
                      placeholder="Thêm ghi chú mới..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="min-h-[80px] text-sm"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="private-note"
                          checked={isPrivateNote}
                          onChange={(e) => setIsPrivateNote(e.target.checked)}
                          className="rounded"
                        />
                        <label htmlFor="private-note" className="text-xs text-muted-foreground cursor-pointer">
                          Ghi chú riêng tư
                        </label>
                      </div>
                      <Button
                        onClick={handleAddNote}
                        disabled={!newNote.trim()}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Thêm ghi chú
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Notes List */}
                <div className="flex-1 overflow-y-auto space-y-3 pb-4 min-h-0">
                  {customerNotes.map((note: any) => (
                    <Card key={note.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <FileText className="h-3 w-3 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">{note.author || note.createdBy || ''}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatTimeAgo(note.timestamp || note.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            {note.isPrivate && (
                              <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                                <Eye className="h-3 w-3 mr-1" />
                                Riêng tư
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-foreground/80 mb-2">{note.content}</p>
                        
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {note.tags.map((tag: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                <Tag className="h-2 w-2 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Preview Interaction Modal */}
      {previewInteraction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-background rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <InteractionPreview
              interaction={previewInteraction}
              onClose={() => setPreviewInteraction(null)}
              onNavigateToInteraction={handleNavigateToInteraction}
            />
          </div>
        </div>
      )}
    </div>
  );
}