import { useEffect, useState } from "react";
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Clock, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from './ui/utils';

export type SLAStatus =
  | "not-responded"
  | "within-sla"
  | "near-breach"
  | "breached";

interface ChatSLABadgeProps {
  status: SLAStatus;
  remainingSeconds?: number; // For countdown
  slaThresholdMinutes?: number; // e.g., 5 minutes
  firstResponseTime?: string; // e.g., "2m 30s"
  showCountdown?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ChatSLABadge({
  status,
  remainingSeconds,
  slaThresholdMinutes = 5,
  firstResponseTime,
  showCountdown = true,
  size = "md",
}: ChatSLABadgeProps) {
  const [countdown, setCountdown] = useState(remainingSeconds || 0);

  useEffect(() => {
    if (status === "not-responded" && remainingSeconds && showCountdown) {
      setCountdown(remainingSeconds);

      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 0) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [status, remainingSeconds, showCountdown]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getBadgeConfig = () => {
    switch (status) {
      case "not-responded":
        return {
          icon: Clock,
          label: showCountdown
            ? `Còn lại ${formatCountdown(countdown)}`
            : "Chưa phản hồi",
          variant: countdown <= 60 ? "destructive" : "secondary",
          className:
            countdown <= 60
              ? "bg-red-100 text-red-700 border-red-300"
              : countdown <= 120
              ? "bg-amber-100 text-amber-700 border-amber-300"
              : "bg-blue-100 text-blue-700 border-blue-300",
          tooltipContent: `SLA phản hồi: ${slaThresholdMinutes} phút. ${
            countdown > 0 ? `Còn lại ${formatCountdown(countdown)}` : "Đã quá hạn"
          }`,
        };

      case "within-sla":
        return {
          icon: CheckCircle2,
          label: "Đã phản hồi đúng hạn",
          variant: "default",
          className: "bg-green-100 text-green-700 border-green-300",
          tooltipContent: `Đã phản hồi trong ${firstResponseTime || "SLA"}. Mục tiêu: ${slaThresholdMinutes} phút`,
        };

      case "near-breach":
        return {
          icon: AlertTriangle,
          label: showCountdown
            ? `Gần hết hạn (${formatCountdown(countdown)})`
            : "Gần hết hạn",
          variant: "warning",
          className: "bg-amber-100 text-amber-700 border-amber-300",
          tooltipContent: `Cảnh báo: Sắp hết thời gian phản hồi. SLA: ${slaThresholdMinutes} phút`,
        };

      case "breached":
        return {
          icon: XCircle,
          label: "Quá hạn phản hồi",
          variant: "destructive",
          className: "bg-red-100 text-red-700 border-red-300",
          tooltipContent: `Đã quá hạn SLA phản hồi. Mục tiêu: ${slaThresholdMinutes} phút`,
        };

      default:
        return {
          icon: Clock,
          label: "Không xác định",
          variant: "secondary",
          className: "bg-muted text-foreground/80 border-gray-300",
          tooltipContent: "Trạng thái SLA không xác định",
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={config.variant as any}
            className={cn(
              "flex items-center gap-1.5 font-medium border",
              config.className,
              sizeClasses[size],
              (status === "not-responded" || status === "near-breach") &&
                countdown <= 60 &&
                "animate-pulse"
            )}
          >
            <Icon className={iconSizes[size]} />
            <span>{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Helper component for waiting time display
interface WaitingTimeBadgeProps {
  waitingSeconds: number;
  warningThreshold?: number; // seconds, default 120 (2 mins)
}

export function WaitingTimeBadge({
  waitingSeconds,
  warningThreshold = 120,
}: WaitingTimeBadgeProps) {
  const formatWaitingTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}h ${remainMins}m`;
  };

  const isWarning = waitingSeconds >= warningThreshold;
  const isCritical = waitingSeconds >= warningThreshold * 2;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={isCritical ? "destructive" : "secondary"}
            className={cn(
              "flex items-center gap-1.5",
              isCritical
                ? "bg-red-100 text-red-700 border-red-300"
                : isWarning
                ? "bg-amber-100 text-amber-700 border-amber-300"
                : "bg-muted text-foreground/80 border-gray-300"
            )}
          >
            <Clock className="h-3 w-3" />
            <span>Chờ {formatWaitingTime(waitingSeconds)}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            Khách hàng đã chờ phản hồi {formatWaitingTime(waitingSeconds)}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
