import { useState, useMemo, useEffect } from "react";
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { InteractionListItem } from './InteractionListItem';
import { useInteractionStats, ChannelFilter, StatusFilter, PriorityFilter, InteractionFilters } from './useInteractionStats';
import { AdvancedFilters, ChatFilters, CallFilters, EmailFilters } from './AdvancedFilters';
import { ChatSLAFilterType } from './ChatAdvancedFilters';
import { DateRangeFilter, DateRangeValue } from './DateRangeFilter';
import { useCall } from './CallContext';
import {
  Search,
  Filter,
  ChevronDown,
  Phone,
  Mail,
  MessageSquare,
  PhoneMissed,
  X,
  RotateCcw,
  SlidersHorizontal,
  Clock,
  CheckCircle2,
  Inbox
} from "lucide-react";
import { cn } from './ui/utils';

// Define assignment status types
type AssignmentStatus = 'queue' | 'assigned' | 'closed';

interface InteractionListProps {
  selectedId?: string;
  onSelectInteraction?: (interaction: any) => void;
  interactions: any[];
  channelFilter?: ChannelFilter;
  onChannelFilterChange?: (filter: ChannelFilter) => void;
  onCallBack?: (interaction: any) => void;
  forceTab?: 'queue' | 'assigned' | 'closed';
}

