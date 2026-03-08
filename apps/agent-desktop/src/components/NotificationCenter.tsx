import { useState } from "react";
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Switch } from './ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useNotifications, AppNotification, MissedCallNotification as MissedCallNotificationType, TicketAssignmentNotification, TicketDueNotification, SystemAlertNotification, ScheduleReminderNotification } from './NotificationContext';
import { MissedCallNotification as MissedCallNotificationComponent } from './MissedCallNotification';
import { 
  Bell,
  BellOff,
  Phone,
  PhoneCall,
  Eye,
  Settings,
  Trash2,
  Crown,
  AlertTriangle,
  Clock,
  User,
  CheckCircle,
  X,
  Ticket,
  Calendar,
  Shield,
  PhoneMissed,
  FileText,
  AlertCircle,
  Timer,
  ExternalLink,
  Archive,
  Zap,
  ChevronRight,
  Dot,
  Volume2,
  VolumeX,
  ChevronDown
} from "lucide-react";

interface NotificationCenterProps {
  onViewCallDetails?: (callId: string) => void;
  onCallBack?: (callId: string) => void;
  onViewTicket?: (ticketId: string) => void;
  onNavigateToSchedule?: () => void;
}

type NotificationTab = 'all' | 'missed-calls' | 'tickets' | 'system' | 'schedule';

