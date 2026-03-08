import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  User, 
  Phone, 
  Mail, 
  Building, 
  MapPin, 
  Calendar,
  CreditCard,
  ChevronRight,
  Search,
  AlertCircle,
  CheckCircle2,
  Loader2,
  LayoutGrid,
  TableIcon,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Customer {
  cif: string;
  name: string;
  phone: string;
  email: string;
  customerType: "individual" | "corporate";
  status: "active" | "inactive" | "suspended";
  address?: string;
  registrationDate: string;
  totalProducts: number;
  totalBalance?: number;
  relationship?: string;
}

interface CustomerSelectionProps {
  phoneNumber: string;
  onSelectCustomer: (customer: Customer) => void;
}

export function CustomerSelection({ phoneNumber, onSelectCustomer }: CustomerSelectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<"phone" | "cif" | "name" | "email">("phone");
  const [searchQuery, setSearchQuery] = useState(phoneNumber);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">("card"); // Default to card view
  
  // Mock database with multiple customers
  const mockDatabase: Customer[] = [
    // Customers with phone: 84 987 654 321 (Trần Thị B's group)
    {
      cif: "CIF2024789012",
      name: "Trần Thị B",
      phone: "+84 987 654 321",
      email: "tran.thi.b@email.com",
      customerType: "individual",
      status: "active",
      address: "123 Đường ABC, Quận 1, TP.HCM",
      registrationDate: "2020-03-15",
      totalProducts: 5,
      totalBalance: 450000000,
      relationship: "Chủ tài khoản",
    },
    {
      cif: "CIF2021456789",
      name: "Trần Văn C",
      phone: "+84 987 654 321",
      email: "tran.van.c@email.com",
      customerType: "individual",
      status: "active",
      address: "456 Đường XYZ, Quận 3, TP.HCM",
      registrationDate: "2021-08-20",
      totalProducts: 3,
      totalBalance: 120000000,
      relationship: "Người thân (Chồng)",
    },
    {
      cif: "CIF2022334455",
      name: "Công ty TNHH ABC",
      phone: "+84 987 654 321",
      email: "contact@abc-company.com",
      customerType: "corporate",
      status: "active",
      address: "789 Đường DEF, Quận Tân Bình, TP.HCM",
      registrationDate: "2022-01-10",
      totalProducts: 8,
      totalBalance: 2500000000,
      relationship: "Đại diện pháp luật",
    },
    {
      cif: "CIF2019887766",
      name: "Trần Thị D",
      phone: "+84 987 654 321",
      email: "tran.thi.d@email.com",
      customerType: "individual",
      status: "inactive",
      address: "321 Đường GHI, Quận 7, TP.HCM",
      registrationDate: "2019-11-05",
      totalProducts: 1,
      totalBalance: 5000000,
      relationship: "Người thân (Con gái)",
    },
    // Customers with different phone: 84 987 888 999
    {
      cif: "CIF2023111222",
      name: "Nguyễn Văn E",
      phone: "+84 987 888 999",
      email: "nguyen.van.e@email.com",
      customerType: "individual",
      status: "active",
      address: "555 Đường JKL, Quận 2, TP.HCM",
      registrationDate: "2023-02-14",
      totalProducts: 4,
      totalBalance: 320000000,
      relationship: "Chủ tài khoản",
    },
    {
      cif: "CIF2023222333",
      name: "Lê Thị F",
      phone: "+84 987 888 999",
      email: "le.thi.f@email.com",
      customerType: "individual",
      status: "active",
      address: "666 Đường MNO, Quận 5, TP.HCM",
      registrationDate: "2023-05-20",
      totalProducts: 2,
      totalBalance: 150000000,
      relationship: "Người thân (Vợ)",
    },
    // More individual customers for testing
    {
      cif: "CIF2023333444",
      name: "Phạm Văn G",
      phone: "+84 912 345 678",
      email: "pham.van.g@email.com",
      customerType: "individual",
      status: "active",
      address: "777 Đường PQR, Quận 10, TP.HCM",
      registrationDate: "2023-07-10",
      totalProducts: 6,
      totalBalance: 580000000,
      relationship: "Chủ tài khoản",
    },
  ];

  // Search customers based on search type and query
  const searchCustomers = () => {
    setIsSearching(true);
    
    // Simulate API call delay
    setTimeout(() => {
      setIsSearching(false);
    }, 500);
  };

  // Get customers based on current search query and type
  const getSearchResults = () => {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    if (!normalizedQuery) {
      return [];
    }

    return mockDatabase.filter(customer => {
      switch (searchType) {
        case "phone":
          return customer.phone.toLowerCase().includes(normalizedQuery);
        case "cif":
          return customer.cif.toLowerCase().includes(normalizedQuery);
        case "name":
          return customer.name.toLowerCase().includes(normalizedQuery);
        case "email":
          return customer.email.toLowerCase().includes(normalizedQuery);
        default:
          return false;
      }
    });
  };

  const customers = getSearchResults();

  const filteredCustomers = customers.filter(customer => 
    customer.cif.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: any }> = {
      active: {
        label: "Đang hoạt động",
        className: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle2,
      },
      inactive: {
        label: "Không hoạt động",
        className: "bg-muted text-foreground border-border",
        icon: AlertCircle,
      },
      suspended: {
        label: "Tạm khóa",
        className: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: AlertCircle,
      },
    };

    const item = config[status] || config.active;
    const Icon = item.icon;

    return (
      <Badge className={item.className}>
        <Icon className="h-3 w-3 mr-1" />
        {item.label}
      </Badge>
    );
  };

  return (
    <div className="h-full flex flex-col bg-muted/50/50">
      {/* Header with Advanced Search */}
      <div className="flex-shrink-0 bg-background border-b p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="bg-[#155DFC]/10 p-3 rounded-lg">
            <Search className="h-6 w-6 text-[#155DFC]" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-lg mb-1">
              Truy vấn thông tin khách hàng
            </h3>
            <p className="text-sm text-muted-foreground">
              Tìm kiếm theo số điện thoại, CIF, tên hoặc email
            </p>
          </div>
        </div>

        {/* Advanced Search Form */}
        <div className="space-y-3">
          {/* Search Type and Query */}
          <div className="flex gap-2">
            <Select value={searchType} onValueChange={(value: any) => setSearchType(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>Số điện thoại</span>
                  </div>
                </SelectItem>
                <SelectItem value="cif">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Mã CIF</span>
                  </div>
                </SelectItem>
                <SelectItem value="name">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Tên khách hàng</span>
                  </div>
                </SelectItem>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1 flex gap-2">
              <Input
                placeholder={
                  searchType === "phone" ? "Nhập số điện thoại (VD: 84 987 888 999)" :
                  searchType === "cif" ? "Nhập mã CIF (VD: CIF2024789012)" :
                  searchType === "name" ? "Nhập tên khách hàng" :
                  "Nhập email"
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    searchCustomers();
                  }
                }}
              />
              <Button 
                onClick={searchCustomers}
                disabled={isSearching || !searchQuery.trim()}
                className="bg-[#155DFC] hover:bg-[#0f4ad1]"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Tìm kiếm
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Current Search Info */}
          {customers.length > 0 && (
            <div className="flex items-center gap-2 p-2 bg-[#155DFC]/5 rounded-md border border-[#155DFC]/20">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-foreground/80">
                  Đang hiển thị kết quả cho 
                  <span className="font-medium mx-1">
                    {searchType === "phone" ? "số điện thoại" :
                     searchType === "cif" ? "mã CIF" :
                     searchType === "name" ? "tên khách hàng" : "email"}:
                  </span>
                  <span className="font-mono text-[#155DFC]">{searchQuery}</span>
                </span>
                <Separator orientation="vertical" className="h-4" />
                <Badge variant="outline" className="text-[#155DFC] border-[#155DFC]">
                  {filteredCustomers.length} khách hàng
                </Badge>
              </div>
            </div>
          )}

          {/* Filter within results */}
          {customers.length > 1 && (
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Lọc trong kết quả theo CIF, tên, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 border rounded-md p-1 bg-background">
                <Button
                  variant={viewMode === "card" ? "default" : "ghost"}
                  size="sm"
                  className={`h-8 w-8 p-0 ${
                    viewMode === "card" ? "bg-[#155DFC] hover:bg-[#0f4ad1]" : ""
                  }`}
                  onClick={() => setViewMode("card")}
                  title="Chế độ thẻ"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  className={`h-8 w-8 p-0 ${
                    viewMode === "table" ? "bg-[#155DFC] hover:bg-[#0f4ad1]" : ""
                  }`}
                  onClick={() => setViewMode("table")}
                  title="Chế độ bảng"
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customer List */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {filteredCustomers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p>Không tìm thấy khách hàng nào</p>
              </CardContent>
            </Card>
          ) : viewMode === "card" ? (
            // Card View
            <div className="space-y-3">
              {filteredCustomers.map((customer) => (
                <Card
                  key={customer.cif}
                  className="cursor-pointer transition-all hover:shadow-md hover:border-[#155DFC] group"
                  onClick={() => onSelectCustomer(customer)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-base">{customer.name}</CardTitle>
                          {getStatusBadge(customer.status)}
                          <Badge variant="outline" className="text-xs">
                            {customer.customerType === "individual" ? "Cá nhân" : "Doanh nghiệp"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CreditCard className="h-4 w-4" />
                          <span className="font-mono">CIF: {customer.cif}</span>
                          {customer.relationship && (
                            <>
                              <Separator orientation="vertical" className="h-4" />
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                                {customer.relationship}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-[#155DFC] transition-colors" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span className="font-mono">{customer.phone}</span>
                      </div>
                      {customer.address && (
                        <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{customer.address}</span>
                        </div>
                      )}
                    </div>

                    <Separator className="my-3" />

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Ngày đăng ký</p>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{customer.registrationDate}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Số sản phẩm</p>
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{customer.totalProducts}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Tổng số dư</p>
                        <span className="font-medium text-green-600">
                          {customer.totalBalance ? formatCurrency(customer.totalBalance) : "N/A"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Table View
            <div className="border rounded-lg bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Khách hàng</TableHead>
                    <TableHead className="w-[140px]">CIF</TableHead>
                    <TableHead className="w-[120px]">Loại</TableHead>
                    <TableHead className="w-[130px]">Trạng thái</TableHead>
                    <TableHead className="w-[140px]">Số điện thoại</TableHead>
                    <TableHead className="w-[200px]">Email</TableHead>
                    <TableHead className="w-[100px]">Sản phẩm</TableHead>
                    <TableHead className="w-[140px] text-right">Tổng số dư</TableHead>
                    <TableHead className="w-[120px] text-center">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow
                      key={customer.cif}
                      className="cursor-pointer hover:bg-[#155DFC]/5"
                      onClick={() => onSelectCustomer(customer)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          {customer.relationship && (
                            <div className="text-xs text-muted-foreground mt-0.5">{customer.relationship}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{customer.cif}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {customer.customerType === "individual" ? "Cá nhân" : "Doanh nghiệp"}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(customer.status)}</TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{customer.phone}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm truncate block max-w-[200px]">{customer.email}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{customer.totalProducts}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium text-green-600">
                          {customer.totalBalance ? formatCurrency(customer.totalBalance) : "N/A"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-[#155DFC] hover:text-[#0f4ad1] hover:bg-[#155DFC]/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCustomer(customer);
                          }}
                        >
                          <User className="h-4 w-4 mr-1" />
                          Chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Info Footer */}
      <div className="flex-shrink-0 bg-blue-50 border-t border-blue-200 p-3">
        <div className="flex items-start gap-2 text-sm">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-blue-800">
            <p className="font-medium mb-1">Lu ý:</p>
            <p className="text-xs">
              {customers.length > 0 ? (
                <>
                  Tìm thấy <strong>{customers.length}</strong> khách hàng phù hợp. 
                  {customers.length > 1 && " Vui lòng chọn đúng khách hàng cần truy vấn thông tin để tiếp tục."}
                </>
              ) : (
                "Nhập thông tin và nhấn Tìm kiếm để tra cứu khách hàng."
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}