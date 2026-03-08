import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNotifications, MissedCall } from "@/components/NotificationContext";
import { 
  Phone,
  PhoneCall,
  Eye,
  X,
  Clock,
  AlertTriangle,
  Crown,
  Volume2,
  VolumeX,
  User
} from "lucide-react";

interface MissedCallNotificationProps {
  missedCall: MissedCall;
  onViewDetails?: (callId: string) => void;
  onCallBack?: (callId: string) => void;
}

export function MissedCallNotification({ 
  missedCall, 
  onViewDetails, 
  onCallBack 
}: MissedCallNotificationProps) {
  const { 
    removeNotification, 
    markMissedCallAsViewed, 
    markCallbackAttempted,
    settings 
  } = useNotifications();
  
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState(settings.autoHideAfter);

  // Countdown timer
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatPhoneNumber = (phone: string) => {
    // Format phone number for display
    if (phone.startsWith('+84')) {
      return phone.replace('+84', '0').replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
    }
    return phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  };

  const getReasonText = (reason: MissedCall['reason']) => {
    switch (reason) {
      case 'timeout': return 'Không trả lời';
      case 'not-ready': return 'Không sẵn sàng';
      case 'disconnected': return 'Mất kết nối';
      case 'away': return 'Tạm vắng';
      default: return 'Không xác định';
    }
  };

  const getReasonColor = (reason: MissedCall['reason']) => {
    switch (reason) {
      case 'timeout': return 'text-yellow-600 bg-yellow-50';
      case 'not-ready': return 'text-orange-600 bg-orange-50';
      case 'disconnected': return 'text-red-600 bg-red-50';
      case 'away': return 'text-muted-foreground bg-muted/50';
      default: return 'text-muted-foreground bg-muted/50';
    }
  };

  const getPriorityColor = (priority: MissedCall['priority']) => {
    switch (priority) {
      case 'urgent': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-blue-500 bg-blue-50';
      case 'low': return 'border-gray-500 bg-muted/50';
      default: return 'border-gray-500 bg-muted/50';
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      removeNotification(missedCall.id);
    }, 200); // Allow fade out animation
  };

  const handleViewDetails = () => {
    markMissedCallAsViewed(missedCall.id);
    onViewDetails?.(missedCall.id);
    handleDismiss();
  };

  const handleCallBack = () => {
    markCallbackAttempted(missedCall.id);
    onCallBack?.(missedCall.id);
    handleDismiss();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <TooltipProvider>
      <Card className={`
        w-80 shadow-lg border-l-4 transition-all duration-200 
        ${getPriorityColor(missedCall.priority)}
        ${isVisible ? 'animate-in slide-in-from-right' : 'animate-out slide-out-to-right'}
      `}>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Phone className="h-5 w-5 text-orange-600" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-orange-800">Cuộc gọi nhỡ</span>
                  {missedCall.isVIP && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Crown className="h-4 w-4 text-yellow-600" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Khách hàng VIP</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Countdown timer */}
                <div className="text-xs text-muted-foreground min-w-[20px] text-center">
                  {timeLeft}s
                </div>
                
                {/* Sound indicator */}
                {settings.enableSound ? (
                  <Volume2 className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <VolumeX className="h-3 w-3 text-muted-foreground" />
                )}
                
                {/* Close button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-muted-foreground"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Customer Info */}
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${missedCall.customerPhone}`} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-foreground">
                    {formatPhoneNumber(missedCall.customerPhone)}
                  </span>
                  <Badge className={`text-xs ${getReasonColor(missedCall.reason)}`}>
                    {getReasonText(missedCall.reason)}
                  </Badge>
                </div>
                
                {missedCall.customerName && (
                  <p className="text-sm text-muted-foreground">{missedCall.customerName}</p>
                )}
                
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatTime(missedCall.missedAt)}</span>
                  <span>•</span>
                  <span>{missedCall.source}</span>
                </div>
              </div>
            </div>

            {/* Priority and VIP indicators */}
            <div className="flex items-center space-x-2">
              {missedCall.priority === 'urgent' && (
                <Badge className="text-xs bg-red-100 text-red-800 border-red-200">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Khẩn cấp
                </Badge>
              )}
              {missedCall.priority === 'high' && (
                <Badge className="text-xs bg-orange-100 text-orange-800 border-orange-200">
                  Ưu tiên cao
                </Badge>
              )}
              {missedCall.isVIP && (
                <Badge className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200">
                  <Crown className="h-3 w-3 mr-1" />
                  VIP
                </Badge>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewDetails}
                className="flex-1 h-8 text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                Xem chi tiết
              </Button>
              <Button
                size="sm"
                onClick={handleCallBack}
                className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
              >
                <PhoneCall className="h-3 w-3 mr-1" />
                Gọi lại
              </Button>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-border rounded-full h-1">
              <div 
                className="bg-orange-400 h-1 rounded-full transition-all duration-1000 ease-linear"
                style={{ 
                  width: `${(timeLeft / settings.autoHideAfter) * 100}%` 
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}