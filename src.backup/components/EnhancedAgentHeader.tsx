import { useState } from "react";
import { cn } from "@/components/ui/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { useCall } from "@/components/CallContext";
import { useEnhancedAgentStatus } from "@/components/EnhancedAgentStatusContext";
import { useNotifications } from "@/components/NotificationContext";
import { AgentStatusWidget } from "@/components/AgentStatusWidget";
import { AgentSettingsSidebar } from "@/components/AgentSettingsSidebar";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useInteractionStats, ChannelFilter, Interaction } from "@/components/useInteractionStats";
import { 
  Bell, 
  Settings, 
  User, 
  LogOut, 
  Phone,
  PhoneOff,
  Volume2,
  MessageSquare,
  Mail,
  ChevronDown,
  Circle,
  Clock,
  Filter,
  X,
  Keyboard,
  BarChart3,
  Activity,
  AlertTriangle,
  Crown
} from "lucide-react";

interface EnhancedAgentHeaderProps {
  interactions?: Interaction[];
  onChannelFilter?: (channel: ChannelFilter) => void;
  activeChannelFilter?: ChannelFilter;
  onViewCallDetails?: (callId: string) => void;
  onCallBack?: (callId: string) => void;
  onViewTicket?: (ticketId: string) => void;
}

export function EnhancedAgentHeader({ 
  interactions = [], 
  onChannelFilter, 
  activeChannelFilter = 'all',
  onViewCallDetails,
  onCallBack,
  onViewTicket
}: EnhancedAgentHeaderProps) {
  const [agentStatus, setAgentStatus] = useState<'available' | 'busy' | 'away' | 'offline'>('available');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Call context
  const { currentCall, isCallWidgetVisible, showCallWidget, endCall } = useCall();
  
  // Enhanced agent status context
  const { 
    agentState, 
    connectionStatus,
    formatDuration,
    getTotalReadyTime,
    getTotalNotReadyTime,
    getReadyChannelsCount,
    getTotalChannelsCount 
  } = useEnhancedAgentStatus();

  // Notifications context - Updated function names
  const { 
    getUnreadCountByType, 
    getNotReadyMissedCallsWarning 
  } = useNotifications();

  // Interaction stats
  const { stats } = useInteractionStats(interactions);

  const unviewedMissedCalls = getUnreadCountByType('missed-call');
  const notReadyWarning = getNotReadyMissedCallsWarning();
  const readyChannelsCount = getReadyChannelsCount();
  const totalChannelsCount = getTotalChannelsCount();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'busy': return 'bg-red-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Sẵn sàng';
      case 'busy': return 'Bận';
      case 'away': return 'Tạm vắng';
      case 'offline': return 'Offline';
      default: return 'Không xác định';
    }
  };

  const handleCallAction = () => {
    if (currentCall) {
      if (isCallWidgetVisible) {
        endCall();
      } else {
        showCallWidget();
      }
    }
  };

  const handleChannelClick = (channel: ChannelFilter) => {
    if (onChannelFilter) {
      if (activeChannelFilter === channel) {
        onChannelFilter('all');
      } else {
        onChannelFilter(channel);
      }
    }
  };


  const handleViewCallDetails = (callId: string) => {
    onViewCallDetails?.(callId);
  };

  const handleCallBack = (callId: string) => {
    onCallBack?.(callId);
  };

  const handleViewTicket = (ticketId: string) => {
    onViewTicket?.(ticketId);
  };

  return (
    <header className="h-16 bg-background border-b border-border px-6 flex items-center justify-between flex-shrink-0 relative">
      {/* Left Section - Brand & Navigation */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-semibold text-sm">AD</span>
          </div>
          <h1 className="font-semibold text-foreground">Agent Desktop</h1>
        </div>
        
        {/* Navigation Breadcrumb */}
        <div className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-foreground">Tương tác</span>
        </div>
      </div>

      {/* Center Section - Channel Stats, Status Widget & Call Status */}
      <div className="flex items-center space-x-4">
        {/* Channel Statistics */}
        <div className="hidden lg:flex items-center space-x-4 text-sm">
          <Button
            variant={activeChannelFilter === 'voice' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleChannelClick('voice')}
            className="flex items-center space-x-1"
          >
            <Phone className="h-4 w-4 text-blue-600" />
            <span className={cn("text-muted-foreground", activeChannelFilter === 'voice' && "text-blue-700")}>Calls:</span>
            <span className="font-medium">{stats.voice}</span>
          </Button>

          <Button
            variant={activeChannelFilter === 'email' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleChannelClick('email')}
            className="flex items-center space-x-1"
          >
            <Mail className="h-4 w-4 text-orange-600" />
            <span className={cn("text-muted-foreground", activeChannelFilter === 'email' && "text-blue-700")}>Emails:</span>
            <span className="font-medium">{stats.email}</span>
          </Button>

          <Button
            variant={activeChannelFilter === 'chat' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleChannelClick('chat')}
            className="flex items-center space-x-1"
          >
            <MessageSquare className="h-4 w-4 text-green-600" />
            <span className={cn("text-muted-foreground", activeChannelFilter === 'chat' && "text-blue-700")}>Chats:</span>
            <span className="font-medium">{stats.chat}</span>
          </Button>
        </div>

        {/* Active Filter Indicator */}
        {activeChannelFilter !== 'all' && (
          <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-md border border-blue-200">
            <Filter className="h-3 w-3 text-blue-600" />
            <span className="text-sm text-blue-700">
              Lọc: {
                activeChannelFilter === 'voice' ? 'Cuộc g��i' :
                activeChannelFilter === 'email' ? 'Email' : 'Chat'
              }
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChannelFilter?.('all')}
              className="h-4 w-4 p-0 text-blue-600 hover:bg-blue-100"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Not Ready Warning */}
        {notReadyWarning.shouldShowWarning && readyChannelsCount < totalChannelsCount && (
          <div className="flex items-center space-x-2 px-3 py-1 bg-orange-50 rounded-md border border-orange-200">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-orange-700">
              {notReadyWarning.count} cuộc gọi nhỡ do Not Ready
            </span>
          </div>
        )}

        {/* Enhanced Agent Status Widget */}
        <AgentStatusWidget position="header" />

        {/* Call Status (if active) */}
        {currentCall && (
          <div className="flex items-center space-x-3 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Phone className="h-4 w-4 text-green-600" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div className="text-sm">
                <span className="font-medium text-green-900">{currentCall.customerName}</span>
                <div className="flex items-center space-x-2 text-green-700">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs">Đang kết nối</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCallAction}
                className="h-8 text-green-700 hover:bg-green-100"
              >
                {isCallWidgetVisible ? (
                  <PhoneOff className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Right Section - Stats, Notifications & User */}
      <div className="flex items-center space-x-4">
        {/* Mobile Stats Dropdown */}
        <div className="lg:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                <BarChart3 className="h-4 w-4" />
                <span className="font-medium">{stats.total}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Thống kê tương tác</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleChannelClick('voice')}>
                <Phone className="h-4 w-4 mr-2 text-blue-600" />
                <span>Cuộc gọi: {stats.voice}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChannelClick('email')}>
                <Mail className="h-4 w-4 mr-2 text-orange-600" />
                <span>Email: {stats.email}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleChannelClick('chat')}>
                <MessageSquare className="h-4 w-4 mr-2 text-green-600" />
                <span>Chat: {stats.chat}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Productivity Stats */}
        <div className="hidden xl:flex items-center space-x-4 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Activity className="h-3 w-3 text-green-600" />
            <span>Ready: {formatDuration(getTotalReadyTime())}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3 text-yellow-600" />
            <span>Break: {formatDuration(getTotalNotReadyTime())}</span>
          </div>
        </div>

        {/* Connection Status Indicator */}
        {connectionStatus !== 'connected' && (
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            connectionStatus === 'disconnected' 
              ? 'bg-red-100 text-red-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {connectionStatus === 'disconnected' ? 'Offline' : 'Reconnecting...'}
          </div>
        )}

        {/* Missed Call Notifications */}
        <NotificationCenter
          onViewCallDetails={handleViewCallDetails}
          onCallBack={handleCallBack}
          onViewTicket={handleViewTicket}
        />

        {/* Settings */}
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setIsSidebarOpen(true)}
          className="text-muted-foreground hover:text-[#155DFC] hover:bg-[#155DFC]/5"
        >
          <Settings className="h-5 w-5" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-3 hover:bg-muted">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/api/placeholder/32/32" />
                    <AvatarFallback>{agentState.agentName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                    connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium text-foreground">{agentState.agentName}</div>
                  <div className="text-xs text-muted-foreground">{getStatusText(agentStatus)}</div>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div>
                <div>{agentState.agentName}</div>
                <div className="text-xs font-normal text-muted-foreground">ID: {agentState.agentId}</div>
                {unviewedMissedCalls > 0 && (
                  <div className="flex items-center space-x-1 mt-1">
                    <Bell className="h-3 w-3 text-orange-600" />
                    <span className="text-xs text-orange-600">
                      {unviewedMissedCalls} cuộc gọi nhỡ chưa xem
                    </span>
                  </div>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Agent Status Options */}
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Trạng thái Agent</DropdownMenuLabel>
            {['available', 'busy', 'away', 'offline'].map((status) => (
              <DropdownMenuItem 
                key={status}
                onClick={() => setAgentStatus(status as any)}
                className="flex items-center space-x-2"
              >
                <Circle className={`h-3 w-3 ${getStatusColor(status)}`} />
                <span>{getStatusText(status)}</span>
                {agentStatus === status && <span className="ml-auto text-blue-600">✓</span>}
              </DropdownMenuItem>
            ))}
            
            <DropdownMenuSeparator />
            
            {/* Session Stats */}
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Phiên làm việc: {formatDuration(Math.floor((new Date().getTime() - agentState.sessionStart.getTime()) / 1000))}
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Hồ sơ cá nhân</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Cài đặt</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem className="flex items-center space-x-2">
              <Keyboard className="h-4 w-4" />
              <span>Phím tắt</span>
              <Badge className="ml-auto text-xs">Ctrl+?</Badge>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem className="flex items-center space-x-2 text-red-600">
              <LogOut className="h-4 w-4" />
              <span>Đăng xuất</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Agent Settings Sidebar */}
      <AgentSettingsSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </header>
  );
}