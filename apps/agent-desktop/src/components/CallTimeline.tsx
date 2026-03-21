import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { useCallTimeline, TimelineEvent } from '@/hooks/useCallTimeline';
import { 
  Clock, 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  PhoneForwarded, 
  Users, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Hash,
  Timer,
  User,
  Building2,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Pause,
  Play,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface CallEvent {
  id: string;
  timestamp: string;
  duration?: string;
  type: 'queue' | 'ring' | 'answer' | 'hold' | 'resume' | 'transfer' | 'dtmf' | 'mute' | 'unmute' | 'end' | 'agent_assigned' | 'ivr' | 'conference' | 'recording';
  description: string;
  details?: string;
  agent?: string;
  queue?: string;
  dtmfKeys?: string;
  transferTo?: string;
  icon: React.ReactNode;
  status?: 'success' | 'warning' | 'error' | 'info';
}

interface CallTimelineProps {
  /** Interaction ID to fetch real timeline data. */
  interactionId?: string;
  /** GoACD call UUID — used for active calls to get IVR/queue events before interaction exists. */
  callId?: string;
  /** If true, poll for live updates during active call. */
  isLive?: boolean;
  /** Legacy: mock events (used if neither interactionId nor callId provided) */
  events?: CallEvent[];
  totalDuration?: string;
  className?: string;
}

const mockCallEvents: CallEvent[] = [
  {
    id: '1',
    timestamp: '10:32:15',
    type: 'queue',
    description: 'Cuộc gọi vào queue',
    details: 'Hotline Chăm sóc KH (1900-1234)',
    queue: 'Customer Support',
    icon: <Phone className="h-4 w-4" />,
    status: 'info'
  },
  {
    id: '2',
    timestamp: '10:32:18',
    type: 'ivr',
    description: 'Khách hàng tương tác với IVR',
    details: 'Menu chính → Hỗ trợ kỹ thuật',
    dtmfKeys: '1→3',
    icon: <Hash className="h-4 w-4" />,
    status: 'info'
  },
  {
    id: '3',
    timestamp: '10:32:25',
    duration: '00:07',
    type: 'queue',
    description: 'Chờ trong queue',
    details: 'Vị trí: 3 → 1',
    queue: 'Tech Support Queue',
    icon: <Timer className="h-4 w-4" />,
    status: 'warning'
  },
  {
    id: '4',
    timestamp: '10:32:32',
    type: 'agent_assigned',
    description: 'Được phân bổ Agent',
    details: 'Agent Duc (ID: AGT001)',
    agent: 'Agent Duc',
    icon: <UserCheck className="h-4 w-4" />,
    status: 'info'
  },
  {
    id: '5',
    timestamp: '10:32:35',
    duration: '00:03',
    type: 'ring',
    description: 'Đang đổ chuông tới Agent',
    details: 'Ring time: 3 giây',
    agent: 'Agent Duc',
    icon: <PhoneCall className="h-4 w-4" />,
    status: 'info'
  },
  {
    id: '6',
    timestamp: '10:32:38',
    type: 'answer',
    description: 'Agent trả lời cuộc gọi',
    details: 'Kết nối thành công',
    agent: 'Agent Duc',
    icon: <Phone className="h-4 w-4" />,
    status: 'success'
  },
  {
    id: '7',
    timestamp: '10:32:42',
    type: 'recording',
    description: 'Bắt đầu ghi âm',
    details: 'Chất lượng: HD (48kHz)',
    icon: <Mic className="h-4 w-4" />,
    status: 'success'
  },
  {
    id: '8',
    timestamp: '10:34:15',
    duration: '01:33',
    type: 'hold',
    description: 'Agent đặt cuộc gọi hold',
    details: 'Lý do: Tra cứu thông tin khách hàng',
    agent: 'Agent Duc',
    icon: <Pause className="h-4 w-4" />,
    status: 'warning'
  },
  {
    id: '9',
    timestamp: '10:35:48',
    type: 'resume',
    description: 'Tiếp tục cuộc gọi',
    details: 'Trở lại trò chuyện với khách hàng',
    agent: 'Agent Duc',
    icon: <Play className="h-4 w-4" />,
    status: 'success'
  },
  {
    id: '10',
    timestamp: '10:36:20',
    type: 'dtmf',
    description: 'Khách hàng bấm phím',
    details: 'Nhập mã khách hàng',
    dtmfKeys: '1234567890',
    icon: <Hash className="h-4 w-4" />,
    status: 'info'
  },
  {
    id: '11',
    timestamp: '10:37:45',
    type: 'mute',
    description: 'Agent tắt mic',
    details: 'Tham khảo với supervisor',
    agent: 'Agent Duc',
    icon: <MicOff className="h-4 w-4" />,
    status: 'warning'
  },
  {
    id: '12',
    timestamp: '10:37:52',
    type: 'unmute',
    description: 'Agent bật mic',
    details: 'Tiếp tục trò chuyện',
    agent: 'Agent Duc',
    icon: <Mic className="h-4 w-4" />,
    status: 'success'
  },
  {
    id: '13',
    timestamp: '10:38:10',
    type: 'conference',
    description: 'Thêm Technical Specialist vào cuộc gọi',
    details: 'Agent Mai (Technical Team)',
    agent: 'Agent Mai',
    icon: <Users className="h-4 w-4" />,
    status: 'info'
  },
  {
    id: '14',
    timestamp: '10:40:25',
    type: 'transfer',
    description: 'Chuyển cuộc gọi',
    details: 'Từ Agent Duc → Supervisor Minh',
    transferTo: 'Supervisor Minh',
    agent: 'Agent Duc',
    icon: <PhoneForwarded className="h-4 w-4" />,
    status: 'info'
  },
  {
    id: '15',
    timestamp: '10:43:20',
    type: 'end',
    description: 'Kết thúc cuộc gọi',
    details: 'Khách hàng cúp máy - Cuộc gọi hoàn tất',
    duration: '10:42',
    icon: <PhoneOff className="h-4 w-4" />,
    status: 'success'
  }
];

// Map real timeline event types to CallEvent format for rendering
const EVENT_TYPE_CONFIG: Record<string, { type: CallEvent['type']; icon: React.ReactNode; label: string; status: CallEvent['status'] }> = {
  call_started:       { type: 'queue',          icon: <Phone className="h-4 w-4" />,          label: 'Cuộc gọi đến',         status: 'info' },
  ivr_started:        { type: 'ivr',            icon: <Volume2 className="h-4 w-4" />,        label: 'Bắt đầu IVR',          status: 'info' },
  ivr_digit:          { type: 'dtmf',           icon: <Hash className="h-4 w-4" />,            label: 'Khách bấm phím',       status: 'info' },
  ivr_completed:      { type: 'ivr',            icon: <CheckCircle className="h-4 w-4" />,    label: 'IVR hoàn tất',          status: 'success' },
  queued:             { type: 'queue',           icon: <Clock className="h-4 w-4" />,          label: 'Vào hàng đợi',         status: 'info' },
  agent_scoring:      { type: 'agent_assigned',  icon: <Users className="h-4 w-4" />,          label: 'Tìm agent phù hợp',    status: 'info' },
  routing:            { type: 'agent_assigned',  icon: <UserCheck className="h-4 w-4" />,      label: 'Phân phối đến agent',   status: 'info' },
  ringing:            { type: 'ring',            icon: <PhoneCall className="h-4 w-4" />,      label: 'Đang đổ chuông',       status: 'warning' },
  agent_missed:       { type: 'ring',            icon: <AlertTriangle className="h-4 w-4" />,  label: 'Agent không trả lời',   status: 'error' },
  answered:           { type: 'answer',          icon: <PhoneForwarded className="h-4 w-4" />, label: 'Agent trả lời',         status: 'success' },
  hold:               { type: 'hold',            icon: <Pause className="h-4 w-4" />,          label: 'Đặt giữ cuộc gọi',    status: 'warning' },
  resume:             { type: 'resume',          icon: <Play className="h-4 w-4" />,           label: 'Tiếp tục cuộc gọi',   status: 'success' },
  mute:               { type: 'mute',            icon: <MicOff className="h-4 w-4" />,         label: 'Tắt mic',              status: 'warning' },
  unmute:             { type: 'unmute',          icon: <Mic className="h-4 w-4" />,            label: 'Bật mic',              status: 'info' },
  transfer_initiated: { type: 'transfer',        icon: <PhoneForwarded className="h-4 w-4" />, label: 'Chuyển cuộc gọi',      status: 'info' },
  ended:              { type: 'end',             icon: <PhoneOff className="h-4 w-4" />,       label: 'Kết thúc cuộc gọi',    status: 'error' },
};

function mapTimelineEvent(evt: TimelineEvent): CallEvent {
  const config = EVENT_TYPE_CONFIG[evt.eventType] || { type: 'queue' as const, icon: <Clock className="h-4 w-4" />, label: evt.eventType, status: 'info' as const };
  const d = evt.data || {};
  const ts = new Date(evt.timestamp);
  const timeStr = ts.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Build description from event data
  let description = config.label;
  let details = '';

  switch (evt.eventType) {
    case 'call_started':
      description = `Cuộc gọi đến từ ${d['callerNumber'] || ''}`;
      details = `Số đích: ${d['destNumber'] || ''} — ${d['direction'] || 'inbound'}`;
      break;
    case 'ivr_digit':
      description = `Khách bấm phím ${d['digit'] || '?'} → ${d['menuLabel'] || ''}`;
      break;
    case 'ivr_completed':
      description = `IVR hoàn tất — chuyển hàng đợi ${d['selectedQueue'] || ''}`;
      details = `Thời gian IVR: ${formatMs(d['durationMs'] as number)}`;
      break;
    case 'queued':
      description = `Vào hàng đợi ${d['queue'] || ''} — vị trí #${d['position'] || 1}`;
      break;
    case 'agent_scoring':
      description = `Tìm agent — ${d['candidateCount'] || 0} ứng viên`;
      details = `Top: ${d['topAgent'] || ''} (${d['topScore'] || 0} điểm)`;
      break;
    case 'routing':
      description = `Phân phối đến ${d['agentId'] || ''}`;
      details = `Điểm: ${d['score'] || 0}`;
      break;
    case 'ringing':
      description = `Đang đổ chuông ${d['agentId'] || ''}...`;
      break;
    case 'agent_missed':
      description = `${d['agentId'] || ''} không trả lời`;
      details = `Lý do: ${d['reason'] || 'no_answer'}${d['retryNext'] ? ' — thử agent tiếp theo' : ''}`;
      break;
    case 'answered':
      description = `${d['agentId'] || ''} trả lời`;
      details = `Chờ ${formatMs(d['waitTimeMs'] as number)}, đổ chuông ${formatMs(d['ringDurationMs'] as number)}`;
      break;
    case 'ended': {
      const hangupBy = d['hangupBy'] === 'customer' ? 'khách hàng cúp máy' : d['hangupBy'] === 'agent' ? 'agent cúp máy' : 'kết thúc';
      description = `Kết thúc — ${hangupBy}`;
      details = `Nói chuyện: ${formatMs(d['talkTimeMs'] as number)}, tổng: ${formatMs(d['totalDurationMs'] as number)}`;
      break;
    }
  }

  return {
    id: evt.id,
    timestamp: timeStr,
    type: config.type,
    description,
    details: details || undefined,
    agent: (d['agentId'] as string) || undefined,
    queue: (d['queue'] as string) || (d['selectedQueue'] as string) || undefined,
    dtmfKeys: (d['digit'] as string) || undefined,
    icon: config.icon,
    status: config.status,
  };
}

function formatMs(ms: unknown): string {
  if (!ms || typeof ms !== 'number') return '0s';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m${secs > 0 ? ` ${secs}s` : ''}`;
}

export function CallTimeline({
  interactionId,
  callId,
  isLive = false,
  events: legacyEvents,
  totalDuration = '—',
  className = ''
}: CallTimelineProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [showAllEvents, setShowAllEvents] = useState(false);

  // Fetch real data — prefer callId for active calls (gets IVR/queue events)
  const { events: realEvents, summary, isLoading } = useCallTimeline(interactionId, isLive, callId);

  // Map real events to CallEvent format, or fall back to legacy mock
  const events: CallEvent[] = useMemo(() => {
    if (realEvents.length > 0) {
      return realEvents.map(mapTimelineEvent);
    }
    if (legacyEvents) return legacyEvents;
    return mockCallEvents;
  }, [realEvents, legacyEvents]);

  // Compute totalDuration from summary or prop
  const displayDuration = summary
    ? formatMs(summary.totalDurationMs)
    : totalDuration;

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-muted-foreground bg-muted/50 border-border';
    }
  };

  const getEventTypeBadge = (type: string) => {
    const typeMap = {
      queue: { label: 'Queue', color: 'bg-purple-100 text-purple-800' },
      ring: { label: 'Ring', color: 'bg-blue-100 text-blue-800' },
      answer: { label: 'Answer', color: 'bg-green-100 text-green-800' },
      hold: { label: 'Hold', color: 'bg-yellow-100 text-yellow-800' },
      resume: { label: 'Resume', color: 'bg-green-100 text-green-800' },
      transfer: { label: 'Transfer', color: 'bg-orange-100 text-orange-800' },
      dtmf: { label: 'DTMF', color: 'bg-muted text-foreground' },
      mute: { label: 'Mute', color: 'bg-red-100 text-red-800' },
      unmute: { label: 'Unmute', color: 'bg-green-100 text-green-800' },
      end: { label: 'End', color: 'bg-muted text-foreground' },
      agent_assigned: { label: 'Assigned', color: 'bg-indigo-100 text-indigo-800' },
      ivr: { label: 'IVR', color: 'bg-cyan-100 text-cyan-800' },
      conference: { label: 'Conference', color: 'bg-teal-100 text-teal-800' },
      recording: { label: 'Recording', color: 'bg-pink-100 text-pink-800' }
    };
    
    const config = typeMap[type as keyof typeof typeMap] || { label: type, color: 'bg-muted text-foreground' };
    return <Badge className={`${config.color} text-xs`}>{config.label}</Badge>;
  };

  const visibleEvents = showAllEvents ? events : events.slice(0, 8);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <span>Lịch sử chi tiết cuộc gọi</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {isLive && <Badge className="bg-red-500 text-white text-xs animate-pulse">ĐANG GỌI</Badge>}
            <Badge variant="secondary" className="text-xs">
              <Timer className="h-3 w-3 mr-1" />
              {displayDuration}
            </Badge>
            <Badge className="bg-blue-100 text-blue-800 text-xs">
              {events.length} events
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading && interactionId && (
          <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
            Đang tải lịch sử cuộc gọi...
          </div>
        )}
        {!isLoading && interactionId && events.length === 0 && (
          <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
            Không có dữ liệu chi tiết cuộc gọi
          </div>
        )}
        <ScrollArea className="h-80">
          <div className="space-y-1">
            {visibleEvents.map((event, index) => (
              <div key={event.id} className="relative">
                {/* Timeline line */}
                {index < visibleEvents.length - 1 && (
                  <div className="absolute left-6 top-8 w-0.5 h-8 bg-border" />
                )}
                
                <div 
                  className={`flex items-start space-x-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-sm cursor-pointer ${getStatusColor(event.status)}`}
                  onClick={() => toggleEventExpansion(event.id)}
                >
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${getStatusColor(event.status).replace('text-', 'bg-').replace('bg-', 'text-white bg-')}`}>
                    {event.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{event.description}</span>
                        {getEventTypeBadge(event.type)}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        {event.duration && (
                          <Badge variant="outline" className="text-xs">
                            {event.duration}
                          </Badge>
                        )}
                        <span>{event.timestamp}</span>
                        {expandedEvents.has(event.id) ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                    </div>
                    
                    {/* Basic details - always visible */}
                    {event.details && (
                      <p className="text-xs text-muted-foreground mb-1">{event.details}</p>
                    )}
                    
                    {/* Expanded details */}
                    {expandedEvents.has(event.id) && (
                      <div className="mt-2 pt-2 border-t border-border space-y-2">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          {event.agent && (
                            <div>
                              <span className="font-medium text-foreground/80">Agent:</span>
                              <span className="ml-2 text-muted-foreground">{event.agent}</span>
                            </div>
                          )}
                          {event.queue && (
                            <div>
                              <span className="font-medium text-foreground/80">Queue:</span>
                              <span className="ml-2 text-muted-foreground">{event.queue}</span>
                            </div>
                          )}
                          {event.dtmfKeys && (
                            <div>
                              <span className="font-medium text-foreground/80">DTMF Keys:</span>
                              <span className="ml-2 font-mono text-muted-foreground">{event.dtmfKeys}</span>
                            </div>
                          )}
                          {event.transferTo && (
                            <div>
                              <span className="font-medium text-foreground/80">Transfer To:</span>
                              <span className="ml-2 text-muted-foreground">{event.transferTo}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Additional metadata for expanded view */}
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Event ID: {event.id}</span>
                          <span>Type: {event.type}</span>
                          {event.status && <span>Status: {event.status}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {/* Show more/less button */}
        {events.length > 8 && (
          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllEvents(!showAllEvents)}
              className="text-muted-foreground hover:text-foreground"
            >
              {showAllEvents ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Ẩn bớt ({events.length - 8} events)
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Xem thêm ({events.length - 8} events)
                </>
              )}
            </Button>
          </div>
        )}

        {/* Summary stats */}
        <Separator className="my-4" />
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-foreground">{displayDuration}</div>
            <div className="text-xs text-muted-foreground">Tổng thời gian</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-foreground">
              {summary ? formatMs(summary.talkTimeMs) : '—'}
            </div>
            <div className="text-xs text-muted-foreground">Nói chuyện</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-foreground">
              {summary?.holdCount ?? events.filter(e => e.type === 'hold').length}
            </div>
            <div className="text-xs text-muted-foreground">Lần hold</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-foreground">
              {summary?.transferCount ?? events.filter(e => e.type === 'transfer').length}
            </div>
            <div className="text-xs text-muted-foreground">Chuyển tiếp</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}