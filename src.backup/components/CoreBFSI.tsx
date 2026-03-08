import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw,
  CreditCard,
  DollarSign,
  Shield,
  FileText,
  Eye,
  Lock,
  Unlock,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  Info,
  User,
  Phone,
  Mail,
  TrendingUp,
  FileX,
  Upload,
  Download,
  Plus,
  Search,
  Filter,
  Edit
} from 'lucide-react';

interface CoreBFSIProps {
  customerId: string;
}

// Mock BFSI data
const mockBFSIData = {
  cards: [
    {
      id: 'CARD-001',
      number: '**** **** **** 1234',
      type: 'Tín dụng',
      status: 'active',
      creditLimit: 50000000,
      currentBalance: 12500000,
      lastStatementDate: '2025-07-15',
      expiryDate: '2027-12-31',
      cardType: 'Visa Gold'
    },
    {
      id: 'CARD-002', 
      number: '**** **** **** 5678',
      type: 'Ghi nợ',
      status: 'blocked',
      creditLimit: 0,
      currentBalance: 2500000,
      lastStatementDate: '2025-07-20',
      expiryDate: '2026-08-31',
      cardType: 'Mastercard Classic'
    }
  ],
  loans: [
    {
      id: 'LOAN-001',
      contractNumber: 'LD2024001234',
      loanAmount: 800000000,
      remainingAmount: 650000000,
      interestRate: 8.5,
      term: 240, // months
      nextPaymentDate: '2025-08-15',
      status: 'active',
      loanType: 'Thế chấp nhà'
    },
    {
      id: 'LOAN-002',
      contractNumber: 'LD2023005678',
      loanAmount: 200000000,
      remainingAmount: 15000000,
      interestRate: 12.5,
      term: 60,
      nextPaymentDate: '2025-08-10',
      status: 'overdue',
      loanType: 'Tiêu dùng'
    }
  ],
  insurance: [
    {
      id: 'INS-001',
      contractNumber: 'BH2024001',
      insuranceType: 'Bảo hiểm xe',
      effectiveDate: '2024-01-01',
      expiryDate: '2024-12-31',
      premium: 5500000,
      status: 'expired',
      coverageAmount: 500000000
    },
    {
      id: 'INS-002',
      contractNumber: 'BH2025002',
      insuranceType: 'Bảo hiểm sức khỏe',
      effectiveDate: '2025-01-01',
      expiryDate: '2025-12-31',
      premium: 8000000,
      status: 'active',
      coverageAmount: 1000000000
    }
  ],
  claims: [
    {
      id: 'CLAIM-001',
      claimNumber: 'CL2025001',
      submissionDate: '2025-07-20',
      status: 'processing',
      claimAmount: 15000000,
      approvedAmount: 0,
      claimType: 'Tai nạn xe',
      insuranceContract: 'BH2024001'
    },
    {
      id: 'CLAIM-002',
      claimNumber: 'CL2025002',
      submissionDate: '2025-06-15',
      status: 'approved',
      claimAmount: 25000000,
      approvedAmount: 20000000,
      claimType: 'Điều trị y tế',
      insuranceContract: 'BH2025002'
    }
  ]
};

