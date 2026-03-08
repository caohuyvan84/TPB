import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChatSLABadge, WaitingTimeBadge, SLAStatus } from "@/components/ChatSLABadge";
import {
  User,
  MessageCircle,
  Facebook,
  Mail,
  Clock,
  XCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { useState } from "react";
import { toast } from "sonner@2.0.3";

interface ChatSessionHeaderProps {
  customerName: string;
  customerAvatar?: string;
  channel: "facebook" | "zalo" | "livechat" | "other";
  channelName?: string;
  startTime: string;
  sessionStatus: "open" | "closed";
  slaStatus: SLAStatus;
  slaRemainingSeconds?: number;
  slaThresholdMinutes?: number;
  firstResponseTime?: string;
  waitingSeconds?: number;
  onCloseSession?: () => void;
}

export function ChatSessionHeader({
  customerName,
  customerAvatar,
  channel,
  channelName,
  startTime,
  sessionStatus,
  slaStatus,
  slaRemainingSeconds,
  slaThresholdMinutes = 5,
  firstResponseTime,
  waitingSeconds,
  onCloseSession,
}: ChatSessionHeaderProps) {
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closing, setClosing] = useState(false);

  const getChannelIcon = () => {
    switch (channel) {
      case "facebook":
        return <Facebook className="h-4 w-4" />;
      case "zalo":
        return <MessageCircle className="h-4 w-4" />;
      case "livechat":
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getChannelColor = () => {
    switch (channel) {
      case "facebook":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "zalo":
        return "bg-sky-100 text-sky-700 border-sky-300";
      case "livechat":
        return "bg-purple-100 text-purple-700 border-purple-300";
      default:
        return "bg-muted text-foreground/80 border-gray-300";
    }
  };

  const handleCloseSession = async () => {
    setClosing(true);
    try {
      await onCloseSession?.();
      toast.success("Đã đóng phiên chat thành công");
      setShowCloseDialog(false);
    } catch (error) {
      toast.error("Có lỗi xảy ra khi đóng phiên chat");
    } finally {
      setClosing(false);
    }
  };

  return (
    <>
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Customer info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 bg-muted flex items-center justify-center">
              {customerAvatar ? (
                <span className="text-xl">{customerAvatar}</span>
              ) : (
                <User className="h-5 w-5 text-muted-foreground" />
              )}
            </Avatar>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{customerName}</h3>
                <Badge
                  variant={sessionStatus === "open" ? "default" : "secondary"}
                  className={cn(
                    "text-xs",
                    sessionStatus === "open"
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-muted text-foreground/80 border-gray-300"
                  )}
                >
                  {sessionStatus === "open" ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Đang mở
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Đã đóng
                    </>
                  )}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={cn("text-xs", getChannelColor())}
                >
                  {getChannelIcon()}
                  <span className="ml-1">
                    {channelName ||
                      channel.charAt(0).toUpperCase() + channel.slice(1)}
                  </span>
                </Badge>
                <span className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Bắt đầu {startTime}
                </span>
              </div>
            </div>
          </div>

          {/* Right side - SLA and actions */}
          <div className="flex items-center gap-3">
            {/* Waiting time badge */}
            {waitingSeconds !== undefined && waitingSeconds > 0 && (
              <WaitingTimeBadge waitingSeconds={waitingSeconds} />
            )}

            {/* SLA badge */}
            <ChatSLABadge
              status={slaStatus}
              remainingSeconds={slaRemainingSeconds}
              slaThresholdMinutes={slaThresholdMinutes}
              firstResponseTime={firstResponseTime}
              showCountdown={slaStatus === "not-responded"}
              size="md"
            />

            {/* Info tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-2">
                    <p className="font-medium">Thông tin SLA</p>
                    <div className="space-y-1 text-xs">
                      <p>
                        • Mục tiêu phản hồi đầu tiên: {slaThresholdMinutes}{" "}
                        phút
                      </p>
                      {firstResponseTime && (
                        <p>• Thời gian phản hồi thực tế: {firstResponseTime}</p>
                      )}
                      {waitingSeconds !== undefined && waitingSeconds > 0 && (
                        <p>
                          • Khách hàng đang chờ phản hồi:{" "}
                          {Math.floor(waitingSeconds / 60)}m{" "}
                          {waitingSeconds % 60}s
                        </p>
                      )}
                      <p>• Trạng thái phiên: {sessionStatus === "open" ? "Đang mở" : "Đã đóng"}</p>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Close session button */}
            {sessionStatus === "open" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCloseDialog(true)}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Đóng phiên
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Close session confirmation dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Xác nhận đóng phiên chat</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn đóng phiên chat với khách hàng{" "}
              <span className="font-medium">{customerName}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Sau khi đóng phiên, khách hàng sẽ không thể tiếp tục chat trong
              phiên này. Phiên chat sẽ được chuyển sang tab "Đã đóng" để bạn
              có thể xem lại lịch sử.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCloseDialog(false)}
              disabled={closing}
            >
              Hủy
            </Button>
            <Button
              onClick={handleCloseSession}
              disabled={closing}
              className="bg-red-600 hover:bg-red-700"
            >
              {closing ? "Đang đóng..." : "Đóng phiên"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}