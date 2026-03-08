import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useEnhancedAgentStatus as useAgentStatus, ChannelType, NotReadyReason } from "@/components/EnhancedAgentStatusContext";
import { AgentSettingsSidebar } from "@/components/AgentSettingsSidebar";
import { 
  Phone, 
  Mail, 
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Coffee,
  GraduationCap,
  Users,
  Wrench,
  Settings,
  AlertTriangle,
  ChevronDown,
  Power,
  MoreVertical,
  ChevronRight
} from "lucide-react";

const channelConfig = {
  voice: {
    label: 'Voice (Cuộc gọi)',
    icon: Phone,
    color: 'text-blue-600',
    readyColor: 'bg-blue-500',
    notReadyColor: 'bg-red-500'
  },
  email: {
    label: 'Email',
    icon: Mail,
    color: 'text-orange-600', 
    readyColor: 'bg-orange-500',
    notReadyColor: 'bg-red-500'
  },
  chat: {
    label: 'Chat (Tin nhắn)',
    icon: MessageSquare,
    color: 'text-green-600',
    readyColor: 'bg-green-500',
    notReadyColor: 'bg-red-500'
  }
};

const notReadyReasons: { value: NotReadyReason; label: string; icon: any; description: string }[] = [
  {
    value: 'break',
    label: 'Nghỉ giải lao',
    icon: Coffee,
    description: 'Tạm nghỉ giải lao'
  },
  {
    value: 'training',
    label: 'Đào tạo',
    icon: GraduationCap,
    description: 'Tham gia đào tạo/học tập'
  },
  {
    value: 'meeting',
    label: 'Họp',
    icon: Users,
    description: 'Tham gia cuộc họp'
  },
  {
    value: 'technical-issue',
    label: 'Sự cố kỹ thuật',
    icon: Wrench,
    description: 'Gặp sự cố kỹ thuật'
  },
  {
    value: 'system-maintenance',
    label: 'Bảo trì hệ thống',
    icon: Settings,
    description: 'Hệ thống đang bảo trì'
  },
  {
    value: 'other',
    label: 'Khác',
    icon: AlertTriangle,
    description: 'Lý do khác'
  }
];

interface ChannelStatusCardProps {
  channel: ChannelType;
  compact?: boolean;
}