export function CoreBFSI({ customerId }: CoreBFSIProps) {
  const [loading, setLoading] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [confirmDialog, setConfirmDialog] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const handleRefresh = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const getStatusColor = (status: string, type: string) => {
    if (type === 'card') {
      switch (status) {
        case 'active': return 'bg-green-100 text-green-800';
        case 'blocked': return 'bg-red-100 text-red-800';
        case 'expired': return 'bg-muted text-foreground';
        default: return 'bg-muted text-foreground';
      }
    } else if (type === 'loan') {
      switch (status) {
        case 'active': return 'bg-green-100 text-green-800';
        case 'overdue': return 'bg-red-100 text-red-800';
        case 'completed': return 'bg-blue-100 text-blue-800';
        default: return 'bg-muted text-foreground';
      }
    } else if (type === 'insurance') {
      switch (status) {
        case 'active': return 'bg-green-100 text-green-800';
        case 'expired': return 'bg-red-100 text-red-800';
        case 'cancelled': return 'bg-muted text-foreground';
        default: return 'bg-muted text-foreground';
      }
    } else if (type === 'claim') {
      switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'processing': return 'bg-blue-100 text-blue-800';
        case 'approved': return 'bg-green-100 text-green-800';
        case 'rejected': return 'bg-red-100 text-red-800';
        default: return 'bg-muted text-foreground';
      }
    }
    return 'bg-muted text-foreground';
  };

  const getStatusIcon = (status: string, type: string) => {
    if (type === 'card') {
      switch (status) {
        case 'active': return <CheckCircle className="h-4 w-4 text-green-600" />;
        case 'blocked': return <Lock className="h-4 w-4 text-red-600" />;
        case 'expired': return <XCircle className="h-4 w-4 text-muted-foreground" />;
        default: return <Clock className="h-4 w-4 text-muted-foreground" />;
      }
    } else if (type === 'loan') {
      switch (status) {
        case 'active': return <CheckCircle className="h-4 w-4 text-green-600" />;
        case 'overdue': return <AlertTriangle className="h-4 w-4 text-red-600" />;
        case 'completed': return <CheckCircle className="h-4 w-4 text-blue-600" />;
        default: return <Clock className="h-4 w-4 text-muted-foreground" />;
      }
    }
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusLabel = (status: string, type: string) => {
    if (type === 'card') {
      switch (status) {
        case 'active': return 'Hoạt động';
        case 'blocked': return 'Bị khóa';
        case 'expired': return 'Hết hạn';
        default: return status;
      }
    } else if (type === 'loan') {
      switch (status) {
        case 'active': return 'Đang hoạt động';
        case 'overdue': return 'Quá hạn';
        case 'completed': return 'Tất toán';
        default: return status;
      }
    } else if (type === 'insurance') {
      switch (status) {
        case 'active': return 'Hiệu lực';
        case 'expired': return 'Hết hạn';
        case 'cancelled': return 'Đã hủy';
        default: return status;
      }
    } else if (type === 'claim') {
      switch (status) {
        case 'pending': return 'Tiếp nhận';
        case 'processing': return 'Đang xử lý';
        case 'approved': return 'Đã duyệt';
        case 'rejected': return 'Từ chối';
        default: return status;
      }
    }
    return status;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const handleAction = (action: string, item: any, type: string) => {
    if (['block-card', 'unblock-card', 'extend-loan', 'extend-insurance'].includes(action)) {
      // Show confirmation dialog for sensitive actions
      setConfirmDialog({
        action,
        item,
        type,
        title: action === 'block-card' ? 'Khóa thẻ khẩn cấp' :
               action === 'unblock-card' ? 'Mở khóa thẻ' :
               action === 'extend-loan' ? 'Gia hạn hợp đồng vay' :
               'Gia hạn hợp đồng bảo hiểm',
        description: action === 'block-card' ? 'Bạn có chắc chắn muốn khóa thẻ này không? Thao tác này sẽ có hiệu lực ngay lập tức.' :
                    action === 'unblock-card' ? 'Bạn có chắc chắn muốn mở khóa thẻ này không?' :
                    action === 'extend-loan' ? 'Bạn có chắc chắn muốn gia hạn hợp đồng vay này không?' :
                    'Bạn có chắc chắn muốn gia hạn hợp đồng bảo hiểm này không?'
      });
    } else {
      // Show action dialog for other actions
      setSelectedAction({ action, item, type });
    }
  };

  const confirmAction = () => {
    console.log('Confirmed action:', confirmDialog);
    // In real app, this would make API call
    setConfirmDialog(null);
    // Log for audit
    console.log('Audit Log:', {
      agentId: 'AGT001',
      action: confirmDialog.action,
      itemId: confirmDialog.item.id,
      timestamp: new Date().toISOString(),
      customerId
    });
  };

  const performAction = (actionData: any) => {
    console.log('Performing action:', actionData);
    // In real app, this would make API call
    setSelectedAction(null);
    // Log for audit
    console.log('Audit Log:', {
      agentId: 'AGT001',
      action: actionData.action,
      itemId: actionData.item.id,
      data: actionData.data,
      timestamp: new Date().toISOString(),
      customerId
    });
  };

  const ActionDialog = () => {
    if (!selectedAction) return null;

    const { action, item, type } = selectedAction;

    return (
      <Dialog open={!!selectedAction} onOpenChange={() => setSelectedAction(null)}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {action === 'request-disbursement' ? 'Yêu cầu giải ngân' :
               action === 'update-claim' ? 'Cập nhật hồ sơ bồi thường' :
               action === 'attach-documents' ? 'Đính kèm chứng từ' :
               action === 'insurance-consultation' ? 'Gửi yêu cầu tư vấn' :
               'Thực hiện thao tác'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {type === 'loan' && `Hợp đồng: ${item.contractNumber}`}
              {type === 'claim' && `Hồ sơ: ${item.claimNumber}`}
              {type === 'insurance' && `Hợp đồng: ${item.contractNumber}`}
            </div>

            {action === 'request-disbursement' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Số tiền giải ngân</label>
                  <Input placeholder="Nhập số tiền..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Lý do</label>
                  <Textarea placeholder="Nhập lý do giải ngân..." rows={3} />
                </div>
              </div>
            )}

            {action === 'update-claim' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Trạng thái mới</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="processing">Đang xử lý</SelectItem>
                      <SelectItem value="approved">Đã duyệt</SelectItem>
                      <SelectItem value="rejected">Từ chối</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ghi chú</label>
                  <Textarea placeholder="Nhập ghi chú..." rows={3} />
                </div>
              </div>
            )}

            {action === 'attach-documents' && (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Kéo thả file hoặc click để tải lên</p>
                  <input type="file" multiple className="hidden" />
                </div>
              </div>
            )}

            {action === 'insurance-consultation' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Loại tư vấn</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại tư vấn" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claim">Bồi thường</SelectItem>
                      <SelectItem value="extension">Gia hạn</SelectItem>
                      <SelectItem value="upgrade">Nâng cấp</SelectItem>
                      <SelectItem value="cancellation">Hủy hợp đồng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nội dung</label>
                  <Textarea placeholder="Mô tả chi tiết yêu cầu tư vấn..." rows={4} />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAction(null)}>
              Hủy
            </Button>
            <Button onClick={() => performAction(selectedAction)}>
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const ConfirmDialog = () => {
    if (!confirmDialog) return null;

    return (
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span>{confirmDialog.title}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{confirmDialog.description}</p>
            
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="text-sm">
                <div className="font-medium">{confirmDialog.item.contractNumber || confirmDialog.item.number}</div>
                <div className="text-muted-foreground">{confirmDialog.item.cardType || confirmDialog.item.loanType || confirmDialog.item.insuranceType}</div>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-sm text-orange-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Thao tác này không thể hoàn tác</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={confirmAction}>
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Truy vấn TT từ HT core</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="h-8"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm sản phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="cards">Thẻ</SelectItem>
              <SelectItem value="loans">Vay</SelectItem>
              <SelectItem value="insurance">Bảo hiểm</SelectItem>
              <SelectItem value="claims">Bồi thường</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Cards Section */}
        {(filterType === 'all' || filterType === 'cards') && (
          <div>
            <div 
              className="flex items-center justify-between cursor-pointer mb-3"
              onClick={() => toggleSection('cards')}
            >
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium">Thẻ ({mockBFSIData.cards.length})</h4>
              </div>
              {collapsedSections.includes('cards') ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronUp className="h-4 w-4" />
              }
            </div>

            {!collapsedSections.includes('cards') && (
              <div className="space-y-3">
                {mockBFSIData.cards.map((card) => (
                  <Card key={card.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium">{card.number}</span>
                            <Badge className={getStatusColor(card.status, 'card')}>
                              {getStatusLabel(card.status, 'card')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{card.cardType} • {card.type}</p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            title="Xem chi tiết"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          {getStatusIcon(card.status, 'card')}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                          <label className="text-muted-foreground">Hạn mức</label>
                          <p className="font-medium">{formatCurrency(card.creditLimit)}</p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">Số dư hiện tại</label>
                          <p className="font-medium">{formatCurrency(card.currentBalance)}</p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">Sao kê gần nhất</label>
                          <p className="font-medium">{formatDate(card.lastStatementDate)}</p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">Hết hạn</label>
                          <p className="font-medium">{formatDate(card.expiryDate)}</p>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div className="flex space-x-2">
                        {card.status === 'active' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction('block-card', card, 'card')}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Lock className="h-3 w-3 mr-1" />
                            Khóa thẻ
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction('unblock-card', card, 'card')}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            <Unlock className="h-3 w-3 mr-1" />
                            Mở khóa
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Sao kê
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Loans Section */}
        {(filterType === 'all' || filterType === 'loans') && (
          <div>
            <div 
              className="flex items-center justify-between cursor-pointer mb-3"
              onClick={() => toggleSection('loans')}
            >
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h4 className="font-medium">Khoản vay ({mockBFSIData.loans.length})</h4>
              </div>
              {collapsedSections.includes('loans') ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronUp className="h-4 w-4" />
              }
            </div>

            {!collapsedSections.includes('loans') && (
              <div className="space-y-3">
                {mockBFSIData.loans.map((loan) => (
                  <Card key={loan.id} className={`border-l-4 ${
                    loan.status === 'overdue' ? 'border-l-red-500' : 'border-l-green-500'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium">{loan.contractNumber}</span>
                            <Badge className={getStatusColor(loan.status, 'loan')}>
                              {getStatusLabel(loan.status, 'loan')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{loan.loanType}</p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            title="Xem chi tiết"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          {getStatusIcon(loan.status, 'loan')}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                          <label className="text-muted-foreground">Số tiền vay</label>
                          <p className="font-medium">{formatCurrency(loan.loanAmount)}</p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">Còn nợ</label>
                          <p className="font-medium text-red-600">{formatCurrency(loan.remainingAmount)}</p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">Lãi suất</label>
                          <p className="font-medium">{loan.interestRate}%/năm</p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">Đáo hạn tiếp theo</label>
                          <p className="font-medium">{formatDate(loan.nextPaymentDate)}</p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Tiến độ trả nợ</span>
                          <span>{((loan.loanAmount - loan.remainingAmount) / loan.loanAmount * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-border rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${(loan.loanAmount - loan.remainingAmount) / loan.loanAmount * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction('request-disbursement', loan, 'loan')}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Giải ngân
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction('extend-loan', loan, 'loan')}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          Gia hạn
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Insurance Section */}
        {(filterType === 'all' || filterType === 'insurance') && (
          <div>
            <div 
              className="flex items-center justify-between cursor-pointer mb-3"
              onClick={() => toggleSection('insurance')}
            >
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-purple-600" />
                <h4 className="font-medium">Bảo hiểm ({mockBFSIData.insurance.length})</h4>
              </div>
              {collapsedSections.includes('insurance') ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronUp className="h-4 w-4" />
              }
            </div>

            {!collapsedSections.includes('insurance') && (
              <div className="space-y-3">
                {mockBFSIData.insurance.map((policy) => (
                  <Card key={policy.id} className={`border-l-4 ${
                    policy.status === 'expired' ? 'border-l-red-500' : 'border-l-purple-500'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium">{policy.contractNumber}</span>
                            <Badge className={getStatusColor(policy.status, 'insurance')}>
                              {getStatusLabel(policy.status, 'insurance')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{policy.insuranceType}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                          <label className="text-muted-foreground">Hiệu lực</label>
                          <p className="font-medium">{formatDate(policy.effectiveDate)} - {formatDate(policy.expiryDate)}</p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">Phí bảo hiểm</label>
                          <p className="font-medium">{formatCurrency(policy.premium)}</p>
                        </div>
                        <div className="col-span-2">
                          <label className="text-muted-foreground">Số tiền bảo hiểm</label>
                          <p className="font-medium">{formatCurrency(policy.coverageAmount)}</p>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction('extend-insurance', policy, 'insurance')}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          Gia hạn
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction('insurance-consultation', policy, 'insurance')}
                          className="text-purple-600 border-purple-200 hover:bg-purple-50"
                        >
                          <User className="h-3 w-3 mr-1" />
                          Tư vấn
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Claims Section */}
        {(filterType === 'all' || filterType === 'claims') && (
          <div>
            <div 
              className="flex items-center justify-between cursor-pointer mb-3"
              onClick={() => toggleSection('claims')}
            >
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-orange-600" />
                <h4 className="font-medium">Bồi thường ({mockBFSIData.claims.length})</h4>
              </div>
              {collapsedSections.includes('claims') ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronUp className="h-4 w-4" />
              }
            </div>

            {!collapsedSections.includes('claims') && (
              <div className="space-y-3">
                {mockBFSIData.claims.map((claim) => (
                  <Card key={claim.id} className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium">{claim.claimNumber}</span>
                            <Badge className={getStatusColor(claim.status, 'claim')}>
                              {getStatusLabel(claim.status, 'claim')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{claim.claimType}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                          <label className="text-muted-foreground">Ngày yêu cầu</label>
                          <p className="font-medium">{formatDate(claim.submissionDate)}</p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">Hợp đồng BH</label>
                          <p className="font-medium">{claim.insuranceContract}</p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">Số tiền yêu cầu</label>
                          <p className="font-medium">{formatCurrency(claim.claimAmount)}</p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">Số tiền chi trả</label>
                          <p className="font-medium text-green-600">{formatCurrency(claim.approvedAmount)}</p>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction('update-claim', claim, 'claim')}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Cập nhật
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction('attach-documents', claim, 'claim')}
                          className="text-orange-600 border-orange-200 hover:bg-orange-50"
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Đính kèm
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <ActionDialog />
      <ConfirmDialog />
    </div>
  );
}