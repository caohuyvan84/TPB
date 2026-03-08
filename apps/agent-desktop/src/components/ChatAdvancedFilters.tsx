import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
  MessageCircle,
  RotateCcw,
  SlidersHorizontal,
  Check,
  Phone,
  Mail,
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { DateRangeFilter, DateRangeValue } from "@/components/DateRangeFilter";

// Chat specific types
export type ChatSLAFilterType = "met" | "near-breach" | "breached";
export type ChatStatusFilterType = "all" | "active" | "waiting" | "closed";
export type ChatChannelType = "web" | "mobile" | "facebook" | "zalo";
export type ChatSortType = "none" | "wait-time-desc" | "wait-time-asc" | "sla-priority";

// Call specific types
export type CallStatusFilterType = "all" | "ringing" | "talking" | "hold" | "ended";
export type CallDirectionType = "all" | "inbound" | "outbound";
export type CallSortType = "none" | "duration-desc" | "duration-asc" | "recent";

// Email specific types
export type EmailStatusFilterType = "all" | "unread" | "read" | "replied" | "draft";
export type EmailPriorityType = "all" | "high" | "normal" | "low";
export type EmailSortType = "none" | "date-desc" | "date-asc" | "priority";

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

export type ChannelType = "chat" | "call" | "email";

interface AdvancedFiltersProps {
  channel: ChannelType;
  chatFilters?: ChatFilters;
  callFilters?: CallFilters;
  emailFilters?: EmailFilters;
  onChatFiltersChange?: (filters: ChatFilters) => void;
  onCallFiltersChange?: (filters: CallFilters) => void;
  onEmailFiltersChange?: (filters: EmailFilters) => void;
  resultCount?: number;
}