function ChannelStatusCard({ channel, compact = false }: ChannelStatusCardProps) {
  const { getChannelStatus, setChannelStatus, isChannelReady } = useAgentStatus();
  const [selectedReason, setSelectedReason] = useState<NotReadyReason>('break');
  const [customReason, setCustomReason] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  const channelStatus = getChannelStatus(channel);
  const isReady = isChannelReady(channel);
  const config = channelConfig[channel];
  const Icon = config.icon;

  const handleStatusChange = async (newStatus: boolean) => {
    if (newStatus) {
      // Ready - change immediately
      setChannelStatus(channel, 'ready');
    } else {
      // Not ready - show reason selection
      setIsChanging(true);
    }
  };

  const handleNotReadyConfirm = () => {
    const reason = selectedReason === 'other' && customReason.trim() 
      ? customReason.trim() 
      : undefined;

    setChannelStatus(channel, 'not-ready', selectedReason, reason);
    setIsChanging(false);
    setCustomReason('');
  };

  const handleNotReadyCancel = () => {
    setIsChanging(false);
    setCustomReason('');
    setSelectedReason('break');
  };

  const getReasonDisplay = () => {
    if (!channelStatus.reason) return '';
    
    const reasonConfig = notReadyReasons.find(r => r.value === channelStatus.reason);
    if (channelStatus.reason === 'other' && channelStatus.customReason) {
      return channelStatus.customReason;
    }
    return reasonConfig?.label || channelStatus.reason;
  };

  const formatLastChanged = (date: Date) => {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Vừa xong';
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    
    return date.toLocaleDateString('vi-VN');
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-3 py-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.color}`}>
          <Icon className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <Label className="text-sm">{config.label}</Label>
            <Badge 
              className={`text-xs ${
                isReady 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {isReady ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Ready
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Ready
                </>
              )}
            </Badge>
          </div>
          
          {!isReady && channelStatus.reason && (
            <p className="text-xs text-muted-foreground truncate">
              {getReasonDisplay()}
            </p>
          )}
        </div>

        <Switch
          checked={isReady}
          onCheckedChange={handleStatusChange}
          className={isReady ? config.readyColor : config.notReadyColor}
        />

        {/* Not Ready Reason Dialog */}
        {isChanging && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <Card className="w-96 max-w-[90vw]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center">
                  <Icon className={`h-4 w-4 mr-2 ${config.color}`} />
                  Chuyển {config.label} sang Not Ready
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm">Chọn lý do:</Label>
                  <Select value={selectedReason} onValueChange={(value: NotReadyReason) => setSelectedReason(value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {notReadyReasons.map((reason) => {
                        const ReasonIcon = reason.icon;
                        return (
                          <SelectItem key={reason.value} value={reason.value}>
                            <div className="flex items-center space-x-2">
                              <ReasonIcon className="h-4 w-4" />
                              <div>
                                <div className="text-sm">{reason.label}</div>
                                <div className="text-xs text-muted-foreground">{reason.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {selectedReason === 'other' && (
                  <div>
                    <Label className="text-sm">Mô tả chi tiết:</Label>
                    <Textarea
                      placeholder="Nhập lý do chi tiết..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleNotReadyCancel}
                    className="flex-1"
                  >
                    Hủy
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleNotReadyConfirm}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    disabled={selectedReason === 'other' && !customReason.trim()}
                  >
                    Xác nhận
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // Full card view
  return (
    <Card className={`border-l-4 ${isReady ? 'border-l-green-500' : 'border-l-red-500'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon className={`h-5 w-5 ${config.color}`} />
            <CardTitle className="text-base">{config.label}</CardTitle>
          </div>
          
          <Switch
            checked={isReady}
            onCheckedChange={handleStatusChange}
          />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isReady ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800">Sẵn sàng nhận tương tác</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-800">Không sẵn sàng</span>
                </>
              )}
            </div>
            
            <Badge className={isReady ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {isReady ? 'Ready' : 'Not Ready'}
            </Badge>
          </div>

          {!isReady && channelStatus.reason && (
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="flex items-center space-x-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Lý do:</span>
              </div>
              <p className="text-sm text-foreground/80">{getReasonDisplay()}</p>
            </div>
          )}

          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Thay đổi {formatLastChanged(channelStatus.lastChanged)}</span>
          </div>
        </div>
      </CardContent>

      {/* Not Ready Reason Dialog */}
      {isChanging && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <Card className="w-96 max-w-[90vw]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Icon className={`h-4 w-4 mr-2 ${config.color}`} />
                Chuyển {config.label} sang Not Ready
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm">Chọn lý do:</Label>
                <Select value={selectedReason} onValueChange={(value: NotReadyReason) => setSelectedReason(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {notReadyReasons.map((reason) => {
                      const ReasonIcon = reason.icon;
                      return (
                        <SelectItem key={reason.value} value={reason.value}>
                          <div className="flex items-center space-x-2">
                            <ReasonIcon className="h-4 w-4" />
                            <div>
                              <div className="text-sm">{reason.label}</div>
                              <div className="text-xs text-muted-foreground">{reason.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedReason === 'other' && (
                <div>
                  <Label className="text-sm">Mô tả chi tiết:</Label>
                  <Textarea
                    placeholder="Nhập lý do chi tiết..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="mt-1"
                    rows={2}
                  />
                </div>
              )}

              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleNotReadyCancel}
                  className="flex-1"
                >
                  Hủy
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleNotReadyConfirm}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  disabled={selectedReason === 'other' && !customReason.trim()}
                >
                  Xác nhận
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}

interface AgentChannelStatusProps {
  compact?: boolean;
}

export function AgentChannelStatus({ compact = false }: AgentChannelStatusProps) {
  const { 
    getReadyChannelsCount, 
    getTotalChannelsCount, 
    setAllChannelsStatus 
  } = useAgentStatus();
  const [bulkAction, setBulkAction] = useState<'ready' | 'not-ready' | null>(null);
  const [selectedReason, setSelectedReason] = useState<NotReadyReason>('break');
  const [customReason, setCustomReason] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const readyCount = getReadyChannelsCount();
  const totalCount = getTotalChannelsCount();

  const handleBulkAction = (action: 'ready' | 'not-ready') => {
    if (action === 'ready') {
      setAllChannelsStatus('ready');
    } else {
      setBulkAction('not-ready');
    }
  };

  const handleBulkNotReadyConfirm = () => {
    const reason = selectedReason === 'other' && customReason.trim() 
      ? customReason.trim() 
      : undefined;

    setAllChannelsStatus('not-ready', selectedReason, reason);
    setBulkAction(null);
    setCustomReason('');
    setSelectedReason('break');
  };

  const handleBulkNotReadyCancel = () => {
    setBulkAction(null);
    setCustomReason('');
    setSelectedReason('break');
  };

  if (compact) {
    return (
      <>
        <div className="space-y-3">
          {/* Header với bulk actions */}
          <div className="flex items-center justify-between pb-2 border-b">
            <div className="flex items-center space-x-2">
              <Power className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Trạng thái kênh</span>
              <Badge className="text-xs bg-blue-100 text-blue-800">
                {readyCount}/{totalCount} Ready
              </Badge>
            </div>

            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkAction('ready')}
                className="text-green-700 hover:bg-green-50 h-6 px-2 text-xs"
              >
                All Ready
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkAction('not-ready')}
                className="text-red-700 hover:bg-red-50 h-6 px-2 text-xs"
              >
                All Not Ready
              </Button>
            </div>
          </div>

          {/* Channel status list */}
          <div className="space-y-2">
            {(['voice', 'email', 'chat'] as ChannelType[]).map((channel) => (
              <ChannelStatusCard key={channel} channel={channel} compact />
            ))}
          </div>

          {/* View Details Button - Prominent */}
          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSidebarOpen(true)}
              className="w-full text-[#155DFC] border-[#155DFC]/30 hover:bg-[#155DFC]/5 hover:border-[#155DFC] h-9 font-medium"
            >
              <Settings className="h-4 w-4 mr-2" />
              Xem chi tiết & quản lý tài nguyên
              <ChevronRight className="h-4 w-4 ml-auto" />
            </Button>
          </div>

          {/* Bulk Not Ready Dialog */}
          {bulkAction === 'not-ready' && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
              <Card className="w-96 max-w-[90vw]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center">
                    <Power className="h-4 w-4 mr-2 text-red-600" />
                    Chuyển tất cả kênh sang Not Ready
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm">Chọn lý do:</Label>
                    <Select value={selectedReason} onValueChange={(value: NotReadyReason) => setSelectedReason(value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {notReadyReasons.map((reason) => {
                          const ReasonIcon = reason.icon;
                          return (
                            <SelectItem key={reason.value} value={reason.value}>
                              <div className="flex items-center space-x-2">
                                <ReasonIcon className="h-4 w-4" />
                                <div>
                                  <div className="text-sm">{reason.label}</div>
                                  <div className="text-xs text-muted-foreground">{reason.description}</div>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedReason === 'other' && (
                    <div>
                      <Label className="text-sm">Mô tả chi tiết:</Label>
                      <Textarea
                        placeholder="Nhập lý do chi tiết..."
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleBulkNotReadyCancel}
                      className="flex-1"
                    >
                      Hủy
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleBulkNotReadyConfirm}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                      disabled={selectedReason === 'other' && !customReason.trim()}
                    >
                      Áp dụng tất cả
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Agent Settings Sidebar */}
        <AgentSettingsSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      </>
    );
  }

  // Full view
  return (
    <div className="space-y-6">
      {/* Header with summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Trạng thái Agent</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Quản lý tình trạng sẵn sàng cho từng kênh tương tác
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">{readyCount}/{totalCount}</div>
              <div className="text-sm text-muted-foreground">Kênh sẵn sàng</div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => handleBulkAction('ready')}
              className="text-green-700 border-green-300 hover:bg-green-50"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Tất cả Ready
            </Button>
            <Button
              variant="outline"
              onClick={() => handleBulkAction('not-ready')}
              className="text-red-700 border-red-300 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Tất cả Not Ready
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Channel status cards */}
      <div className="grid gap-4">
        {(['voice', 'email', 'chat'] as ChannelType[]).map((channel) => (
          <ChannelStatusCard key={channel} channel={channel} />
        ))}
      </div>

      {/* Bulk Not Ready Dialog */}
      {bulkAction === 'not-ready' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <Card className="w-96 max-w-[90vw]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Power className="h-4 w-4 mr-2 text-red-600" />
                Chuyển tất cả kênh sang Not Ready
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm">Chọn lý do:</Label>
                <Select value={selectedReason} onValueChange={(value: NotReadyReason) => setSelectedReason(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {notReadyReasons.map((reason) => {
                      const ReasonIcon = reason.icon;
                      return (
                        <SelectItem key={reason.value} value={reason.value}>
                          <div className="flex items-center space-x-2">
                            <ReasonIcon className="h-4 w-4" />
                            <div>
                              <div className="text-sm">{reason.label}</div>
                              <div className="text-xs text-muted-foreground">{reason.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedReason === 'other' && (
                <div>
                  <Label className="text-sm">Mô tả chi tiết:</Label>
                  <Textarea
                    placeholder="Nhập lý do chi tiết..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="mt-1"
                    rows={2}
                  />
                </div>
              )}

              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleBulkNotReadyCancel}
                  className="flex-1"
                >
                  Hủy
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleBulkNotReadyConfirm}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  disabled={selectedReason === 'other' && !customReason.trim()}
                >
                  Áp dụng tất cả
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}