export function NotificationCenter({ 
  onViewCallDetails, 
  onCallBack,
  onViewTicket,
  onNavigateToSchedule
}: NotificationCenterProps) {
  const {
    notifications,
    activeNotifications,
    settings,
    updateSettings,
    getUnreadCount,
    getUnreadCountByType,
    getNotificationStats,
    getNotReadyMissedCallsWarning,
    clearAllNotifications,
    clearOldNotifications,
    markAsViewed,
    markAsActioned,
    markAsDismissed,
    removeNotification
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const [showSettings, setShowSettings] = useState(false);

  const unreadCount = getUnreadCount();
  const stats = getNotificationStats();
  const notReadyWarning = getNotReadyMissedCallsWarning();

  const notificationTabs = [
    { 
      key: 'all' as const, 
      label: 'Tất cả', 
      shortLabel: 'All',
      icon: Bell, 
      count: stats.total,
      unread: unreadCount
    },
    { 
      key: 'missed-calls' as const, 
      label: 'Cuộc gọi', 
      shortLabel: 'Calls',
      icon: PhoneMissed, 
      count: stats.byType['missed-call'] || 0,
      unread: getUnreadCountByType('missed-call')
    },
    { 
      key: 'tickets' as const, 
      label: 'Tickets', 
      shortLabel: 'Tickets',
      icon: Ticket, 
      count: (stats.byType['ticket-assignment'] || 0) + (stats.byType['ticket-due'] || 0),
      unread: getUnreadCountByType('ticket-assignment') + getUnreadCountByType('ticket-due')
    },
    { 
      key: 'system' as const, 
      label: 'Hệ thống', 
      shortLabel: 'System',
      icon: Shield, 
      count: stats.byType['system-alert'] || 0,
      unread: getUnreadCountByType('system-alert')
    },
    { 
      key: 'schedule' as const, 
      label: 'Lịch trình', 
      shortLabel: 'Schedule',
      icon: Calendar, 
      count: stats.byType['schedule-reminder'] || 0,
      unread: getUnreadCountByType('schedule-reminder')
    }
  ];

  const getFilteredNotifications = () => {
    switch (activeTab) {
      case 'missed-calls':
        return notifications.filter(n => n.type === 'missed-call');
      case 'tickets':
        return notifications.filter(n => n.type === 'ticket-assignment' || n.type === 'ticket-due');
      case 'system':
        return notifications.filter(n => n.type === 'system-alert');
      case 'schedule':
        return notifications.filter(n => n.type === 'schedule-reminder');
      default:
        return notifications;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone.startsWith('+84')) {
      return phone.replace('+84', '0').replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
    }
    return phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  };

  const getNotificationIcon = (notification: AppNotification) => {
    switch (notification.type) {
      case 'missed-call': return PhoneMissed;
      case 'ticket-assignment': return FileText;
      case 'ticket-due': return Timer;
      case 'system-alert': return AlertCircle;
      case 'schedule-reminder': return Calendar;
      default: return Bell;
    }
  };

  const getPriorityColor = (priority: AppNotification['priority']) => {
    switch (priority) {
      case 'urgent': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-blue-500 bg-blue-50';
      case 'low': return 'border-gray-500 bg-muted/50';
    }
  };

  const getPriorityBadgeColor = (priority: AppNotification['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-muted text-foreground border-border';
    }
  };

  const getTypeIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'missed-call': return Phone;
      case 'ticket-assignment': return FileText;
      case 'ticket-due': return Timer;
      case 'system-alert': return Shield;
      case 'schedule-reminder': return Calendar;
      default: return Bell;
    }
  };

  const getTypeColor = (type: AppNotification['type']) => {
    switch (type) {
      case 'missed-call': return 'text-orange-600';
      case 'ticket-assignment': return 'text-blue-600';
      case 'ticket-due': return 'text-amber-600';
      case 'system-alert': return 'text-muted-foreground';
      case 'schedule-reminder': return 'text-purple-600';
      default: return 'text-muted-foreground';
    }
  };

  const getTypeLabel = (type: AppNotification['type']) => {
    switch (type) {
      case 'missed-call': return 'Cuộc gọi nhỡ';
      case 'ticket-assignment': return 'Ticket mới';
      case 'ticket-due': return 'Ticket hết hạn';
      case 'system-alert': return 'Cảnh báo hệ thống';
      case 'schedule-reminder': return 'Nhắc lịch';
      default: return 'Thông báo';
    }
  };

  const handleNotificationAction = (notification: AppNotification, action: 'view' | 'action' | 'dismiss') => {
    switch (action) {
      case 'view':
        markAsViewed(notification.id);
        if (notification.type === 'missed-call') {
          onViewCallDetails?.(notification.id);
        } else if (notification.type === 'ticket-assignment' || notification.type === 'ticket-due') {
          const ticketNotification = notification as TicketAssignmentNotification | TicketDueNotification;
          onViewTicket?.(ticketNotification.ticketId);
        } else if (notification.type === 'schedule-reminder') {
          onNavigateToSchedule?.();
        }
        break;
      case 'action':
        markAsActioned(notification.id);
        if (notification.type === 'missed-call') {
          onCallBack?.(notification.id);
        } else if (notification.type === 'ticket-assignment' || notification.type === 'ticket-due') {
          const ticketNotification = notification as TicketAssignmentNotification | TicketDueNotification;
          onViewTicket?.(ticketNotification.ticketId);
        }
        break;
      case 'dismiss':
        markAsDismissed(notification.id);
        break;
    }
  };

  // Unified notification rendering with consistent design
  const renderNotificationItem = (notification: AppNotification) => {
    const isNew = notification.status === 'new';
    const TypeIcon = getTypeIcon(notification.type);
    const typeColor = getTypeColor(notification.type);
    const typeLabel = getTypeLabel(notification.type);
    
    return (
      <Card key={notification.id} className={`border-l-4 shadow-sm hover:shadow-md transition-all duration-200 ${getPriorityColor(notification.priority)}`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <TypeIcon className={`h-5 w-5 ${typeColor}`} />
                  {isNew && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`font-medium ${typeColor.replace('text-', 'text-').replace('-600', '-800')}`}>
                    {typeLabel}
                  </span>
                  {notification.type === 'missed-call' && (notification as MissedCallNotificationType).isVIP && (
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
                  onClick={() => handleNotificationAction(notification, 'dismiss')}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-muted-foreground"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Content - Type-specific rendering */}
            {notification.type === 'missed-call' ? (
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${(notification as MissedCallNotificationType).customerPhone}`} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-foreground">
                      {formatPhoneNumber((notification as MissedCallNotificationType).customerPhone)}
                    </span>
                    <Badge className={`text-xs ${
                      (notification as MissedCallNotificationType).reason === 'timeout' ? 'bg-yellow-50 text-yellow-600' :
                      (notification as MissedCallNotificationType).reason === 'not-ready' ? 'bg-orange-50 text-orange-600' :
                      (notification as MissedCallNotificationType).reason === 'disconnected' ? 'bg-red-50 text-red-600' :
                      'bg-muted/50 text-muted-foreground'
                    }`}>
                      {(notification as MissedCallNotificationType).reason === 'timeout' ? 'Không trả lời' :
                       (notification as MissedCallNotificationType).reason === 'not-ready' ? 'Không sẵn sàng' :
                       (notification as MissedCallNotificationType).reason === 'disconnected' ? 'Mất kết nối' : 'Tạm vắng'}
                    </Badge>
                  </div>
                  
                  {(notification as MissedCallNotificationType).customerName && (
                    <p className="text-sm text-muted-foreground">{(notification as MissedCallNotificationType).customerName}</p>
                  )}
                  
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(notification.createdAt)}</span>
                    <span>•</span>
                    <span>{(notification as MissedCallNotificationType).source}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={`${typeColor.replace('text-', 'bg-').replace('-600', '-100')} ${typeColor}`}>
                    <TypeIcon className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <h4 className="font-medium text-foreground text-sm">{notification.title}</h4>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  
                  {/* Type-specific additional info */}
                  {(notification.type === 'ticket-assignment' || notification.type === 'ticket-due') && (
                    <div className="text-xs text-muted-foreground mt-1">
                      #{(notification as TicketAssignmentNotification | TicketDueNotification).ticketNumber} • 
                      {(notification as TicketAssignmentNotification | TicketDueNotification).customerName}
                      {notification.type === 'ticket-due' && (
                        <span className="text-orange-600 font-medium ml-2">
                          • Còn {(notification as TicketDueNotification).timeUntilDue} phút
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(notification.createdAt)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Priority and status indicators */}
            <div className="flex items-center space-x-2">
              {notification.priority === 'urgent' && (
                <Badge className={`text-xs ${getPriorityBadgeColor('urgent')}`}>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Khẩn cấp
                </Badge>
              )}
              {notification.priority === 'high' && (
                <Badge className={`text-xs ${getPriorityBadgeColor('high')}`}>
                  Ưu tiên cao
                </Badge>
              )}
              {notification.type === 'missed-call' && (notification as MissedCallNotificationType).isVIP && (
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
                onClick={() => handleNotificationAction(notification, 'view')}
                className="flex-1 h-8 text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                Xem chi tiết
              </Button>
              
              {notification.type === 'missed-call' ? (
                <Button
                  size="sm"
                  onClick={() => handleNotificationAction(notification, 'action')}
                  className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
                >
                  <PhoneCall className="h-3 w-3 mr-1" />
                  Gọi lại
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleNotificationAction(notification, 'action')}
                  className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {notification.type === 'ticket-assignment' || notification.type === 'ticket-due' ? 'Mở ticket' : 'Thực hiện'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <TooltipProvider>
      <div className="relative">
        {/* Active Notifications Container - Hidden by default */}
        {/* 
        <div className="fixed bottom-6 right-6 z-40 space-y-3 pointer-events-none">
          {activeNotifications.map((notification) => (
            <div key={notification.id} className="pointer-events-auto">
              {notification.type === 'missed-call' ? (
                <MissedCallToast
                  missedCall={notification as MissedCallNotification}
                  onViewDetails={onViewCallDetails}
                  onCallBack={onCallBack}
                />
              ) : (
                renderNotificationItem(notification)
              )}
            </div>
          ))}
        </div>
        */}

        {/* Notification Bell Button */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="relative">
              {settings.enableNotifications ? (
                <Bell className="h-5 w-5" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              
              {/* Notification Badge */}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </SheetTrigger>

          <SheetContent className="w-96 sm:w-[420px]" side="right">
            {/* Optimized Header - Reduced spacing */}
            <SheetHeader className="space-y-2 pb-2">
              <SheetTitle className="flex items-center justify-between text-base">
                <div className="flex items-center space-x-2">
                  <Bell className="h-4 w-4 text-blue-600" />
                  <span>Thông báo</span>
                  {stats.total > 0 && (
                    <Badge className="bg-blue-100 text-blue-800 text-xs h-5">
                      {stats.total}
                    </Badge>
                  )}
                </div>
                {/* Settings button hidden to avoid conflict with close button */}
                {/* 
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="h-7 w-7 p-0"
                >
                  <Settings className="h-3 w-3" />
                </Button>
                */}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Trung tâm thông báo hiển thị cuộc gọi nhỡ, ticket, lịch trình và cảnh báo hệ thống
              </SheetDescription>
              
              {/* Compact Quick Actions */}
              <div className="flex items-center space-x-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllNotifications}
                  disabled={activeNotifications.length === 0}
                  className="h-7 text-xs flex-1 px-2"
                >
                  <Archive className="h-3 w-3 mr-1" />
                  Ẩn tất cả
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearOldNotifications(24)}
                  className="h-7 text-xs flex-1 px-2"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Xóa cũ
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="h-7 w-7 p-0"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            </SheetHeader>

            <div className="mt-3 space-y-3">
              {/* Warning for Not Ready Status */}
              {notReadyWarning.shouldShowWarning && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-2.5">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-orange-800 font-medium">
                          {notReadyWarning.count} cuộc gọi nhỡ do Not Ready
                        </p>
                        <p className="text-xs text-orange-700">
                          Trong {notReadyWarning.timeWindow} phút qua
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Collapsible Settings Panel */}
              {showSettings && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-2.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Bật thông báo</span>
                      <Switch
                        checked={settings.enableNotifications}
                        onCheckedChange={(checked) => 
                          updateSettings({ enableNotifications: checked })
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Âm thanh</span>
                      <Switch
                        checked={settings.enableSound}
                        onCheckedChange={(checked) => 
                          updateSettings({ enableSound: checked })
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-sm">Tự ẩn sau</span>
                      <div className="flex space-x-1">
                        {[5, 8, 10, 15].map(seconds => (
                          <Button
                            key={seconds}
                            variant={settings.autoHideAfter === seconds ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateSettings({ autoHideAfter: seconds })}
                            className="h-6 text-xs flex-1 px-1"
                          >
                            {seconds}s
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Compact Tabs */}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as NotificationTab)} className="w-full">
                <TabsList className="grid w-full grid-cols-5 h-8 bg-muted p-1 gap-0.5">
                  {notificationTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <TabsTrigger 
                        key={tab.key} 
                        value={tab.key} 
                        className="relative text-xs p-1 h-6 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-blue-700 data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground hover:bg-muted/50 transition-all duration-150"
                      >
                        <div className="flex flex-col items-center space-y-0.5">
                          <Icon className="h-3 w-3" />
                          <span className="text-[10px] leading-none">{tab.shortLabel}</span>
                        </div>
                        {tab.unread > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-medium">
                            {tab.unread > 9 ? '9+' : tab.unread}
                          </span>
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                <TabsContent value={activeTab} className="mt-2">
                  <ScrollArea className="h-[520px]">
                    <div className="space-y-2 pr-3">
                      {getFilteredNotifications().length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Bell className="h-8 w-8 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm">Không có thông báo</p>
                        </div>
                      ) : (
                        getFilteredNotifications().map(renderNotificationItem)
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}