export function ChatAdvancedFilters({
  channel,
  chatFilters,
  callFilters,
  emailFilters,
  onChatFiltersChange,
  onCallFiltersChange,
  onEmailFiltersChange,
  resultCount,
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterChange = (key: keyof ChatFilters, value: any) => {
    if (onChatFiltersChange) {
      onChatFiltersChange({
        ...chatFilters,
        [key]: value,
      });
    }
  };

  // Toggle SLA status in array
  const toggleSLAStatus = (status: ChatSLAFilterType) => {
    const current = chatFilters?.slaStatus || [];
    const newStatus = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    handleFilterChange("slaStatus", newStatus);
  };

  // Toggle channel in array
  const toggleChannel = (channel: ChatChannelType) => {
    const current = chatFilters?.channels || [];
    const newChannels = current.includes(channel)
      ? current.filter((c) => c !== channel)
      : [...current, channel];
    handleFilterChange("channels", newChannels);
  };

  const clearFilters = () => {
    if (onChatFiltersChange) {
      onChatFiltersChange({
        slaStatus: [],
        sessionStatus: "all",
        channels: [],
        sortBy: "none",
        dateRange: { preset: "all" },
      });
    }
  };

  // Toggle sort direction (none -> first -> second -> none)
  const toggleSort = (sortType: "waiting" | "sla" | "time" | "channel") => {
    const currentSort = chatFilters?.sortBy;
    let newSort: ChatSortType = "none";

    if (sortType === "waiting") {
      if (currentSort === "none" || !currentSort.startsWith("waiting")) {
        newSort = "waiting-longest-desc";
      } else if (currentSort === "waiting-longest-desc") {
        newSort = "waiting-longest-asc";
      } else {
        newSort = "none";
      }
    } else if (sortType === "sla") {
      if (currentSort === "none" || !currentSort.startsWith("sla")) {
        newSort = "sla-nearest-asc";
      } else if (currentSort === "sla-nearest-asc") {
        newSort = "sla-nearest-desc";
      } else {
        newSort = "none";
      }
    } else if (sortType === "time") {
      if (currentSort === "none" || !currentSort.startsWith("start-time")) {
        newSort = "start-time-desc";
      } else if (currentSort === "start-time-desc") {
        newSort = "start-time-asc";
      } else {
        newSort = "none";
      }
    } else if (sortType === "channel") {
      if (currentSort === "none" || !currentSort.startsWith("channel")) {
        newSort = "channel-asc";
      } else if (currentSort === "channel-asc") {
        newSort = "channel-desc";
      } else {
        newSort = "none";
      }
    }

    handleFilterChange("sortBy", newSort);
  };

  const getSortIcon = (sortType: "waiting" | "sla" | "time" | "channel") => {
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

  const isSortActive = (sortType: "waiting" | "sla" | "time" | "channel") => {
    const currentSort = chatFilters?.sortBy;

    if (sortType === "waiting") return currentSort.startsWith("waiting");
    if (sortType === "sla") return currentSort.startsWith("sla");
    if (sortType === "time") return currentSort.startsWith("start-time");
    if (sortType === "channel") return currentSort.startsWith("channel");

    return false;
  };

  const getSLAFilterLabel = (type: ChatSLAFilterType) => {
    switch (type) {
      case "met":
        return "Đúng hạn";
      case "near-breach":
        return "Gần hết hạn";
      case "breached":
        return "Quá hạn";
      default:
        return "";
    }
  };

  const hasActiveFilters =
    (chatFilters?.slaStatus && chatFilters.slaStatus.length > 0) ||
    chatFilters?.sessionStatus !== "all" ||
    (chatFilters?.channels && chatFilters.channels.length > 0) ||
    chatFilters?.sortBy !== "none" ||
    chatFilters?.dateRange !== null;

  const getActiveFiltersCount = () => {
    let count = 0;
    if (chatFilters?.slaStatus && chatFilters.slaStatus.length > 0) count += chatFilters.slaStatus.length;
    if (chatFilters?.sessionStatus !== "all") count++;
    if (chatFilters?.channels && chatFilters.channels.length > 0) count += chatFilters.channels.length;
    if (chatFilters?.sortBy !== "none") count++;
    if (chatFilters?.dateRange !== null) count++;
    return count;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-2 relative",
            hasActiveFilters && "border-[#155DFC] bg-[#155DFC]/5 text-[#155DFC]"
          )}
          onMouseEnter={() => setIsOpen(true)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="text-xs">Lọc & Sắp xếp</span>
          {hasActiveFilters && (
            <Badge className="h-4 w-4 p-0 flex items-center justify-center bg-[#155DFC] text-white text-[10px] rounded-full">
              {getActiveFiltersCount()}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[440px] p-0"
        align="start"
        onMouseLeave={() => setIsOpen(false)}
        onMouseEnter={() => setIsOpen(true)}
      >
        <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between sticky top-0 bg-background z-10 pb-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[#155DFC]" />
              <h4 className="font-semibold text-sm">Bộ lọc & Sắp xếp nâng cao</h4>
            </div>
            {hasActiveFilters && (
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
                {resultCount} phiên
              </Badge>
            </div>
          )}

          <Separator />

          {/* Section 1: Date Range Filter */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
              Khoảng thời gian
            </Label>
            <DateRangeFilter
              value={chatFilters?.dateRange}
              onChange={(value) => handleFilterChange("dateRange", value)}
              compact={false}
            />
          </div>

          <Separator />

          {/* Section 2: Session Status (Single select) */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
              Trạng thái phiên
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant={chatFilters?.sessionStatus === "all" ? "default" : "outline"}
                onClick={() => handleFilterChange("sessionStatus", "all")}
                className={cn(
                  "h-9 justify-start",
                  chatFilters?.sessionStatus === "all" &&
                    "bg-[#155DFC] text-white hover:bg-[#155DFC]/90"
                )}
              >
                <Filter className="h-3.5 w-3.5 mr-2" />
                Tất cả
              </Button>
              <Button
                size="sm"
                variant={chatFilters?.sessionStatus === "active" ? "default" : "outline"}
                onClick={() => handleFilterChange("sessionStatus", "active")}
                className={cn(
                  "h-9 justify-start",
                  chatFilters?.sessionStatus === "active" &&
                    "bg-green-600 text-white hover:bg-green-700"
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                Đang mở
              </Button>
              <Button
                size="sm"
                variant={chatFilters?.sessionStatus === "waiting" ? "default" : "outline"}
                onClick={() => handleFilterChange("sessionStatus", "waiting")}
                className={cn(
                  "h-9 justify-start",
                  chatFilters?.sessionStatus === "waiting" &&
                    "bg-amber-600 text-white hover:bg-amber-700"
                )}
              >
                <Clock className="h-3.5 w-3.5 mr-2" />
                Đang chờ phản hồi
              </Button>
              <Button
                size="sm"
                variant={chatFilters?.sessionStatus === "closed" ? "default" : "outline"}
                onClick={() => handleFilterChange("sessionStatus", "closed")}
                className={cn(
                  "h-9 justify-start",
                  chatFilters?.sessionStatus === "closed" &&
                    "bg-gray-600 text-white hover:bg-gray-700"
                )}
              >
                <XCircle className="h-3.5 w-3.5 mr-2" />
                Đã đóng
              </Button>
            </div>
          </div>

          <Separator />

          {/* Section 3: SLA Status (Multi-select with checkboxes) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                Trạng thái SLA
              </Label>
              {chatFilters?.slaStatus && chatFilters.slaStatus.length > 0 && (
                <Badge variant="outline" className="text-[10px] h-5">
                  {chatFilters.slaStatus.length} đã chọn
                </Badge>
              )}
            </div>
            <div className="space-y-1.5">
              {(
                [
                  { value: "met", icon: CheckCircle2, color: "green", label: "Đúng hạn" },
                  { value: "near-breach", icon: AlertTriangle, color: "orange", label: "Gần hết hạn SLA" },
                  { value: "breached", icon: XCircle, color: "red", label: "Đã quá hạn SLA" },
                ] as const
              ).map((sla) => {
                const Icon = sla.icon;
                const isChecked = chatFilters?.slaStatus?.includes(sla.value as ChatSLAFilterType) || false;
                return (
                  <div
                    key={sla.value}
                    className={cn(
                      "flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                      isChecked && `bg-${sla.color}-50 border-${sla.color}-300 hover:bg-${sla.color}-50`
                    )}
                    onClick={() => toggleSLAStatus(sla.value as ChatSLAFilterType)}
                  >
                    <Checkbox
                      id={`sla-${sla.value}`}
                      checked={isChecked}
                      className={cn(
                        isChecked && "border-[#155DFC] bg-[#155DFC]"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Label
                      htmlFor={`sla-${sla.value}`}
                      className="flex-1 flex items-center gap-2 cursor-pointer text-sm"
                      onClick={(e) => e.preventDefault()}
                    >
                      <Icon className={cn(
                        "h-4 w-4",
                        isChecked ? `text-${sla.color}-700` : `text-${sla.color}-500`
                      )} />
                      <span className={cn(isChecked && "font-medium")}>
                        {sla.label}
                      </span>
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Section 4: Sort Options */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
              Sắp xếp theo
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {/* Waiting Time Sort */}
              <div
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors",
                  isSortActive("waiting") && "bg-amber-50 border-amber-300"
                )}
                onClick={() => toggleSort("waiting")}
              >
                <div className="flex items-center gap-2">
                  <Clock className={cn(
                    "h-4 w-4",
                    isSortActive("waiting") ? "text-amber-600" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-xs",
                    isSortActive("waiting") ? "font-medium text-amber-900" : "text-foreground/80"
                  )}>
                    Chờ phản hồi
                  </span>
                </div>
                {getSortIcon("waiting")}
              </div>

              {/* SLA Sort */}
              <div
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors",
                  isSortActive("sla") && "bg-red-50 border-red-300"
                )}
                onClick={() => toggleSort("sla")}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className={cn(
                    "h-4 w-4",
                    isSortActive("sla") ? "text-red-600" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-xs",
                    isSortActive("sla") ? "font-medium text-red-900" : "text-foreground/80"
                  )}>
                    Hạn SLA
                  </span>
                </div>
                {getSortIcon("sla")}
              </div>

              {/* Time Sort */}
              <div
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors",
                  isSortActive("time") && "bg-blue-50 border-blue-300"
                )}
                onClick={() => toggleSort("time")}
              >
                <div className="flex items-center gap-2">
                  <Clock className={cn(
                    "h-4 w-4",
                    isSortActive("time") ? "text-blue-600" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-xs",
                    isSortActive("time") ? "font-medium text-blue-900" : "text-foreground/80"
                  )}>
                    Thời gian
                  </span>
                </div>
                {getSortIcon("time")}
              </div>

              {/* Channel Sort */}
              <div
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors",
                  isSortActive("channel") && "bg-purple-50 border-purple-300"
                )}
                onClick={() => toggleSort("channel")}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className={cn(
                    "h-4 w-4",
                    isSortActive("channel") ? "text-purple-600" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-xs",
                    isSortActive("channel") ? "font-medium text-purple-900" : "text-foreground/80"
                  )}>
                    Kênh
                  </span>
                </div>
                {getSortIcon("channel")}
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 5: Channel Source (Multi-select with checkboxes) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                Kênh nguồn
              </Label>
              {chatFilters?.channels && chatFilters.channels.length > 0 && (
                <Badge variant="outline" className="text-[10px] h-5">
                  {chatFilters.channels.length} đã chọn
                </Badge>
              )}
            </div>
            <div className="space-y-1.5">
              {[
                { value: "web", label: "Web", icon: MessageCircle, color: "blue" },
                { value: "mobile", label: "Di động", icon: MessageCircle, color: "cyan" },
                { value: "facebook", label: "Facebook Messenger", icon: MessageCircle, color: "blue" },
                { value: "zalo", label: "Zalo Chat", icon: MessageCircle, color: "cyan" },
              ].map((ch) => {
                const Icon = ch.icon;
                const isChecked = chatFilters?.channels?.includes(ch.value as ChatChannelType) || false;
                return (
                  <div
                    key={ch.value}
                    className={cn(
                      "flex items-center space-x-2 p-2.5 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                      isChecked && "bg-blue-50 border-blue-300 hover:bg-blue-50"
                    )}
                    onClick={() => toggleChannel(ch.value as ChatChannelType)}
                  >
                    <Checkbox
                      id={`channel-${ch.value}`}
                      checked={isChecked}
                      className={cn(
                        isChecked && "border-[#155DFC] bg-[#155DFC]"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Label
                      htmlFor={`channel-${ch.value}`}
                      className="flex-1 flex items-center gap-2 cursor-pointer text-sm"
                      onClick={(e) => e.preventDefault()}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className={cn(isChecked && "font-medium")}>
                        {ch.label}
                      </span>
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}