import { useState } from "react";
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RotateCcw,
  SlidersHorizontal,
  Phone,
  Mail,
  MessageCircle,
} from "lucide-react";
import { cn } from './ui/utils';
import { DateRangeFilter, DateRangeValue } from './DateRangeFilter';

// Chat specific types
export type ChatSLAFilterType = "met" | "near-breach" | "breached" | "waiting";
export type ChatStatusFilterType = "all" | "active" | "waiting" | "closed";
export type ChatChannelType = "web" | "mobile" | "facebook" | "zalo" | "livechat";
export type ChatSortType = "none" | "waiting-longest-desc" | "waiting-longest-asc" | "sla-nearest-asc" | "sla-nearest-desc" | "start-time-desc" | "start-time-asc" | "channel-asc" | "channel-desc";

// Call specific types
export type CallStatusFilterType = "all" | "ringing" | "talking" | "hold" | "ended";
export type CallDirectionType = "all" | "inbound" | "outbound";
export type CallSortType = "none" | "start-time-desc" | "start-time-asc" | "duration-desc" | "duration-asc";

// Email specific types
export type EmailStatusFilterType = "all" | "unread" | "read" | "replied" | "draft";
export type EmailPriorityType = "all" | "high" | "normal" | "low";
export type EmailSortType = "none" | "start-time-desc" | "start-time-asc" | "priority-desc" | "priority-asc";

export interface ChatFilters {
  slaStatus: ChatSLAFilterType[];
  sessionStatus: ChatStatusFilterType;
  channels: ChatChannelType[];
  sortBy: ChatSortType;
  dateRange: DateRangeValue;
}

export interface CallFilters {
  callStatus: CallStatusFilterType;
  direction: CallDirectionType;
  sortBy: CallSortType;
  dateRange: DateRangeValue;
}

export interface EmailFilters {
  emailStatus: EmailStatusFilterType;
  priority: EmailPriorityType;
  sortBy: EmailSortType;
  dateRange: DateRangeValue;
}

export type ChannelType = "chat" | "voice" | "email";

// Common filters across all channels
export interface CommonFilters {
  dateRange: DateRangeValue;
  channelSource: string;
  status: string;
  priority: string;
}

interface AdvancedFiltersProps {
  channel: ChannelType;
  chatFilters?: ChatFilters;
  callFilters?: CallFilters;
  emailFilters?: EmailFilters;
  commonFilters?: CommonFilters;
  onChatFiltersChange?: (filters: ChatFilters) => void;
  onCallFiltersChange?: (filters: CallFilters) => void;
  onEmailFiltersChange?: (filters: EmailFilters) => void;
  onCommonFiltersChange?: (filters: CommonFilters) => void;
  resultCount?: number;
  availableSources?: string[];
}

