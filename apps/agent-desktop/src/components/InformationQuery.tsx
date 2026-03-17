import { useState, useMemo } from "react";
import { useBankAccounts, useSavingsProducts, useLoanProducts, useCardProducts, useBfsiTransactions } from '../hooks/useBFSI';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import {
  Shield,
  User,
  Building,
  Wallet,
  PiggyBank,
  Banknote,
  CreditCard,
  Smartphone,
  QrCode,
  Store,
  ArrowLeftRight,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Lock,
  Calendar,
  TrendingUp,
  FileText,
  Download,
  RefreshCw,
  Filter,
  Search,
  MoreVertical,
  FileEdit,
} from "lucide-react";
import { Skeleton } from './ui/skeleton';
import { LoanDetailWithTabs } from './LoanDetailWithTabs';

// Types
type ProductCategory = 
  | "accounts"
  | "savings"
  | "loans"
  | "cards"
  | "digital-banking"
  | "payments"
  | "merchant"
  | "transactions";

interface CustomerInfo {
  cif: string;
  name: string;
  status: "active" | "inactive";
  customerType: "individual" | "corporate";
  phone: string;
  email: string;
}

interface Product {
  id: string;
  productCode: string;
  productName: string;
  status: "active" | "locked" | "closed" | "overdue";
  [key: string]: any;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
  status: string;
  [key: string]: any;
}

interface InformationQueryProps {
  customerInfo?: CustomerInfo;
  onBack?: () => void;
  onCreateTicket?: (product: Product, category: ProductCategory) => void;
}