export function InteractionList({
  selectedId,
  onSelectInteraction,
  interactions,
  channelFilter = 'all',
  onChannelFilterChange,
  onCallBack,
  forceTab
}: InteractionListProps) {
  const [assignmentStatus, setAssignmentStatus] = useState<AssignmentStatus>('assigned');

  // Force tab switch when prop changes (e.g. incoming call → switch to queue)
  useEffect(() => {
    if (forceTab && forceTab !== assignmentStatus) {
      setAssignmentStatus(forceTab);
    }
  }, [forceTab]);
  const [filters, setFilters] = useState<InteractionFilters>({
    channel: channelFilter,
    channelSource: 'all',
    status: 'all',
    priority: 'all',
    search: ''
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Chat-specific filters
  const [chatFilters, setChatFilters] = useState<ChatFilters>({
    slaStatus: [],
    sessionStatus: 'all',
    channels: [],
    sortBy: 'none',
    dateRange: { preset: 'all' }
  });

  // Call-specific filters
  const [callFilters, setCallFilters] = useState<CallFilters>({
    callStatus: 'all',
    direction: 'all',
    sortBy: 'none',
    dateRange: { preset: 'all' }
  });

  // Email-specific filters
  const [emailFilters, setEmailFilters] = useState<EmailFilters>({
    emailStatus: 'all',
    priority: 'all',
    sortBy: 'none',
    dateRange: { preset: 'all' }
  });

  // Get current call context
  const { currentCall } = useCall();

  const { stats, filterInteractions, getChannelSources } = useInteractionStats(interactions);

  // Update channel filter when prop changes
  const currentFilters = {
    ...filters,
    channel: channelFilter
  };

  const filteredInteractions = useMemo(() => {
    let result = filterInteractions(currentFilters);

    // First, filter by assignment status (apply to assignmentFilteredInteractions instead of all)
    result = result.filter((interaction) => {
      const isAssigned = interaction.assignedAgent !== null && interaction.assignedAgent !== undefined;
      const isClosed = interaction.status === 'completed' || interaction.status === 'closed' || interaction.status === 'resolved';
      
      switch (assignmentStatus) {
        case 'queue':
          return !isAssigned && !isClosed;
        case 'assigned':
          return isAssigned && !isClosed;
        case 'closed':
          return isClosed;
        default:
          return true;
      }
    });

    // Apply chat-specific filters when channel is 'chat'
    if (channelFilter === 'chat') {
      // Filter by date range
      if (chatFilters.dateRange?.preset !== 'all' && chatFilters.dateRange) {
        const { from, to } = chatFilters.dateRange;
        if (from || to) {
          result = result.filter((interaction) => {
            const interactionDate = new Date(interaction.timestamp || '');
            if (from && interactionDate < from) return false;
            if (to && interactionDate > to) return false;
            return true;
          });
        }
      }

      // Filter by SLA status (multi-select)
      if (chatFilters.slaStatus && chatFilters.slaStatus.length > 0) {
        result = result.filter((interaction) => {
          const slaStatus = interaction.chatSLA?.status;
          
          // Check for waiting condition
          if (chatFilters.slaStatus.includes('waiting')) {
            const isWaiting = interaction.chatSLA?.waitingSeconds && interaction.chatSLA.waitingSeconds > 0;
            if (isWaiting) return true;
          }
          
          // Check for other SLA statuses
          return slaStatus ? chatFilters.slaStatus.includes(slaStatus as ChatSLAFilterType) : false;
        });
      }

      // Filter by session status
      if (chatFilters.sessionStatus !== 'all') {
        result = result.filter((interaction) => {
          const sessionStatus = interaction.chatSLA?.sessionStatus;
          return sessionStatus === chatFilters.sessionStatus;
        });
      }

      // Filter by chat channel source (multi-select)
      if (chatFilters.channels && chatFilters.channels.length > 0) {
        result = result.filter((interaction) => {
          const source = interaction.source?.toLowerCase() || '';
          
          // Check if source matches any of the selected channels
          return chatFilters.channels.some((channel: string) => {
            if (channel === 'facebook') {
              return source.includes('facebook');
            } else if (channel === 'zalo') {
              return source.includes('zalo');
            } else if (channel === 'livechat') {
              return source.includes('livechat') || source.includes('web');
            }
            return false;
          });
        });
      }

      // Sort chat interactions
      result = [...result].sort((a, b) => {
        switch (chatFilters.sortBy) {
          case 'sla-nearest-asc': {
            // Sort by remaining SLA time (ascending - nearest deadline first)
            const aRemainingAsc = a.chatSLA?.slaRemainingSeconds ?? Infinity;
            const bRemainingAsc = b.chatSLA?.slaRemainingSeconds ?? Infinity;
            return aRemainingAsc - bRemainingAsc;
          }
          case 'sla-nearest-desc': {
            // Sort by remaining SLA time (descending - furthest deadline first)
            const aRemainingDesc = a.chatSLA?.slaRemainingSeconds ?? -Infinity;
            const bRemainingDesc = b.chatSLA?.slaRemainingSeconds ?? -Infinity;
            return bRemainingDesc - aRemainingDesc;
          }
          case 'waiting-longest-desc': {
            // Sort by waiting time (descending - longest wait first)
            const aWaitingDesc = a.chatSLA?.waitingSeconds ?? 0;
            const bWaitingDesc = b.chatSLA?.waitingSeconds ?? 0;
            return bWaitingDesc - aWaitingDesc;
          }
          case 'waiting-longest-asc': {
            // Sort by waiting time (ascending - shortest wait first)
            const aWaitingAsc = a.chatSLA?.waitingSeconds ?? 0;
            const bWaitingAsc = b.chatSLA?.waitingSeconds ?? 0;
            return aWaitingAsc - bWaitingAsc;
          }
          case 'start-time-desc':
            // Newest first
            return new Date(b.timestamp || '').getTime() - new Date(a.timestamp || '').getTime();

          case 'start-time-asc':
            // Oldest first
            return new Date(a.timestamp || '').getTime() - new Date(b.timestamp || '').getTime();

          case 'channel-asc':
            // A-Z
            return (a.source || '').localeCompare(b.source || '');

          case 'channel-desc':
            // Z-A
            return (b.source || '').localeCompare(a.source || '');

          case 'none':
          default:
            // No sorting - keep original order
            return 0;
        }
      });
    }

    // Apply call-specific filters when channel is 'voice'
    if (channelFilter === 'voice') {
      // Filter by call status
      if (callFilters.callStatus !== 'all') {
        result = result.filter((interaction) => {
          const callStatus = interaction.callStatus;
          return callStatus === callFilters.callStatus;
        });
      }

      // Filter by call direction
      if (callFilters.direction !== 'all') {
        result = result.filter((interaction) => {
          const direction = interaction.direction;
          return direction === callFilters.direction;
        });
      }

      // Filter by date range
      if (callFilters.dateRange?.preset !== 'all' && callFilters.dateRange) {
        const { from, to } = callFilters.dateRange;
        if (from || to) {
          result = result.filter((interaction) => {
            const interactionDate = new Date(interaction.timestamp || '');
            if (from && interactionDate < from) return false;
            if (to && interactionDate > to) return false;
            return true;
          });
        }
      }

      // Sort call interactions
      result = [...result].sort((a, b) => {
        switch (callFilters.sortBy) {
          case 'start-time-desc':
            // Newest first
            return new Date(b.timestamp || '').getTime() - new Date(a.timestamp || '').getTime();

          case 'start-time-asc':
            // Oldest first
            return new Date(a.timestamp || '').getTime() - new Date(b.timestamp || '').getTime();

          case 'none':
          default:
            // No sorting - keep original order
            return 0;
        }
      });
    }

    // Apply email-specific filters when channel is 'email'
    if (channelFilter === 'email') {
      // Filter by email status
      if (emailFilters.emailStatus !== 'all') {
        result = result.filter((interaction) => {
          const emailStatus = interaction.emailStatus;
          return emailStatus === emailFilters.emailStatus;
        });
      }

      // Filter by email priority
      if (emailFilters.priority !== 'all') {
        result = result.filter((interaction) => {
          const priority = interaction.priority;
          return priority === emailFilters.priority;
        });
      }

      // Filter by date range
      if (emailFilters.dateRange?.preset !== 'all' && emailFilters.dateRange) {
        const { from, to } = emailFilters.dateRange;
        if (from || to) {
          result = result.filter((interaction) => {
            if (!interaction.timestamp) return false;
            const interactionDate = new Date(interaction.timestamp);
            if (from && interactionDate < from) return false;
            if (to && interactionDate > to) return false;
            return true;
          });
        }
      }

      // Sort email interactions
      result = [...result].sort((a, b) => {
        switch (emailFilters.sortBy) {
          case 'start-time-desc':
            // Newest first
            if (!a.timestamp || !b.timestamp) return 0;
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();

          case 'start-time-asc':
            // Oldest first
            if (!a.timestamp || !b.timestamp) return 0;
            return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();

          case 'none':
          default:
            // No sorting - keep original order
            return 0;
        }
      });
    }

    return result;
  }, [filterInteractions, currentFilters, channelFilter, chatFilters, callFilters, emailFilters, assignmentStatus]);

  // Sort interactions: active call on top when in queue tab
  const sortedInteractions = useMemo(() => {
    // If we're in queue tab and there's an active call, put it first
    if (assignmentStatus === 'queue' && currentCall?.interactionId) {
      const activeCallIndex = filteredInteractions.findIndex(
        (item) => item.id === currentCall.interactionId
      );
      
      if (activeCallIndex !== -1) {
        // Move active call to the top
        const result = [...filteredInteractions];
        const [activeCall] = result.splice(activeCallIndex, 1);
        return [activeCall, ...result];
      }
    }
    
    return filteredInteractions;
  }, [filteredInteractions, assignmentStatus, currentCall]);

  const handleFilterChange = (key: keyof InteractionFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    
    // If changing channel filter, reset channelSource filter
    if (key === 'channel') {
      newFilters.channelSource = 'all';
      if (onChannelFilterChange) {
        onChannelFilterChange(value as ChannelFilter);
      }
    }
    
    setFilters(newFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      channel: 'all' as ChannelFilter,
      channelSource: 'all',
      status: 'all' as StatusFilter,
      priority: 'all' as PriorityFilter,
      search: ''
    };
    setFilters(clearedFilters);
    onChannelFilterChange?.('all');
  };

  const hasActiveFilters = () => {
    return channelFilter !== 'all' || 
           filters.channelSource !== 'all' ||
           filters.status !== 'all' || 
           filters.priority !== 'all' || 
           filters.search.trim() !== '';
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'voice': return Phone;
      case 'email': return Mail;
      case 'chat': return MessageSquare;
      case 'missed': return PhoneMissed;
      default: return Filter;
    }
  };

  const getChannelName = (channel: string) => {
    switch (channel) {
      case 'voice': return 'Cuộc gọi';
      case 'email': return 'Email';
      case 'chat': return 'Chat';
      case 'missed': return 'Cuộc gọi nhỡ';
      default: return 'Tất cả';
    }
  };

  const getChannelSourceLabel = (channel: ChannelFilter) => {
    switch (channel) {
      case 'voice': return 'Đầu số';
      case 'email': return 'Địa chỉ email';
      case 'chat': return 'Kênh chat';
      case 'missed': return 'Đầu số';
      default: return 'Nguồn';
    }
  };

  const getStatusName = (status: string) => {
    const statusMap: Record<string, string> = {
      'all': 'Tất cả',
      'missed': 'Cuộc gọi nhỡ',
      'new': 'Mới',
      'in-progress': 'Đang xử lý',
      'waiting': 'Chờ xử lý',
      'resolved': 'Đã giải quyết',
      'escalated': 'Chuyển cấp trên',
      'completed': 'Hoàn thành',
      'active': 'Đang hoạt động'
    };
    return statusMap[status] || status;
  };

  const getPriorityName = (priority: string) => {
    const priorityMap: Record<string, string> = {
      'all': 'Tất cả',
      'low': 'Thấp',
      'medium': 'Trung bình',
      'high': 'Cao',
      'urgent': 'Khẩn cấp'
    };
    return priorityMap[priority] || priority;
  };

  // Calculate counts for each assignment status tab
  const getAssignmentStatusCounts = useMemo(() => {
    const counts = {
      queue: 0,
      assigned: 0,
      closed: 0
    };
    
    interactions.forEach((interaction) => {
      const isAssigned = interaction.assignedAgent !== null && interaction.assignedAgent !== undefined;
      const isClosed = interaction.status === 'completed' || interaction.status === 'closed' || interaction.status === 'resolved';
      
      if (isClosed) {
        counts.closed++;
      } else if (isAssigned) {
        counts.assigned++;
      } else {
        counts.queue++;
      }
    });
    
    return counts;
  }, [interactions]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Danh sách tương tác</CardTitle>
          <Badge className="bg-blue-100 text-blue-800">
            {filteredInteractions.length}/{interactions.length}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm tương tác..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Assignment Status Tabs */}
        <Tabs value={assignmentStatus} onValueChange={(value) => setAssignmentStatus(value as AssignmentStatus)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted">
            <TabsTrigger 
              value="queue" 
              className={cn(
                "flex items-center justify-center gap-1.5 py-2 px-2 data-[state=active]:bg-[#155DFC] data-[state=active]:text-white",
                "transition-all duration-200 rounded-lg data-[state=inactive]:hover:bg-border"
              )}
            >
              <span className="text-xs font-medium">Hàng chờ</span>
              <Badge 
                variant="secondary" 
                className={cn(
                  "h-4 min-w-[18px] px-1.5 text-[9px] font-semibold",
                  assignmentStatus === 'queue' 
                    ? "bg-background text-[#155DFC]" 
                    : "bg-background/80 text-foreground/80"
                )}
              >
                {getAssignmentStatusCounts.queue}
              </Badge>
            </TabsTrigger>
            
            <TabsTrigger 
              value="assigned" 
              className={cn(
                "flex items-center justify-center gap-1.5 py-2 px-2 data-[state=active]:bg-[#155DFC] data-[state=active]:text-white",
                "transition-all duration-200 rounded-lg data-[state=inactive]:hover:bg-border"
              )}
            >
              <span className="text-xs font-medium">Đã nhận</span>
              <Badge 
                variant="secondary" 
                className={cn(
                  "h-4 min-w-[18px] px-1.5 text-[9px] font-semibold",
                  assignmentStatus === 'assigned' 
                    ? "bg-background text-[#155DFC]" 
                    : "bg-background/80 text-foreground/80"
                )}
              >
                {getAssignmentStatusCounts.assigned}
              </Badge>
            </TabsTrigger>
            
            <TabsTrigger 
              value="closed" 
              className={cn(
                "flex items-center justify-center gap-1.5 py-2 px-2 data-[state=active]:bg-[#155DFC] data-[state=active]:text-white",
                "transition-all duration-200 rounded-lg data-[state=inactive]:hover:bg-border"
              )}
            >
              <span className="text-xs font-medium">Đã đóng</span>
              <Badge 
                variant="secondary" 
                className={cn(
                  "h-4 min-w-[18px] px-1.5 text-[9px] font-semibold",
                  assignmentStatus === 'closed' 
                    ? "bg-background text-[#155DFC]" 
                    : "bg-background/80 text-foreground/80"
                )}
              >
                {getAssignmentStatusCounts.closed}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Toggle Advanced Filters Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={cn(
            "w-full justify-between h-9",
            showAdvancedFilters && "bg-muted/50"
          )}
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm">Bộ lọc nâng cao</span>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              showAdvancedFilters && "transform rotate-180"
            )}
          />
        </Button>

        {/* Active Filters Summary */}
        {hasActiveFilters() && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs text-muted-foreground">Bộ lọc:</span>
            
            {channelFilter !== 'all' && (
              <Badge variant="outline" className="flex items-center space-x-1">
                {(() => {
                  const Icon = getChannelIcon(channelFilter);
                  return <Icon className="h-3 w-3" />;
                })()}
                <span>{getChannelName(channelFilter)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChannelFilterChange?.('all')}
                  className="h-3 w-3 p-0 ml-1"
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            )}

            {filters.status !== 'all' && (
              <Badge variant="outline" className="flex items-center space-x-1">
                <span>{getStatusName(filters.status)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFilterChange('status', 'all')}
                  className="h-3 w-3 p-0 ml-1"
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            )}

            {filters.channelSource !== 'all' && (
              <Badge variant="outline" className="flex items-center space-x-1">
                <span className="text-xs truncate max-w-[150px]">{filters.channelSource}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFilterChange('channelSource', 'all')}
                  className="h-3 w-3 p-0 ml-1"
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            )}

            {filters.priority !== 'all' && (
              <Badge variant="outline" className="flex items-center space-x-1">
                <span>{getPriorityName(filters.priority)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFilterChange('priority', 'all')}
                  className="h-3 w-3 p-0 ml-1"
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground/80"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Xóa tất cả
            </Button>
          </div>
        )}

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="space-y-3 pt-3 border-t">
            <div className="grid grid-cols-1 gap-3">
              {/* Date Range Filter - Quick Select */}
              <div>
                <label className="text-xs font-medium text-foreground/80 mb-1 block">
                  ⏱️ Thời gian nhanh
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    size="sm"
                    variant={chatFilters.dateRange?.preset === "today" ? "default" : "outline"}
                    onClick={() => setChatFilters({ ...chatFilters, dateRange: { preset: "today" } })}
                    className={cn(
                      "h-7 text-xs",
                      chatFilters.dateRange?.preset === "today" && "bg-[#155DFC] hover:bg-[#155DFC]/90"
                    )}
                  >
                    Hôm nay
                  </Button>
                  <Button
                    size="sm"
                    variant={chatFilters.dateRange?.preset === "yesterday" ? "default" : "outline"}
                    onClick={() => setChatFilters({ ...chatFilters, dateRange: { preset: "yesterday" } })}
                    className={cn(
                      "h-7 text-xs",
                      chatFilters.dateRange?.preset === "yesterday" && "bg-[#155DFC] hover:bg-[#155DFC]/90"
                    )}
                  >
                    Hôm qua
                  </Button>
                  <Button
                    size="sm"
                    variant={chatFilters.dateRange?.preset === "last7days" ? "default" : "outline"}
                    onClick={() => setChatFilters({ ...chatFilters, dateRange: { preset: "last7days" } })}
                    className={cn(
                      "h-7 text-xs",
                      chatFilters.dateRange?.preset === "last7days" && "bg-[#155DFC] hover:bg-[#155DFC]/90"
                    )}
                  >
                    7 ngày
                  </Button>
                </div>
              </div>

              {/* Channel Filter */}
              <div>
                <label className="text-xs font-medium text-foreground/80 mb-1 block">
                  📢 Kênh tương tác
                </label>
                <Select 
                  value={channelFilter} 
                  onValueChange={(value) => onChannelFilterChange?.(value as ChannelFilter)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center space-x-2">
                        <Filter className="h-3 w-3" />
                        <span>Tất cả ({stats.total})</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="voice">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-3 w-3 text-blue-600" />
                        <span>Cuộc gọi ({stats.voice})</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="email">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-3 w-3 text-orange-600" />
                        <span>Email ({stats.email})</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="chat">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="h-3 w-3 text-green-600" />
                        <span>Chat ({stats.chat})</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="missed">
                      <div className="flex items-center space-x-2">
                        <PhoneMissed className="h-3 w-3 text-red-600" />
                        <span>Cuộc gọi nhỡ ({stats.missed})</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status & Priority Filters - Quick Select */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-foreground/80 mb-1 block">
                    📊 Trạng thái
                  </label>
                  <Select 
                    value={filters.status} 
                    onValueChange={(value) => handleFilterChange('status', value)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="new">Mới</SelectItem>
                      <SelectItem value="in-progress">Đang xử lý</SelectItem>
                      <SelectItem value="waiting">Chờ x lý</SelectItem>
                      <SelectItem value="resolved">Đã giải quyết</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground/80 mb-1 block">
                    🎯 Ưu tiên
                  </label>
                  <Select 
                    value={filters.priority} 
                    onValueChange={(value) => handleFilterChange('priority', value)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="urgent">Khẩn cấp</SelectItem>
                      <SelectItem value="high">Cao</SelectItem>
                      <SelectItem value="medium">Trung bình</SelectItem>
                      <SelectItem value="low">Thấp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Advanced Filters Button */}
              <div>
                <label className="text-xs font-medium text-foreground/80 mb-1 block">
                  ⚙️ Lọc & Sắp xếp chi tiết
                </label>
                <AdvancedFilters
                  channel={channelFilter === 'all' || channelFilter === 'missed' ? 'chat' : channelFilter}
                  chatFilters={chatFilters}
                  callFilters={callFilters}
                  emailFilters={emailFilters}
                  onChatFiltersChange={setChatFilters}
                  onCallFiltersChange={setCallFilters}
                  onEmailFiltersChange={setEmailFilters}
                  resultCount={filteredInteractions.length}
                  availableSources={getChannelSources(channelFilter)}
                />
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <Separator className="-mt-2" />

      <CardContent className="flex-1 p-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {sortedInteractions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Filter className="h-8 w-8 mb-2" />
              <p className="text-sm">Không tìm thấy tương tác nào</p>
              {hasActiveFilters() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="mt-2 text-xs"
                >
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2 px-3 pb-2">
              {sortedInteractions.map((interaction) => (
                <InteractionListItem
                  key={interaction.id}
                  interaction={interaction}
                  isSelected={selectedId === interaction.id}
                  onSelect={() => onSelectInteraction?.(interaction)}
                  onCallBack={() => onCallBack?.(interaction)}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}