export function AdvancedFilters({
  channel,
  chatFilters,
  callFilters,
  emailFilters,
  commonFilters,
  onChatFiltersChange,
  onCallFiltersChange,
  onEmailFiltersChange,
  onCommonFiltersChange,
  resultCount,
  availableSources,
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Chat handlers
  const handleChatFilterChange = (key: keyof ChatFilters, value: any) => {
    if (onChatFiltersChange && chatFilters) {
      onChatFiltersChange({
        ...chatFilters,
        [key]: value,
      });
    }
  };

  const toggleSLAStatus = (status: ChatSLAFilterType) => {
    const current = chatFilters?.slaStatus || [];
    const newStatus = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    handleChatFilterChange("slaStatus", newStatus);
  };

  const toggleChannel = (channelType: ChatChannelType) => {
    const current = chatFilters?.channels || [];
    const newChannels = current.includes(channelType)
      ? current.filter((c) => c !== channelType)
      : [...current, channelType];
    handleChatFilterChange("channels", newChannels);
  };

  const toggleChatSort = (sortType: "waiting" | "sla" | "time" | "channel") => {
    const currentSort = chatFilters?.sortBy;
    let newSort: ChatSortType = "none";

    if (sortType === "waiting") {
      if (currentSort === "none" || !currentSort?.startsWith("waiting")) {
        newSort = "waiting-longest-desc";
      } else if (currentSort === "waiting-longest-desc") {
        newSort = "waiting-longest-asc";
      } else {
        newSort = "none";
      }
    } else if (sortType === "sla") {
      if (currentSort === "none" || !currentSort?.startsWith("sla")) {
        newSort = "sla-nearest-asc";
      } else if (currentSort === "sla-nearest-asc") {
        newSort = "sla-nearest-desc";
      } else {
        newSort = "none";
      }
    } else if (sortType === "time") {
      if (currentSort === "none" || !currentSort?.startsWith("start-time")) {
        newSort = "start-time-desc";
      } else if (currentSort === "start-time-desc") {
        newSort = "start-time-asc";
      } else {
        newSort = "none";
      }
    } else if (sortType === "channel") {
      if (currentSort === "none" || !currentSort?.startsWith("channel")) {
        newSort = "channel-asc";
      } else if (currentSort === "channel-asc") {
        newSort = "channel-desc";
      } else {
        newSort = "none";
      }
    }

    handleChatFilterChange("sortBy", newSort);
  };

  const getChatSortIcon = (sortType: "waiting" | "sla" | "time" | "channel") => {
    const currentSort = chatFilters?.sortBy;

    if (sortType === "waiting") {
      if (currentSort === "waiting-longest-desc")
        return <ArrowDown className="h-3.5 w-3.5" />;
      if (currentSort === "waiting-longest-asc")
        return <ArrowUp className="h-3.5 w-3.5" />;
    } else if (sortType === "sla") {
      if (currentSort === "sla-nearest-asc")
        return <ArrowUp className="h-3.5 w-3.5" />;
      if (currentSort === "sla-nearest-desc")
        return <ArrowDown className="h-3.5 w-3.5" />;
    } else if (sortType === "time") {
      if (currentSort === "start-time-desc")
        return <ArrowDown className="h-3.5 w-3.5" />;
      if (currentSort === "start-time-asc")
        return <ArrowUp className="h-3.5 w-3.5" />;
    } else if (sortType === "channel") {
      if (currentSort === "channel-asc")
        return <ArrowUp className="h-3.5 w-3.5" />;
      if (currentSort === "channel-desc")
        return <ArrowDown className="h-3.5 w-3.5" />;
    }

    return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const isChatSortActive = (sortType: "waiting" | "sla" | "time" | "channel") => {
    const currentSort = chatFilters?.sortBy || "none";

    if (sortType === "waiting") return currentSort.startsWith("waiting");
    if (sortType === "sla") return currentSort.startsWith("sla");
    if (sortType === "time") return currentSort.startsWith("start-time");
    if (sortType === "channel") return currentSort.startsWith("channel");

    return false;
  };

  // Call handlers
  const handleCallFilterChange = (key: keyof CallFilters, value: any) => {
    if (onCallFiltersChange && callFilters) {
      onCallFiltersChange({
        ...callFilters,
        [key]: value,
      });
    }
  };

  // Email handlers
  const handleEmailFilterChange = (key: keyof EmailFilters, value: any) => {
    if (onEmailFiltersChange && emailFilters) {
      onEmailFiltersChange({
        ...emailFilters,
        [key]: value,
      });
    }
  };

  // Common filters handlers
  const handleCommonFilterChange = (key: keyof CommonFilters, value: any) => {
    if (onCommonFiltersChange && commonFilters) {
      onCommonFiltersChange({
        ...commonFilters,
        [key]: value,
      });
    }
  };

  // Clear filters
  const clearFilters = () => {
    if (channel === "chat" && onChatFiltersChange) {
      onChatFiltersChange({
        slaStatus: [],
        sessionStatus: "all",
        channels: [],
        sortBy: "none",
        dateRange: { preset: "all" },
      });
    } else if (channel === "voice" && onCallFiltersChange) {
      onCallFiltersChange({
        callStatus: "all",
        direction: "all",
        sortBy: "none",
        dateRange: { preset: "all" },
      });
    } else if (channel === "email" && onEmailFiltersChange) {
      onEmailFiltersChange({
        emailStatus: "all",
        priority: "all",
        sortBy: "none",
        dateRange: { preset: "all" },
      });
    }
  };

  // Check active filters
  const hasActiveFilters = () => {
    if (channel === "chat" && chatFilters) {
      return (
        (chatFilters.slaStatus && chatFilters.slaStatus.length > 0) ||
        chatFilters.sessionStatus !== "all" ||
        (chatFilters.channels && chatFilters.channels.length > 0) ||
        chatFilters.sortBy !== "none" ||
        (chatFilters.dateRange?.preset !== "all")
      );
    } else if (channel === "voice" && callFilters) {
      return (
        callFilters.callStatus !== "all" ||
        callFilters.direction !== "all" ||
        callFilters.sortBy !== "none" ||
        (callFilters.dateRange?.preset !== "all")
      );
    } else if (channel === "email" && emailFilters) {
      return (
        emailFilters.emailStatus !== "all" ||
        emailFilters.priority !== "all" ||
        emailFilters.sortBy !== "none" ||
        (emailFilters.dateRange?.preset !== "all")
      );
    }
    return false;
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (channel === "chat" && chatFilters) {
      if (chatFilters.slaStatus && chatFilters.slaStatus.length > 0) count += chatFilters.slaStatus.length;
      if (chatFilters.sessionStatus !== "all") count++;
      if (chatFilters.channels && chatFilters.channels.length > 0) count += chatFilters.channels.length;
      if (chatFilters.sortBy !== "none") count++;
      if (chatFilters.dateRange?.preset !== "all") count++;
    } else if (channel === "voice" && callFilters) {
      if (callFilters.callStatus !== "all") count++;
      if (callFilters.direction !== "all") count++;
      if (callFilters.sortBy !== "none") count++;
      if (callFilters.dateRange?.preset !== "all") count++;
    } else if (channel === "email" && emailFilters) {
      if (emailFilters.emailStatus !== "all") count++;
      if (emailFilters.priority !== "all") count++;
      if (emailFilters.sortBy !== "none") count++;
      if (emailFilters.dateRange?.preset !== "all") count++;
    }
    return count;
  };

  const getChannelIcon = () => {
    switch (channel) {
      case "chat": return MessageCircle;
      case "voice": return Phone;
      case "email": return Mail;
      default: return SlidersHorizontal;
    }
  };

  const getChannelName = () => {
    switch (channel) {
      case "chat": return "Chat";
      case "voice": return "Cuộc gọi";
      case "email": return "Email";
      default: return "";
    }
  };

  const ChannelIcon = getChannelIcon();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "w-full h-8 gap-2 relative justify-start",
            hasActiveFilters() && "border-[#155DFC] bg-[#155DFC]/5 text-[#155DFC]"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="text-xs">Lọc & Sắp xếp nâng cao ({getChannelName()})</span>
          {hasActiveFilters() && (
            <Badge className="h-4 w-4 p-0 flex items-center justify-center bg-[#155DFC] text-white text-[10px] rounded-full ml-auto">
              {getActiveFiltersCount()}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[440px] p-0"
        align="start"
      >
        <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between sticky top-0 bg-background z-10 pb-2">
            <div className="flex items-center gap-2">
              <ChannelIcon className="h-4 w-4 text-[#155DFC]" />
              <h4 className="font-semibold text-sm">Bộ lọc & Sắp xếp - {getChannelName()}</h4>
            </div>
            {hasActiveFilters() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Đặt lại
              </Button>
            )}
          </div>

          {/* Result count */}
          {resultCount !== undefined && (
            <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg">
              <span className="text-xs text-muted-foreground">Kết quả hiển thị</span>
              <Badge variant="outline" className="bg-background">
                {resultCount} {channel === "chat" ? "phiên" : channel === "voice" ? "cuộc gọi" : "email"}
              </Badge>
            </div>
          )}

          <Separator />

          {/* Chat Filters */}
          {channel === "chat" && chatFilters && (
            <>
              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                  Khoảng thời gian
                </Label>
                <DateRangeFilter
                  value={chatFilters.dateRange}
                  onChange={(value) => handleChatFilterChange("dateRange", value)}
                  compact={false}
                />
              </div>

              <Separator />

              {/* Session Status */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                  Trạng thái phiên
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant={chatFilters.sessionStatus === "all" ? "default" : "outline"}
                    onClick={() => handleChatFilterChange("sessionStatus", "all")}
                    className={cn(
                      "h-9 justify-start",
                      chatFilters.sessionStatus === "all" &&
                        "bg-[#155DFC] text-white hover:bg-[#155DFC]/90"
                    )}
                  >
                    <Filter className="h-3.5 w-3.5 mr-2" />
                    Tất cả
                  </Button>
                  <Button
                    size="sm"
                    variant={chatFilters.sessionStatus === "active" ? "default" : "outline"}
                    onClick={() => handleChatFilterChange("sessionStatus", "active")}
                    className={cn(
                      "h-9 justify-start",
                      chatFilters.sessionStatus === "active" &&
                        "bg-green-600 text-white hover:bg-green-700"
                    )}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                    Đang mở
                  </Button>
                  <Button
                    size="sm"
                    variant={chatFilters.sessionStatus === "waiting" ? "default" : "outline"}
                    onClick={() => handleChatFilterChange("sessionStatus", "waiting")}
                    className={cn(
                      "h-9 justify-start",
                      chatFilters.sessionStatus === "waiting" &&
                        "bg-amber-600 text-white hover:bg-amber-700"
                    )}
                  >
                    <Clock className="h-3.5 w-3.5 mr-2" />
                    Đang chờ
                  </Button>
                  <Button
                    size="sm"
                    variant={chatFilters.sessionStatus === "closed" ? "default" : "outline"}
                    onClick={() => handleChatFilterChange("sessionStatus", "closed")}
                    className={cn(
                      "h-9 justify-start",
                      chatFilters.sessionStatus === "closed" &&
                        "bg-gray-600 text-white hover:bg-gray-700"
                    )}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-2" />
                    Đã đóng
                  </Button>
                </div>
              </div>

              <Separator />

              {/* SLA Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                    Trạng thái SLA
                  </Label>
                  {chatFilters.slaStatus && chatFilters.slaStatus.length > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5">
                      {chatFilters.slaStatus.length} đã chọn
                    </Badge>
                  )}
                </div>
                <div className="space-y-1.5">
                  {[
                    { value: "met" as const, icon: CheckCircle2, color: "green", label: "Đúng hạn" },
                    { value: "near-breach" as const, icon: AlertTriangle, color: "orange", label: "Gần hết hạn" },
                    { value: "breached" as const, icon: XCircle, color: "red", label: "Quá hạn" },
                  ].map((sla) => {
                    const Icon = sla.icon;
                    const isChecked = chatFilters.slaStatus?.includes(sla.value);
                    return (
                      <div
                        key={sla.value}
                        className={cn(
                          "flex items-center space-x-2 p-2 rounded-md border cursor-pointer transition-colors",
                          isChecked ? "bg-blue-50 border-[#155DFC]" : "hover:bg-muted/50"
                        )}
                        onClick={() => toggleSLAStatus(sla.value)}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleSLAStatus(sla.value)}
                        />
                        <Icon className={`h-4 w-4 text-${sla.color}-600`} />
                        <span className="text-sm flex-1">{sla.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Sort Options */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                  Sắp xếp
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "waiting" as const, label: "Chờ phản hồi" },
                    { key: "sla" as const, label: "Hạn SLA" },
                    { key: "time" as const, label: "Thời gian" },
                    { key: "channel" as const, label: "Kênh" },
                  ].map((sort) => (
                    <Button
                      key={sort.key}
                      size="sm"
                      variant="outline"
                      onClick={() => toggleChatSort(sort.key)}
                      className={cn(
                        "h-9 justify-between",
                        isChatSortActive(sort.key) && "border-[#155DFC] bg-[#155DFC]/5 text-[#155DFC]"
                      )}
                    >
                      <span className="text-xs">{sort.label}</span>
                      {getChatSortIcon(sort.key)}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Chat Channels */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                    Kênh nguồn
                  </Label>
                  {chatFilters.channels && chatFilters.channels.length > 0 && (
                    <Badge variant="outline" className="text-[10px] h-5">
                      {chatFilters.channels.length} đã chọn
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "web" as const, label: "Web Chat" },
                    { value: "mobile" as const, label: "Mobile App" },
                    { value: "facebook" as const, label: "Facebook" },
                    { value: "zalo" as const, label: "Zalo" },
                  ].map((ch) => {
                    const isChecked = chatFilters.channels?.includes(ch.value);
                    return (
                      <div
                        key={ch.value}
                        className={cn(
                          "flex items-center space-x-2 p-2 rounded-md border cursor-pointer transition-colors",
                          isChecked ? "bg-blue-50 border-[#155DFC]" : "hover:bg-muted/50"
                        )}
                        onClick={() => toggleChannel(ch.value)}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleChannel(ch.value)}
                        />
                        <span className="text-sm flex-1">{ch.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Call Filters */}
          {channel === "voice" && callFilters && (
            <>
              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                  Khoảng thời gian
                </Label>
                <DateRangeFilter
                  value={callFilters.dateRange}
                  onChange={(value) => handleCallFilterChange("dateRange", value)}
                  compact={false}
                />
              </div>

              <Separator />

              {/* Call Status */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                  Trạng thái cuộc gọi
                </Label>
                <Select
                  value={callFilters.callStatus}
                  onValueChange={(value: string) => handleCallFilterChange("callStatus", value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="ringing">Đang đổ chuông</SelectItem>
                    <SelectItem value="talking">Đang nói chuyện</SelectItem>
                    <SelectItem value="hold">Đang giữ máy</SelectItem>
                    <SelectItem value="ended">Đã kết thúc</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Call Direction */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                  Hướng cuộc gọi
                </Label>
                <Select
                  value={callFilters.direction}
                  onValueChange={(value: string) => handleCallFilterChange("direction", value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="inbound">Gọi đến</SelectItem>
                    <SelectItem value="outbound">Gọi đi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Sort Options */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                  Sắp xếp
                </Label>
                <Select
                  value={callFilters.sortBy}
                  onValueChange={(value: string) => handleCallFilterChange("sortBy", value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không sắp xếp</SelectItem>
                    <SelectItem value="start-time-desc">Mới nhất trước</SelectItem>
                    <SelectItem value="start-time-asc">Cũ nhất trước</SelectItem>
                    <SelectItem value="duration-desc">Thời lượng dài nhất</SelectItem>
                    <SelectItem value="duration-asc">Thời lượng ngắn nhất</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Email Filters */}
          {channel === "email" && emailFilters && (
            <>
              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                  Khoảng thời gian
                </Label>
                <DateRangeFilter
                  value={emailFilters.dateRange}
                  onChange={(value) => handleEmailFilterChange("dateRange", value)}
                  compact={false}
                />
              </div>

              <Separator />

              {/* Email Status */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                  Trạng thái email
                </Label>
                <Select
                  value={emailFilters.emailStatus}
                  onValueChange={(value: string) => handleEmailFilterChange("emailStatus", value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="unread">Chưa đọc</SelectItem>
                    <SelectItem value="read">Đã đọc</SelectItem>
                    <SelectItem value="replied">Đã trả lời</SelectItem>
                    <SelectItem value="draft">Nháp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Email Priority */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                  Độ ưu tiên
                </Label>
                <Select
                  value={emailFilters.priority}
                  onValueChange={(value: string) => handleEmailFilterChange("priority", value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="high">Cao</SelectItem>
                    <SelectItem value="normal">Trung bình</SelectItem>
                    <SelectItem value="low">Thấp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Sort Options */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                  Sắp xếp
                </Label>
                <Select
                  value={emailFilters.sortBy}
                  onValueChange={(value: string) => handleEmailFilterChange("sortBy", value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không sắp xếp</SelectItem>
                    <SelectItem value="start-time-desc">Mới nhất trước</SelectItem>
                    <SelectItem value="start-time-asc">Cũ nhất trước</SelectItem>
                    <SelectItem value="priority-desc">Ưu tiên cao trước</SelectItem>
                    <SelectItem value="priority-asc">Ưu tiên thấp trước</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}