export function InformationQuery({ customerInfo: customerInfoProp, onBack, onCreateTicket }: InformationQueryProps = {}) {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>("accounts");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [transactionDateFrom, setTransactionDateFrom] = useState("");
  const [transactionDateTo, setTransactionDateTo] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loanDetailTab, setLoanDetailTab] = useState<string>("contract");

  // Use provided customer data or default to Nguyễn Văn A
  const customerInfo: CustomerInfo = customerInfoProp || {
    cif: "CIF2024123456",
    name: "Nguyễn Văn A",
    status: "active",
    customerType: "individual",
    phone: "0901234567",
    email: "nguyenvana@email.com",
  };

  // Real API hooks — always call unconditionally
  const cif = customerInfo.cif;
  const { data: apiAccounts, isLoading: loadingAccounts } = useBankAccounts(cif);
  const { data: apiSavings, isLoading: loadingSavings } = useSavingsProducts(cif);
  const { data: apiLoans, isLoading: loadingLoans } = useLoanProducts(cif);
  const { data: apiCards, isLoading: loadingCards } = useCardProducts(cif);
  const { data: apiTransactions, isLoading: loadingTransactions } = useBfsiTransactions(cif, { limit: 20 });

  // Normalize API data to Product interface for existing render logic
  const normalizeToProduct = (item: any): Product => ({
    id: item.accountNumber || item.id || String(Math.random()),
    productCode: item.accountNumber || '',
    productName: item.productName || '',
    status: item.status || 'active',
    ...item,
  });

  const apiProductsByCategory: Record<string, Product[]> = useMemo(() => ({
    accounts: (apiAccounts || []).map(normalizeToProduct),
    savings: (apiSavings || []).map(normalizeToProduct),
    loans: (apiLoans || []).map(normalizeToProduct),
    cards: (apiCards || []).map(normalizeToProduct),
  }), [apiAccounts, apiSavings, apiLoans, apiCards]);

  const apiTransactionList: Transaction[] = useMemo(() =>
    (apiTransactions || []).map(t => ({
      id: t.id,
      date: new Date(t.timestamp).toLocaleString('vi-VN'),
      description: t.description,
      amount: t.amount,
      type: t.type as 'debit' | 'credit',
      status: 'completed',
      accountNumber: t.accountNumber,
      currency: t.currency,
    })),
  [apiTransactions]);

  const isLoading = selectedCategory === 'accounts' ? loadingAccounts
    : selectedCategory === 'savings' ? loadingSavings
    : selectedCategory === 'loans' ? loadingLoans
    : selectedCategory === 'cards' ? loadingCards
    : selectedCategory === 'transactions' ? loadingTransactions
    : false;

  // Product categories
  const categories = [
    { id: "accounts" as ProductCategory, label: "Tài khoản", icon: Wallet },
    { id: "savings" as ProductCategory, label: "Tiết kiệm", icon: PiggyBank },
    { id: "loans" as ProductCategory, label: "Khoản vay", icon: Banknote },
    { id: "cards" as ProductCategory, label: "Thẻ", icon: CreditCard },
    { id: "digital-banking" as ProductCategory, label: "Ngân hàng số", icon: Smartphone },
    { id: "payments" as ProductCategory, label: "Thanh toán / QR", icon: QrCode },
    { id: "merchant" as ProductCategory, label: "Merchant / MPOS", icon: Store },
    { id: "transactions" as ProductCategory, label: "Giao dịch", icon: ArrowLeftRight },
  ];

  // Product data: use real API for accounts/savings/loans/cards, mock for others
  const getProductsByCategory = (category: ProductCategory): Product[] => {
    if (['accounts', 'savings', 'loans', 'cards'].includes(category)) {
      return apiProductsByCategory[category] || [];
    }
    const mockData: Record<string, Product[]> = {
      accounts: [
        {
          id: "ACC001",
          productCode: "1234567890",
          productName: "Tài khoản thanh toán VND",
          status: "active",
          accountType: "Current Account",
          balance: 125500000,
          availableBalance: 125500000,
          openDate: "2020-01-15",
          branch: "Chi nhánh Hà Nội",
        },
        {
          id: "ACC002",
          productCode: "9876543210",
          productName: "Tài khoản tiết kiệm VND",
          status: "active",
          accountType: "Savings Account",
          balance: 500000000,
          availableBalance: 500000000,
          openDate: "2021-06-20",
          branch: "Chi nhánh Hà Nội",
        },
      ],
      savings: [
        {
          id: "SAV001",
          productCode: "TK-2024-001",
          productName: "Tiết kiệm có kỳ hạn 12 tháng",
          status: "active",
          term: "12 tháng",
          interestRate: 6.5,
          principal: 200000000,
          maturityDate: "2025-03-15",
          openDate: "2024-03-15",
          autoRenewal: true,
        },
        {
          id: "SAV002",
          productCode: "TK-2023-045",
          productName: "Tiết kiệm không kỳ hạn",
          status: "active",
          term: "Không kỳ hạn",
          interestRate: 2.0,
          principal: 50000000,
          maturityDate: "N/A",
          openDate: "2023-08-10",
          autoRenewal: false,
        },
      ],
      loans: [
        {
          id: "LN001",
          productCode: "VL2024001234",
          productName: "Vay tiêu dùng cá nhân",
          status: "active",
          loanAmount: 300000000,
          currentBalance: 250000000,
          interestRate: 12.5,
          term: 36,
          monthlyPayment: 8500000,
          disbursementDate: "2024-01-15",
          maturityDate: "2027-01-15",
          nextPaymentDate: "2024-12-15",
          insuranceFee: 500000,
        },
        {
          id: "LN002",
          productCode: "VL2023005678",
          productName: "Vay mua xe",
          status: "overdue",
          loanAmount: 280000000,
          currentBalance: 180000000,
          interestRate: 9.8,
          term: 48,
          monthlyPayment: 6200000,
          disbursementDate: "2023-06-20",
          maturityDate: "2027-06-20",
          nextPaymentDate: "2024-11-05",
          insuranceFee: 400000,
        },
      ],
      cards: [
        {
          id: "CD001",
          productCode: "5412 **** **** 1234",
          productName: "Visa Platinum",
          status: "active",
          cardType: "Credit Card",
          issueDate: "2023-03-15",
          expiryDate: "2028-03-31",
          creditLimit: 50000000,
          availableBalance: 35000000,
          cardholderName: "NGUYEN VAN A",
          billingDate: "Ngày 5 hàng tháng",
        },
        {
          id: "CD002",
          productCode: "5512 **** **** 5678",
          productName: "Mastercard Gold",
          status: "active",
          cardType: "Credit Card",
          issueDate: "2022-08-10",
          expiryDate: "2027-08-31",
          creditLimit: 30000000,
          availableBalance: 28000000,
          cardholderName: "NGUYEN VAN A",
          billingDate: "Ngày 10 hàng tháng",
        },
      ],
      "digital-banking": [
        {
          id: "DB001",
          productCode: "APP-2024-0001",
          productName: "Mobile Banking",
          status: "active",
          registrationDate: "2023-01-10",
          lastLogin: "2024-11-25 14:30",
          deviceCount: 2,
          services: "Chuyển tiền, Thanh toán hóa đơn, Mở tiết kiệm",
        },
        {
          id: "DB002",
          productCode: "SMS-2023-0045",
          productName: "SMS Banking",
          status: "active",
          registrationDate: "2022-06-15",
          lastUsed: "2024-11-20 10:15",
          phoneNumber: "0901234567",
          services: "Tra cứu số dư, Thông báo giao dịch",
        },
      ],
      payments: [
        {
          id: "PAY001",
          productCode: "QR-2024-0012",
          productName: "VNPay QR",
          status: "active",
          linkedAccount: "1234567890",
          activationDate: "2024-02-10",
          lastTransaction: "2024-11-25 18:45",
          totalTransactions: 156,
          monthlyLimit: 50000000,
        },
        {
          id: "PAY002",
          productCode: "AUTODEBIT-001",
          productName: "Auto Debit - Đin EVN",
          status: "active",
          billerName: "Công ty Điện lực Hà Nội",
          linkedAccount: "1234567890",
          setupDate: "2023-05-20",
          lastPayment: "2024-11-05",
          averageAmount: 850000,
        },
      ],
      merchant: [
        {
          id: "MCH001",
          productCode: "MPOS-2024-0045",
          productName: "mPOS Terminal",
          status: "active",
          merchantName: "Cửa hàng ABC",
          merchantID: "MCH20240045",
          activationDate: "2024-03-15",
          settlementAccount: "1234567890",
          monthlyVolume: 125000000,
          transactionCount: 245,
        },
      ],
      transactions: [],
    };

    return mockData[category] || [];
  };

  // Mock transaction data
  const mockTransactions: Transaction[] = [
    {
      id: "TX001",
      date: "2024-11-25 14:30:25",
      description: "Chuyển tiền đến Nguyễn Thị B",
      amount: 5000000,
      type: "debit",
      status: "completed",
      accountNumber: "1234567890",
      beneficiary: "Nguyễn Thị B",
      reference: "REF20241125001",
    },
    {
      id: "TX002",
      date: "2024-11-24 09:15:10",
      description: "Nhận tiền từ Công ty XYZ",
      amount: 15000000,
      type: "credit",
      status: "completed",
      accountNumber: "1234567890",
      beneficiary: "Công ty XYZ",
      reference: "SAL20241124",
    },
    {
      id: "TX003",
      date: "2024-11-23 16:45:30",
      description: "Thanh toán hóa đơn điện",
      amount: 850000,
      type: "debit",
      status: "completed",
      accountNumber: "1234567890",
      beneficiary: "EVN Hà Nội",
      reference: "BILL20241123",
    },
    {
      id: "TX004",
      date: "2024-11-22 11:20:00",
      description: "Rút tiền ATM",
      amount: 2000000,
      type: "debit",
      status: "completed",
      accountNumber: "1234567890",
      beneficiary: "ATM CN Hoàn Kiếm",
      reference: "ATM20241122",
    },
    {
      id: "TX005",
      date: "2024-11-21 13:30:15",
      description: "Thanh toán QR Code",
      amount: 350000,
      type: "debit",
      status: "completed",
      accountNumber: "1234567890",
      beneficiary: "Siêu thị Vinmart",
      reference: "QR20241121",
    },
  ];

  const products = getProductsByCategory(selectedCategory);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const maskData = (data: string, visibleChars = 4) => {
    if (!data) return "N/A";
    if (showSensitiveData) return data;
    if (data.length <= visibleChars) return data;
    return "*".repeat(data.length - visibleChars) + data.slice(-visibleChars);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: any }> = {
      active: {
        label: "Đang hoạt động",
        className: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle,
      },
      locked: {
        label: "Tạm khóa",
        className: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: Lock,
      },
      closed: {
        label: "Đã đóng",
        className: "bg-muted text-foreground border-border",
        icon: XCircle,
      },
      inactive: {
        label: "Không hoạt động",
        className: "bg-muted text-foreground border-border",
        icon: XCircle,
      },
      completed: {
        label: "Hoàn thành",
        className: "bg-blue-100 text-blue-800 border-blue-200",
        icon: CheckCircle,
      },
      overdue: {
        label: "Quá hạn",
        className: "bg-red-100 text-red-800 border-red-200",
        icon: AlertCircle,
      },
    };

    const item = config[status] || {
      label: status,
      className: "bg-muted text-foreground border-border",
      icon: AlertCircle,
    };
    const Icon = item.icon;

    return (
      <Badge className={item.className}>
        <Icon className="h-3 w-3 mr-1" />
        {item.label}
      </Badge>
    );
  };

  const handleCategoryClick = (category: ProductCategory) => {
    setSelectedCategory(category);
    setSelectedProduct(null);
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const renderProductOverview = () => {
    if (selectedCategory === "transactions") {
      return renderTransactionsView();
    }

    if (isLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (products.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Building className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p>Không có sản phẩm nào trong danh mục này</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {/* Product Cards */}
        <div className="space-y-3">
          {products.map((product) => (
            <Card
              key={product.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedProduct?.id === product.id
                  ? "border-[#155DFC] bg-blue-50/50"
                  : ""
              }`}
              onClick={() => handleProductClick(product)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{product.productName}</h4>
                      {getStatusBadge(product.status)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <span className="font-mono">
                        {maskData(product.productCode)}
                      </span>
                    </div>
                    {renderProductSummary(selectedCategory, product)}
                  </div>
                  <div className="flex flex-col gap-1">
                    {selectedCategory !== "digital-banking" && selectedCategory !== "payments" && selectedCategory !== "merchant" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[#155DFC] border-[#155DFC] hover:bg-[#155DFC]/10 h-7 text-xs px-2"
                          >
                            <MoreVertical className="h-3 w-3 mr-1" />
                            Thao tác
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            Xem chi tiết
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onCreateTicket && onCreateTicket(product, selectedCategory)}
                          >
                            <FileEdit className="h-4 w-4 mr-2" />
                            Tạo ticket
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Product Detail - Expanded Inline */}
        {selectedProduct && (
          <Card className="border-[#155DFC] shadow-lg">
            <CardHeader className="bg-[#155DFC]/5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-[#155DFC]" />
                  Chi tiết: {selectedProduct.productName}
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedProduct(null)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-3">
              {renderProductDetail(selectedCategory, selectedProduct)}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderProductSummary = (category: ProductCategory, product: Product) => {
    const summaries: Record<ProductCategory, React.ReactElement> = {
      accounts: (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="text-muted-foreground">Số dư:</div>
          <div className="font-medium text-right">
            {showSensitiveData ? formatCurrency(product.balance) : "••• •••"}
          </div>
          <div className="text-muted-foreground">Loại TK:</div>
          <div className="text-right">{product.accountType}</div>
        </div>
      ),
      savings: (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="text-muted-foreground">Số tiền gốc:</div>
          <div className="font-medium text-right">
            {showSensitiveData ? formatCurrency(product.principal) : "••• •••"}
          </div>
          <div className="text-muted-foreground">Lãi suất:</div>
          <div className="text-right text-green-600 font-medium">
            {product.interestRate}%/năm
          </div>
          <div className="text-muted-foreground">Kỳ hạn:</div>
          <div className="text-right">{product.term}</div>
        </div>
      ),
      loans: (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="text-muted-foreground">Dư nợ:</div>
          <div className="font-medium text-right">
            {showSensitiveData
              ? formatCurrency(product.currentBalance)
              : "••• •••"}
          </div>
          <div className="text-muted-foreground">Trả hàng tháng:</div>
          <div className="text-right">{formatCurrency(product.monthlyPayment)}</div>
          <div className="text-muted-foreground">Kỳ hạn:</div>
          <div className="text-right">{product.term} tháng</div>
        </div>
      ),
      cards: (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="text-muted-foreground">Hạn mức:</div>
          <div className="font-medium text-right">
            {formatCurrency(product.creditLimit)}
          </div>
          <div className="text-muted-foreground">Khả dụng:</div>
          <div className="text-right text-green-600 font-medium">
            {showSensitiveData
              ? formatCurrency(product.availableBalance)
              : "••• •••"}
          </div>
          <div className="text-muted-foreground">Hết hạn:</div>
          <div className="text-right">{product.expiryDate}</div>
        </div>
      ),
      "digital-banking": (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="text-muted-foreground">Đng ký:</div>
          <div className="text-right">{product.registrationDate}</div>
          <div className="text-muted-foreground">Dịch vụ:</div>
          <div className="text-right text-xs">{product.services}</div>
        </div>
      ),
      payments: (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="text-muted-foreground">TK liên kết:</div>
          <div className="text-right font-mono text-xs">
            {maskData(product.linkedAccount)}
          </div>
          <div className="text-muted-foreground">Kích hoạt:</div>
          <div className="text-right">{product.activationDate}</div>
        </div>
      ),
      merchant: (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="text-muted-foreground">Merchant ID:</div>
          <div className="text-right font-mono text-xs">{product.merchantID}</div>
          <div className="text-muted-foreground">Doanh số tháng:</div>
          <div className="text-right font-medium text-green-600">
            {formatCurrency(product.monthlyVolume)}
          </div>
        </div>
      ),
      transactions: <></>,
    };

    return summaries[category] || <></>;
  };

  const renderProductDetail = (category: ProductCategory, product: Product) => {
    // Common detail structure with grouped sections
    const details: Record<ProductCategory, React.ReactElement> = {
      accounts: (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-foreground/80 mb-3 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Thông tin chung
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Số tài khoản</Label>
                <p className="font-mono">{maskData(product.productCode)}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Loại tài khoản</Label>
                <p>{product.accountType}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ngày mở</Label>
                <p>{product.openDate}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Chi nhánh</Label>
                <p>{product.branch}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Trạng thái</Label>
                <div>{getStatusBadge(product.status)}</div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium text-foreground/80 mb-3 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Thông tin tài chính
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Số dư hiện tại</Label>
                <p className="text-lg font-medium text-green-600">
                  {showSensitiveData ? formatCurrency(product.balance) : "••••••••"}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Số dư khả dụng</Label>
                <p className="text-lg font-medium">
                  {showSensitiveData
                    ? formatCurrency(product.availableBalance)
                    : "••••••••"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      savings: (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-foreground/80 mb-3 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Thông tin chung
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Mã sổ TK</Label>
                <p className="font-mono">{product.productCode}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Kỳ hạn</Label>
                <p>{product.term}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ngày mở</Label>
                <p>{product.openDate}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ngày đáo hạn</Label>
                <p>{product.maturityDate}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tự động gia hạn</Label>
                <p>{product.autoRenewal ? "Có" : "Không"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Trạng thái</Label>
                <div>{getStatusBadge(product.status)}</div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium text-foreground/80 mb-3 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Thông tin tài chính
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Số tiền gốc</Label>
                <p className="text-lg font-medium text-blue-600">
                  {showSensitiveData
                    ? formatCurrency(product.principal)
                    : "••••••••"}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Lãi suất</Label>
                <p className="text-lg font-medium text-green-600">
                  {product.interestRate}% / năm
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      loans: (
        <LoanDetailWithTabs
          product={product}
          formatCurrency={formatCurrency}
          getStatusBadge={getStatusBadge}
        />
      ),
      cards: (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-foreground/80 mb-3 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Thông tin thẻ
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Số thẻ</Label>
                <p className="font-mono">{product.productCode}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Chủ thẻ</Label>
                <p>{showSensitiveData ? product.cardholderName : "••• •••"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Loại thẻ</Label>
                <p>{product.cardType}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ngày phát hành</Label>
                <p>{product.issueDate}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ngày hết hạn</Label>
                <p>{product.expiryDate}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Trạng thái</Label>
                <div>{getStatusBadge(product.status)}</div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium text-foreground/80 mb-3 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Thông tin tài chính
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Hạn mức</Label>
                <p className="text-lg font-medium">
                  {formatCurrency(product.creditLimit)}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Số dư khả dụng</Label>
                <p className="text-lg font-medium text-green-600">
                  {showSensitiveData
                    ? formatCurrency(product.availableBalance)
                    : "••••••••"}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ngày chốt sao kê</Label>
                <p>{product.billingDate}</p>
              </div>
            </div>
          </div>
        </div>
      ),
      "digital-banking": (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-foreground/80 mb-3 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Thông tin dịch vụ
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Mã dịch vụ</Label>
                <p className="font-mono">{product.productCode}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ngày đăng ký</Label>
                <p>{product.registrationDate}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Lần sử dụng cuối</Label>
                <p>{product.lastLogin || product.lastUsed}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Trạng thái</Label>
                <div>{getStatusBadge(product.status)}</div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium text-foreground/80 mb-3">
              Dịch vụ đăng ký
            </h4>
            <p className="text-sm text-foreground/80">{product.services}</p>
          </div>
        </div>
      ),
      payments: (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-foreground/80 mb-3 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Thông tin dịch vụ
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Mã dịch vụ</Label>
                <p className="font-mono">{product.productCode}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tài khoản liên kết</Label>
                <p className="font-mono">{maskData(product.linkedAccount || "")}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ngày kích hoạt</Label>
                <p>{product.activationDate || product.setupDate || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Trạng thái</Label>
                <div>{getStatusBadge(product.status)}</div>
              </div>
            </div>
          </div>

          {product.billerName && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-foreground/80 mb-3">
                  Thông tin nhà cung cấp
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Nhà cung cấp</Label>
                    <p>{product.billerName}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Lần TT cuối</Label>
                    <p>{product.lastPayment}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Số tiền TB</Label>
                    <p>{formatCurrency(product.averageAmount)}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ),
      merchant: (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-foreground/80 mb-3 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Thông tin merchant
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Merchant ID</Label>
                <p className="font-mono">{product.merchantID || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tên merchant</Label>
                <p>{product.merchantName || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Mã thiết bị</Label>
                <p className="font-mono">{product.productCode}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ngày kích hoạt</Label>
                <p>{product.activationDate || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">TK thanh toán</Label>
                <p className="font-mono">{maskData(product.settlementAccount || "")}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Trạng thái</Label>
                <div>{getStatusBadge(product.status)}</div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium text-foreground/80 mb-3 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Thống kê giao dịch
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Doanh số tháng</Label>
                <p className="text-lg font-medium text-green-600">
                  {formatCurrency(product.monthlyVolume || 0)}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Số giao dịch</Label>
                <p className="text-lg font-medium">{product.transactionCount || 0}</p>
              </div>
            </div>
          </div>
        </div>
      ),
      transactions: <></>,
    };

    return details[category] || <></>;
  };

  const renderTransactionsView = () => {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Filter className="h-5 w-5 mr-2 text-[#155DFC]" />
              Bộ lọc giao dịch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Từ ngày</Label>
                <Input
                  type="date"
                  value={transactionDateFrom}
                  onChange={(e) => setTransactionDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Đến ngày</Label>
                <Input
                  type="date"
                  value={transactionDateTo}
                  onChange={(e) => setTransactionDateTo(e.target.value)}
                />
              </div>
            </div>
            <Button
              className="w-full bg-[#155DFC] hover:bg-[#0f4ad1]"
              size="sm"
            >
              <Search className="h-4 w-4 mr-2" />
              Tìm kiếm
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Danh sách giao dịch ({apiTransactionList.length})
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-1" />
                  Xuất
                </Button>
                <Button size="sm" variant="outline">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Compact table */}
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Ngày GD</TableHead>
                    <TableHead className="w-[200px]">Mô tả</TableHead>
                    <TableHead className="text-right w-[100px]">Số tiền</TableHead>
                    <TableHead className="w-[70px]">Loại</TableHead>
                    <TableHead className="w-[100px]">TK</TableHead>
                    <TableHead className="w-[140px]">Bên nhận/gửi</TableHead>
                    <TableHead className="w-[100px]">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiTransactionList.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs whitespace-nowrap font-medium">
                        {tx.date}
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate" title={tx.description}>
                        {tx.description}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium text-xs whitespace-nowrap ${
                          tx.type === "credit"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {tx.type === "credit" ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs ${
                            tx.type === "credit"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {tx.type === "credit" ? "Vào" : "Ra"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {showSensitiveData
                          ? tx.accountNumber
                          : maskData(tx.accountNumber)}
                      </TableCell>
                      <TableCell className="text-xs max-w-[140px] truncate" title={tx.beneficiary}>
                        {tx.beneficiary}
                      </TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-muted/50/50">
      {/* Customer Header */}
      <div className="flex-shrink-0 bg-background border-b">
        <div className="p-4">
          {/* Back Navigation - Show when onBack is available */}
          {onBack && (
            <div className="mb-3">
              <Button
                size="sm"
                variant="outline"
                onClick={onBack}
                className="flex items-center gap-1 text-[#155DFC] border-[#155DFC] hover:bg-[#155DFC]/10"
              >
                <ChevronLeft className="h-4 w-4" />
                Quay lại danh sách khách hàng
              </Button>
            </div>
          )}
          
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="bg-[#155DFC]/10 p-3 rounded-lg">
                <User className="h-6 w-6 text-[#155DFC]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-lg">{customerInfo.name}</h3>
                  {getStatusBadge(customerInfo.status)}
                  <Badge variant="outline" className="text-xs">
                    {customerInfo.customerType === "individual"
                      ? "Cá nhân"
                      : "Doanh nghiệp"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">CIF:</span>
                    <span className="font-mono">{customerInfo.cif}</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-1">
                    <span>SĐT:</span>
                    <span className="font-mono">
                      {showSensitiveData
                        ? customerInfo.phone
                        : maskData(customerInfo.phone, 3)}
                    </span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-1">
                    <span>Email:</span>
                    <span>{showSensitiveData ? customerInfo.email : "••••••@••••.com"}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowSensitiveData(!showSensitiveData)}
                className="flex items-center gap-1"
              >
                {showSensitiveData ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Ẩn dữ liệu
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Hiện dữ liệu
                  </>
                )}
              </Button>
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                <Shield className="h-3 w-3 text-amber-600" />
                <span className="text-amber-700">Dữ liệu nhạy cảm</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Sidebar + Product Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Product Categories */}
        <div 
          className={`flex-shrink-0 bg-background border-r transition-all duration-300 ${
            isSidebarCollapsed ? "w-16" : "w-56"
          }`}
        >
          <ScrollArea className="h-full">
            <div className="p-3 space-y-1">
              <div className="flex items-center justify-between px-3 py-2">
                {!isSidebarCollapsed && (
                  <div className="text-xs font-medium text-muted-foreground uppercase">
                    Danh mục truy vấn
                  </div>
                )}
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  title={isSidebarCollapsed ? "Mở rộng" : "Thu gọn"}
                >
                  <ChevronLeft
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      isSidebarCollapsed ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                      isActive
                        ? "bg-[#155DFC] text-white shadow-md"
                        : "text-foreground/80 hover:bg-muted"
                    }`}
                    title={isSidebarCollapsed ? cat.label : undefined}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {!isSidebarCollapsed && (
                      <>
                        <span className="flex-1 text-left">{cat.label}</span>
                        {isActive && <ChevronRight className="h-4 w-4" />}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Right Content - Product List & Details */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    {categories.find((c) => c.id === selectedCategory)?.label}
                    {!isLoading && (
                      <Badge variant="outline" className="ml-2">
                        {selectedCategory === "transactions"
                          ? apiTransactionList.length
                          : products.length}{" "}
                        {selectedCategory === "transactions"
                          ? "giao dịch"
                          : "sản phẩm"}
                      </Badge>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedCategory === "transactions"
                      ? "Danh sách giao dịch gần đây"
                      : "Danh sách sản phẩm của khách hàng"}
                  </p>
                </div>
                {onBack && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onBack}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Quay lại
                  </Button>
                )}
              </div>

              {renderProductOverview()}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}