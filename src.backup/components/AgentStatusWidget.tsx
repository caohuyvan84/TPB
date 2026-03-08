import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEnhancedAgentStatus, ChannelType, NotReadyReason } from "@/components/EnhancedAgentStatusContext";
import { AgentSettingsSidebar } from "@/components/AgentSettingsSidebar";
import { 
  Power,
  CheckCircle,
  XCircle,
  Clock,
  Phone, 
  Mail, 
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Wifi,
  WifiOff,
  AlertTriangle,
  Coffee,
  Utensils,
  GraduationCap,
  Users,
  Wrench,
  Settings,
  Timer,
  Zap,
  Activity,
  Signal
} from "lucide-react";

const channelConfig = {
  voice: {
    label: 'Call',
    icon: Phone,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  email: {
    label: 'Email',
    icon: Mail,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  chat: {
    label: 'Chat',
    icon: MessageSquare,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  }
};

const notReadyReasons: { value: NotReadyReason; label: string; icon: any; color: string }[] = [
  { value: 'break', label: 'Nghỉ giải lao', icon: Coffee, color: 'text-amber-600' },
  { value: 'lunch', label: 'Nghỉ trưa', icon: Utensils, color: 'text-orange-600' },
  { value: 'training', label: 'Đào tạo', icon: GraduationCap, color: 'text-blue-600' },
  { value: 'meeting', label: 'Họp', icon: Users, color: 'text-purple-600' },
  { value: 'technical-issue', label: 'Sự cố kỹ thuật', icon: Wrench, color: 'text-red-600' },
  { value: 'system-maintenance', label: 'Bảo trì hệ thống', icon: Settings, color: 'text-muted-foreground' },
  { value: 'toilet', label: 'WC', icon: AlertTriangle, color: 'text-yellow-600' },
  { value: 'other', label: 'Khác', icon: AlertTriangle, color: 'text-muted-foreground' }
];

interface AgentStatusWidgetProps {
  position?: 'header' | 'floating';
  showDetailedView?: boolean;
}

export function AgentStatusWidget({ 
  position = 'header',
  showDetailedView = false 
}: AgentStatusWidgetProps) {
  const {
    channelStatuses,
    getReadyChannelsCount,
    getTotalChannelsCount,
    setChannelStatus,
    goReadyAll,
    goNotReadyAll,
    connectionStatus,
    getCurrentStatusDuration,
    agentState,
    formatDuration
  } = useEnhancedAgentStatus();

  // State management for inline reason selection
  const [hoverCardOpen, setHoverCardOpen] = useState(false);
  const [showNotReadyReasonFor, setShowNotReadyReasonFor] = useState<{
    type: 'all' | 'channel';
    channel?: ChannelType;
  } | null>(null);
  const [selectedReason, setSelectedReason] = useState<NotReadyReason>('break');
  const [customReason, setCustomReason] = useState('');
  const [connectionWarning, setConnectionWarning] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const readyCount = getReadyChannelsCount();
  const totalCount = getTotalChannelsCount();

  // Connection status monitoring
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      setConnectionWarning(true);
      const timeout = setTimeout(() => setConnectionWarning(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [connectionStatus]);

  // Reset reason selection when hover card closes
  useEffect(() => {
    if (!hoverCardOpen) {
      // Use longer delay to allow user to interact before cleanup
      const timeoutId = setTimeout(() => {
        setShowNotReadyReasonFor(null);
        setSelectedReason('break');
        setCustomReason('');
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [hoverCardOpen]);

  const getOverallStatus = () => {
    if (connectionStatus === 'disconnected') {
      return {
        status: 'disconnected',
        label: 'Mất kết nối',
        icon: WifiOff,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-500',
        pulseColor: 'bg-red-500'
      };
    }

    if (readyCount === totalCount) {
      return {
        status: 'all-ready',
        label: 'Sẵn sàng',
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-500',
        pulseColor: 'bg-green-500'
      };
    } else if (readyCount === 0) {
      return {
        status: 'all-not-ready',
        label: 'Không sẵn sàng',
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-500',
        pulseColor: 'bg-red-500'
      };
    } else {
      return {
        status: 'mixed',
        label: 'Một phần sẵn sàng',
        icon: Power,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-500',
        pulseColor: 'bg-yellow-500'
      };
    }
  };

  const handleQuickReady = () => {
    goReadyAll();
    setHoverCardOpen(false);
  };

  const handleQuickNotReady = () => {
    setShowNotReadyReasonFor({ type: 'all' });
  };

  const handleChannelToggle = (channel: ChannelType, checked: boolean) => {
    if (checked) {
      // Going to Ready state
      setChannelStatus(channel, 'ready');
      // Clear any pending reason selection for this channel
      if (showNotReadyReasonFor?.type === 'channel' && showNotReadyReasonFor?.channel === channel) {
        setShowNotReadyReasonFor(null);
      }
    } else {
      // Going to Not Ready state - show inline reason selection
      setShowNotReadyReasonFor({ type: 'channel', channel });
    }
  };

  const handleNotReadyConfirm = () => {
    const reason = selectedReason === 'other' && customReason.trim() 
      ? customReason.trim() 
      : undefined;

    if (showNotReadyReasonFor?.type === 'all') {
      goNotReadyAll(selectedReason, reason);
      setHoverCardOpen(false);
    } else if (showNotReadyReasonFor?.type === 'channel' && showNotReadyReasonFor.channel) {
      setChannelStatus(showNotReadyReasonFor.channel, 'not-ready', selectedReason, reason);
    }

    // Reset reason selection
    setShowNotReadyReasonFor(null);
    setSelectedReason('break');
    setCustomReason('');
  };

  const handleReasonCancel = () => {
    // If it was a channel toggle, revert the switch back to ready
    if (showNotReadyReasonFor?.type === 'channel' && showNotReadyReasonFor.channel) {
      // The switch is already in the "off" position, but the actual status is still "ready"
      // So we don't need to do anything, just hide the reason selection
    }
    
    setShowNotReadyReasonFor(null);
    setSelectedReason('break');
    setCustomReason('');
  };

  const getChannelTooltip = (channel: ChannelType, isReady: boolean) => {
    const channelName = channelConfig[channel].label;
    if (isReady) {
      return `Sẵn sàng nhận ${channelName.toLowerCase()}`;
    } else {
      return `Không sẵn sàng nhận ${channelName.toLowerCase()}`;
    }
  };

  const overallStatus = getOverallStatus();
  const StatusIcon = overallStatus.icon;

  if (position === 'floating') {
    return (
      <TooltipProvider>
        <div className="fixed bottom-6 right-6 z-50">
          <Card className={`${overallStatus.bgColor} ${overallStatus.borderColor} border-2 shadow-lg`}>
            <CardContent className="p-3">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <StatusIcon className={`h-6 w-6 ${overallStatus.color}`} />
                  {connectionStatus === 'disconnected' && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                  )}
                </div>
                
                <div>
                  <p className="font-medium text-sm">{overallStatus.label}</p>
                  <p className="text-xs text-muted-foreground">{readyCount}/{totalCount} kênh</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <HoverCard 
        openDelay={200} 
        closeDelay={300}
        open={hoverCardOpen}
        onOpenChange={setHoverCardOpen}
      >
        <HoverCardTrigger asChild>
          <Button 
            variant="ghost" 
            className={`flex items-center space-x-2 px-3 py-2 h-auto ${overallStatus.bgColor} ${overallStatus.borderColor} border-2 hover:${overallStatus.bgColor} transition-all cursor-pointer`}
          >
            <div className="relative">
              <StatusIcon className={`h-4 w-4 ${overallStatus.color}`} />
              {connectionWarning && (
                <div className={`absolute -top-1 -right-1 w-2 h-2 ${overallStatus.pulseColor} rounded-full animate-ping`}></div>
              )}
            </div>
            
            <div className="text-left">
              <div className={`text-sm font-medium ${overallStatus.color}`}>
                {overallStatus.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {readyCount}/{totalCount} kênh
              </div>
            </div>
            
            <ChevronDown className={`h-3 w-3 ${overallStatus.color}`} />
          </Button>
        </HoverCardTrigger>

        <HoverCardContent 
          className="w-80 p-4" 
          align="center"
          onMouseEnter={() => setHoverCardOpen(true)}
          onMouseLeave={() => {
            // Only close if no reason selection is active
            if (!showNotReadyReasonFor) {
              setHoverCardOpen(false);
            }
          }}
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Trạng thái Agent</span>
                {connectionStatus === 'connected' && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Signal className="h-3 w-3 text-green-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Kết nối ổn định</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              
              <Badge className={`${overallStatus.bgColor} ${overallStatus.color}`}>
                {overallStatus.label}
              </Badge>
            </div>

            {/* Connection Warning */}
            {connectionStatus === 'disconnected' && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-3">
                  <div className="flex items-center space-x-2">
                    <WifiOff className="h-4 w-4 text-red-600" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Mất kết nối mạng</p>
                      <p className="text-xs text-red-600">Đang thử kết nối lại...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleQuickReady}
                disabled={connectionStatus === 'disconnected'}
                className="flex-1 text-green-700 border-green-300 hover:bg-green-50"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Ready All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleQuickNotReady}
                disabled={connectionStatus === 'disconnected'}
                className="flex-1 text-red-700 border-red-300 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Not Ready All
              </Button>
            </div>

            {/* Inline Not Ready All Reason Selection */}
            {showNotReadyReasonFor?.type === 'all' && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center space-x-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">Chọn lý do Not Ready cho tất cả kênh:</span>
                  </div>
                  
                  <div>
                    <Select value={selectedReason} onValueChange={(value: NotReadyReason) => setSelectedReason(value)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {notReadyReasons.map((reason) => {
                          const ReasonIcon = reason.icon;
                          return (
                            <SelectItem key={reason.value} value={reason.value}>
                              <div className="flex items-center space-x-2">
                                <ReasonIcon className={`h-3 w-3 ${reason.color}`} />
                                <span className="text-sm">{reason.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedReason === 'other' && (
                    <Textarea
                      placeholder="Nhập lý do chi tiết..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className="text-sm"
                      rows={2}
                    />
                  )}

                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleReasonCancel}
                      className="flex-1 h-8 text-xs"
                    >
                      Hủy
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleNotReadyConfirm}
                      className="flex-1 h-8 text-xs bg-red-600 hover:bg-red-700"
                      disabled={selectedReason === 'other' && !customReason.trim()}
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Xác nhận
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Individual Channel Controls */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm font-medium text-foreground/80">
                <Timer className="h-4 w-4" />
                <span>Kênh riêng biệt</span>
              </div>

              {(['voice', 'email', 'chat'] as ChannelType[]).map((channel) => {
                const config = channelConfig[channel];
                const status = channelStatuses[channel];
                const Icon = config.icon;
                const isReady = status.status === 'ready';
                const showingReasonForThisChannel = showNotReadyReasonFor?.type === 'channel' && showNotReadyReasonFor?.channel === channel;
                
                return (
                  <div key={channel} className="space-y-2">
                    <div className={`flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 border ${
                      showingReasonForThisChannel ? 'border-red-200 bg-red-50' : 'border-border/50'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded ${config.bgColor}`}>
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{config.label}</span>
                            <Badge className={`text-xs ${
                              isReady 
                                ? 'bg-green-100 text-green-800' 
                                : status.status === 'disconnected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {isReady ? 'Ready' : status.status === 'disconnected' ? 'Disconnected' : 'Not Ready'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{getCurrentStatusDuration(channel)}</span>
                            {!isReady && status.reason && !showingReasonForThisChannel && (
                              <>
                                <span>•</span>
                                <span>{notReadyReasons.find(r => r.value === status.reason)?.label}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center">
                            <Switch
                              checked={isReady}
                              onCheckedChange={(checked) => handleChannelToggle(channel, checked)}
                              disabled={connectionStatus === 'disconnected'}
                              className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p>{getChannelTooltip(channel, isReady)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Inline Channel Reason Selection */}
                    {showingReasonForThisChannel && (
                      <Card className="border-orange-200 bg-orange-50 ml-4">
                        <CardContent className="p-3 space-y-3">
                          <div className="flex items-center space-x-2">
                            <XCircle className="h-4 w-4 text-orange-600" />
                            <span className="text-sm font-medium text-orange-800">
                              Chọn lý do Not Ready cho {config.label}:
                            </span>
                          </div>
                          
                          <div>
                            <Select value={selectedReason} onValueChange={(value: NotReadyReason) => setSelectedReason(value)}>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {notReadyReasons.map((reason) => {
                                  const ReasonIcon = reason.icon;
                                  return (
                                    <SelectItem key={reason.value} value={reason.value}>
                                      <div className="flex items-center space-x-2">
                                        <ReasonIcon className={`h-3 w-3 ${reason.color}`} />
                                        <span className="text-sm">{reason.label}</span>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          {selectedReason === 'other' && (
                            <Textarea
                              placeholder="Nhập lý do chi tiết..."
                              value={customReason}
                              onChange={(e) => setCustomReason(e.target.value)}
                              className="text-sm"
                              rows={2}
                            />
                          )}

                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={handleReasonCancel}
                              className="flex-1 h-8 text-xs"
                            >
                              Hủy
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={handleNotReadyConfirm}
                              className="flex-1 h-8 text-xs bg-orange-600 hover:bg-orange-700"
                              disabled={selectedReason === 'other' && !customReason.trim()}
                            >
                              <Zap className="h-3 w-3 mr-1" />
                              Xác nhận
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Session Stats */}
            <Separator />
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Phiên làm việc:</span>
                <span className="font-medium">{formatDuration(Math.floor((new Date().getTime() - agentState.sessionStart.getTime()) / 1000))}</span>
              </div>
              <div className="flex justify-between">
                <span>Agent ID:</span>
                <span className="font-medium">{agentState.agentId}</span>
              </div>
            </div>

            {/* View Details Button */}
            <Separator />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsSidebarOpen(true);
                setHoverCardOpen(false);
              }}
              className="w-full text-[#155DFC] border-[#155DFC]/30 hover:bg-[#155DFC]/5 hover:border-[#155DFC] h-9 font-medium"
            >
              <Settings className="h-4 w-4 mr-2" />
              Xem chi tiết & quản lý tài nguyên
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>

            {/* Keyboard shortcuts info */}
            <div className="text-xs text-muted-foreground border-t pt-2">
              <p><kbd className="px-1 bg-muted rounded">Ctrl+R</kbd> Ready All • <kbd className="px-1 bg-muted rounded">Ctrl+N</kbd> Not Ready</p>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>

      {/* Agent Settings Sidebar */}
      <AgentSettingsSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </TooltipProvider>
  );
}