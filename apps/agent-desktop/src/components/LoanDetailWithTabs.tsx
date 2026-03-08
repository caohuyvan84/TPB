import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, Search, FileText, Send } from "lucide-react";

interface LoanDetailWithTabsProps {
  product: any;
  formatCurrency: (amount: number) => string;
  getStatusBadge: (status: string) => JSX.Element;
}

export function LoanDetailWithTabs({
  product,
  formatCurrency,
  getStatusBadge,
}: LoanDetailWithTabsProps) {
  const [activeTab, setActiveTab] = useState("payment-history");
  const [paymentDateFrom, setPaymentDateFrom] = useState("");
  const [paymentDateTo, setPaymentDateTo] = useState("");
  
  // State for disbursement form
  const [disbursementAmount, setDisbursementAmount] = useState("");
  const [disbursementNote, setDisbursementNote] = useState("");

  // Mock payment history data
  const paymentHistory = [
    {
      id: "1",
      date: "2024-02-14",
      amount: 8500000,
      method: "Chuyển khoản",
      status: "completed",
      note: "Thanh toán kỳ 1/36",
    },
    {
      id: "2",
      date: "2024-03-14",
      amount: 8500000,
      method: "Chuyển khoản",
      status: "completed",
      note: "Thanh toán kỳ 2/36",
    },
    {
      id: "3",
      date: "2024-04-13",
      amount: 8500000,
      method: "Tiền mặt",
      status: "completed",
      note: "Thanh toán kỳ 3/36",
    },
  ];

  const tabs = [
    { id: "contract", label: "Hợp đồng" },
    { id: "overdue", label: "Quá hạn" },
    { id: "payment-schedule", label: "Lịch TT" },
    { id: "payment-history", label: "Lịch sử TT" },
    { id: "collateral", label: "Tài sản ĐB" },
    { id: "actions", label: "Thao tác" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "payment-history":
        return (
          <div className="space-y-4">
            {/* Filter Section */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Từ ngày</Label>
                <Input
                  type="date"
                  value={paymentDateFrom}
                  onChange={(e) => setPaymentDateFrom(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Đến ngày</Label>
                <Input
                  type="date"
                  value={paymentDateTo}
                  onChange={(e) => setPaymentDateTo(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-[#155DFC] border-[#155DFC] hover:bg-[#155DFC]/10"
            >
              <Search className="h-4 w-4 mr-1" />
              Lọc
            </Button>

            {/* Payment Table */}
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Ngày thanh toán</TableHead>
                    <TableHead className="text-xs text-right">Số tiền</TableHead>
                    <TableHead className="text-xs">Phương thức</TableHead>
                    <TableHead className="text-xs">Trạng thái</TableHead>
                    <TableHead className="text-xs">Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="text-xs">{payment.date}</TableCell>
                      <TableCell className="text-xs text-right">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="text-xs">{payment.method}</TableCell>
                      <TableCell className="text-xs">
                        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Hoàn thành
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {payment.note}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );

      case "contract":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Số hợp đồng</Label>
                <p className="text-sm font-mono">{product.productCode}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Sản phẩm</Label>
                <p className="text-sm">{product.productName}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ngày giải ngân</Label>
                <p className="text-sm">{product.disbursementDate}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ngày đáo hạn</Label>
                <p className="text-sm">{product.maturityDate}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Kỳ hạn</Label>
                <p className="text-sm">{product.term} tháng</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Trạng thái</Label>
                <div>{getStatusBadge(product.status)}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Số tiền vay</Label>
                <p className="text-sm font-medium">{formatCurrency(product.loanAmount)}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Lãi suất</Label>
                <p className="text-sm">{product.interestRate}% / năm</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Dư nợ hiện tại</Label>
                <p className="text-sm font-medium text-red-600">
                  {formatCurrency(product.currentBalance)}
                </p>
              </div>
            </div>
          </div>
        );

      case "overdue":
        return (
          <div className="text-center py-8 text-muted-foreground">
            <p>Không có khoản quá hạn</p>
          </div>
        );

      case "payment-schedule":
        return (
          <div className="text-center py-8 text-muted-foreground">
            <p>Lịch trình thanh toán</p>
          </div>
        );

      case "collateral":
        return (
          <div className="text-center py-8 text-muted-foreground">
            <p>Không có tài sản đảm bảo</p>
          </div>
        );

      case "actions":
        const remainingLimit = product.loanAmount - product.currentBalance;
        const maxDisbursement = remainingLimit > 0 ? remainingLimit : 0;
        const isValidAmount = disbursementAmount && 
          parseFloat(disbursementAmount.replace(/[^\d]/g, "")) > 0 && 
          parseFloat(disbursementAmount.replace(/[^\d]/g, "")) <= maxDisbursement;
        
        return (
          <div className="space-y-4">
            {/* Disbursement Request Card */}
            <Card className="border-[#155DFC]/30">
              <CardContent className="p-4 space-y-4">
                {/* Card Title */}
                <div className="flex items-center gap-2 pb-3 border-b">
                  <FileText className="h-4 w-4 text-[#155DFC]" />
                  <h4 className="text-sm font-medium">Yêu cầu giải ngân</h4>
                </div>

                {/* Info Box - Contract & Remaining Limit */}
                <div className="bg-blue-50 rounded-lg p-3 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Số hợp đồng</Label>
                    <p className="text-sm font-mono">{product.productCode}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Hạn mức còn lại</Label>
                    <p className="text-sm font-medium text-[#155DFC]">
                      {formatCurrency(maxDisbursement)}
                    </p>
                  </div>
                </div>

                {/* Disbursement Amount Input */}
                <div className="space-y-2">
                  <Label className="text-sm">Số tiền giải ngân</Label>
                  <Input
                    type="text"
                    placeholder="Nhập số tiền..."
                    value={disbursementAmount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d]/g, "");
                      setDisbursementAmount(value);
                    }}
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tối đa: {formatCurrency(maxDisbursement)}
                  </p>
                </div>

                {/* Note Input */}
                <div className="space-y-2">
                  <Label className="text-sm">Ghi chú (không bắt buộc)</Label>
                  <Input
                    type="text"
                    placeholder="Nhập ghi chú..."
                    value={disbursementNote}
                    onChange={(e) => setDisbursementNote(e.target.value)}
                    className="h-9"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  className="w-full bg-[#155DFC] hover:bg-[#0f4ad1]"
                  disabled={!isValidAmount}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Gửi yêu cầu giải ngân
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-1">
      {/* Tab Navigation */}
      <div className="bg-muted p-1 rounded-lg inline-flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs rounded-md transition-all ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>{renderTabContent()}</div>
    </div>
  );
}