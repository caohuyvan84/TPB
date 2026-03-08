import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarIcon, X, Clock, Check } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

export type DateRangePreset = 
  | "all"
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export interface DateRangeValue {
  preset: DateRangePreset;
  from?: Date;
  to?: Date;
}

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  compact?: boolean;
}

export function DateRangeFilter({ value, onChange, compact = false }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<DateRangePreset>(value.preset);
  
  // Custom date states
  const [customFrom, setCustomFrom] = useState<Date | undefined>(value.preset === "custom" ? value.from : undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(value.preset === "custom" ? value.to : undefined);
  
  // Time states
  const [fromTime, setFromTime] = useState({
    hours: value.from && value.preset === "custom" ? format(value.from, "HH") : "00",
    minutes: value.from && value.preset === "custom" ? format(value.from, "mm") : "00",
  });
  const [toTime, setToTime] = useState({
    hours: value.to && value.preset === "custom" ? format(value.to, "HH") : "23",
    minutes: value.to && value.preset === "custom" ? format(value.to, "mm") : "59",
  });

  const getPresetDates = (preset: DateRangePreset): { from?: Date; to?: Date } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (preset) {
      case "today":
        return { from: today, to: new Date(today.getTime() + 86400000 - 1) };
      
      case "yesterday": {
        const yesterday = new Date(today.getTime() - 86400000);
        return { from: yesterday, to: new Date(yesterday.getTime() + 86400000 - 1) };
      }
      
      case "thisWeek": {
        const firstDay = new Date(today);
        firstDay.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
        return { from: firstDay, to: now };
      }
      
      case "lastWeek": {
        const firstDay = new Date(today);
        firstDay.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1) - 7);
        const lastDay = new Date(firstDay);
        lastDay.setDate(firstDay.getDate() + 6);
        lastDay.setHours(23, 59, 59, 999);
        return { from: firstDay, to: lastDay };
      }
      
      case "thisMonth":
        return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
      
      case "lastMonth": {
        const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { from: firstDay, to: lastDay };
      }
      
      case "all":
      default:
        return {};
    }
  };

  const handlePresetClick = (preset: DateRangePreset) => {
    setActivePreset(preset);
    
    if (preset === "custom") {
      // Just activate custom mode, don't apply yet
      return;
    }
    
    const dates = getPresetDates(preset);
    onChange({
      preset,
      from: dates.from,
      to: dates.to,
    });
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    if (!customFrom && !customTo) {
      return;
    }

    let fromDate = customFrom;
    let toDate = customTo;

    // Apply time to from date
    if (fromDate) {
      fromDate = new Date(fromDate);
      fromDate.setHours(parseInt(fromTime.hours), parseInt(fromTime.minutes), 0, 0);
    }

    // Apply time to to date
    if (toDate) {
      toDate = new Date(toDate);
      toDate.setHours(parseInt(toTime.hours), parseInt(toTime.minutes), 59, 999);
    }

    onChange({
      preset: "custom",
      from: fromDate,
      to: toDate,
    });
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange({
      preset: "all",
      from: undefined,
      to: undefined,
    });
    setActivePreset("all");
    setCustomFrom(undefined);
    setCustomTo(undefined);
    setFromTime({ hours: "00", minutes: "00" });
    setToTime({ hours: "23", minutes: "59" });
  };

  const getPresetLabel = (preset: DateRangePreset): string => {
    switch (preset) {
      case "today": return "Hôm nay";
      case "yesterday": return "Hôm qua";
      case "thisWeek": return "Tuần này";
      case "lastWeek": return "Tuần trước";
      case "thisMonth": return "Tháng này";
      case "lastMonth": return "Tháng trước";
      case "custom": return "Tùy chỉnh";
      case "all":
      default: return "Tất cả";
    }
  };

  const getDisplayText = (): string => {
    if (value.preset === "all") return "Tất cả thời gian";
    if (value.preset !== "custom") return getPresetLabel(value.preset);
    
    if (value.from && value.to) {
      return `${format(value.from, "dd/MM HH:mm", { locale: vi })} - ${format(value.to, "dd/MM HH:mm", { locale: vi })}`;
    } else if (value.from) {
      return `Từ ${format(value.from, "dd/MM/yyyy HH:mm", { locale: vi })}`;
    } else if (value.to) {
      return `Đến ${format(value.to, "dd/MM/yyyy HH:mm", { locale: vi })}`;
    }
    
    return "Chọn khoảng thời gian";
  };

  const hasActiveFilter = value.preset !== "all";

  const formatTimeInput = (val: string, max: number): string => {
    const num = parseInt(val.replace(/\D/g, "")) || 0;
    return Math.min(num, max).toString().padStart(2, "0");
  };

  const presetOptions: { value: DateRangePreset; label: string; icon: typeof Clock }[] = [
    { value: "all", label: "Tất cả thời gian", icon: Clock },
    { value: "today", label: "Hôm nay", icon: Clock },
    { value: "yesterday", label: "Hôm qua", icon: Clock },
    { value: "thisWeek", label: "Tuần này", icon: Clock },
    { value: "lastWeek", label: "Tuần trước", icon: Clock },
    { value: "thisMonth", label: "Tháng này", icon: Clock },
    { value: "lastMonth", label: "Tháng trước", icon: Clock },
  ];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          className={cn(
            "justify-start text-left w-full",
            compact ? "h-8" : "h-9",
            hasActiveFilter && "border-[#155DFC] bg-[#155DFC]/5"
          )}
        >
          <CalendarIcon className={cn("mr-2 shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
          <span className={cn("flex-1 truncate", compact && "text-xs")}>
            {getDisplayText()}
          </span>
          {hasActiveFilter && (
            <X
              className="h-3 w-3 ml-1 shrink-0 hover:bg-border rounded-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Left Side - Preset Options */}
          <div className="w-48 p-3 border-r space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">Khoảng thời gian</h4>
              {hasActiveFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-6 px-2 text-xs"
                >
                  Xóa
                </Button>
              )}
            </div>

            <div className="space-y-0.5">
              {presetOptions.map((option) => {
                const Icon = option.icon;
                const isActive = activePreset === option.value;
                
                return (
                  <button
                    key={option.value}
                    onClick={() => handlePresetClick(option.value)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                      "hover:bg-muted",
                      isActive && "bg-[#155DFC]/10 text-[#155DFC] font-medium"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      <span>{option.label}</span>
                    </div>
                    {isActive && <Check className="h-3.5 w-3.5" />}
                  </button>
                );
              })}

              <Separator className="my-2" />

              {/* Custom Option */}
              <button
                onClick={() => handlePresetClick("custom")}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                  "hover:bg-muted",
                  activePreset === "custom" && "bg-[#155DFC]/10 text-[#155DFC] font-medium"
                )}
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>Tùy chỉnh</span>
                </div>
                {activePreset === "custom" && <Check className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Right Side - Custom Date Range (Only show when custom is active) */}
          {activePreset === "custom" && (
            <div className="p-3 space-y-3 w-[480px]">
              <h4 className="font-semibold text-sm">Chọn khoảng thời gian tùy chỉnh</h4>
              
              <div className="grid grid-cols-2 gap-4">
                {/* From Date */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/80">Từ ngày</Label>
                  <div className="border rounded-md overflow-hidden">
                    <Calendar
                      mode="single"
                      selected={customFrom}
                      onSelect={setCustomFrom}
                      initialFocus
                      className="p-0"
                      classNames={{
                        months: "flex w-full",
                        month: "w-full",
                        caption: "flex justify-center pt-2 relative items-center px-8",
                        nav: "flex items-center gap-1",
                        table: "w-full border-collapse",
                        head_row: "flex w-full",
                        head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] flex-1 text-center",
                        row: "flex w-full mt-1",
                        cell: "flex-1 text-center text-sm p-0",
                        day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 mx-auto",
                      }}
                    />
                  </div>
                  
                  {/* From Time */}
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-[11px] text-muted-foreground">
                      {customFrom ? format(customFrom, "dd/MM/yyyy", { locale: vi }) : "Chọn ngày trước"}
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="text"
                        value={fromTime.hours}
                        onChange={(e) => {
                          const val = formatTimeInput(e.target.value, 23);
                          setFromTime({ ...fromTime, hours: val });
                        }}
                        onBlur={(e) => {
                          const val = formatTimeInput(e.target.value, 23);
                          setFromTime({ ...fromTime, hours: val });
                        }}
                        placeholder="HH"
                        className="h-8 text-center text-sm"
                        maxLength={2}
                        disabled={!customFrom}
                      />
                      <span className="text-muted-foreground text-sm">:</span>
                      <Input
                        type="text"
                        value={fromTime.minutes}
                        onChange={(e) => {
                          const val = formatTimeInput(e.target.value, 59);
                          setFromTime({ ...fromTime, minutes: val });
                        }}
                        onBlur={(e) => {
                          const val = formatTimeInput(e.target.value, 59);
                          setFromTime({ ...fromTime, minutes: val });
                        }}
                        placeholder="MM"
                        className="h-8 text-center text-sm"
                        maxLength={2}
                        disabled={!customFrom}
                      />
                      <Clock className="h-3.5 w-3.5 text-muted-foreground ml-1 shrink-0" />
                    </div>
                  </div>
                </div>

                {/* To Date */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground/80">Đến ngày</Label>
                  <div className="border rounded-md overflow-hidden">
                    <Calendar
                      mode="single"
                      selected={customTo}
                      onSelect={setCustomTo}
                      className="p-0"
                      classNames={{
                        months: "flex w-full",
                        month: "w-full",
                        caption: "flex justify-center pt-2 relative items-center px-8",
                        nav: "flex items-center gap-1",
                        table: "w-full border-collapse",
                        head_row: "flex w-full",
                        head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] flex-1 text-center",
                        row: "flex w-full mt-1",
                        cell: "flex-1 text-center text-sm p-0",
                        day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 mx-auto",
                      }}
                    />
                  </div>
                  
                  {/* To Time */}
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-[11px] text-muted-foreground">
                      {customTo ? format(customTo, "dd/MM/yyyy", { locale: vi }) : "Chọn ngày trước"}
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="text"
                        value={toTime.hours}
                        onChange={(e) => {
                          const val = formatTimeInput(e.target.value, 23);
                          setToTime({ ...toTime, hours: val });
                        }}
                        onBlur={(e) => {
                          const val = formatTimeInput(e.target.value, 23);
                          setToTime({ ...toTime, hours: val });
                        }}
                        placeholder="HH"
                        className="h-8 text-center text-sm"
                        maxLength={2}
                        disabled={!customTo}
                      />
                      <span className="text-muted-foreground text-sm">:</span>
                      <Input
                        type="text"
                        value={toTime.minutes}
                        onChange={(e) => {
                          const val = formatTimeInput(e.target.value, 59);
                          setToTime({ ...toTime, minutes: val });
                        }}
                        onBlur={(e) => {
                          const val = formatTimeInput(e.target.value, 59);
                          setToTime({ ...toTime, minutes: val });
                        }}
                        placeholder="MM"
                        className="h-8 text-center text-sm"
                        maxLength={2}
                        disabled={!customTo}
                      />
                      <Clock className="h-3.5 w-3.5 text-muted-foreground ml-1 shrink-0" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Apply Button */}
              <Button
                size="sm"
                className="w-full h-9 bg-[#155DFC] hover:bg-[#155DFC]/90"
                onClick={handleCustomApply}
                disabled={!customFrom && !customTo}
              >
                Áp dụng khoảng thời gian
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}