import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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

export function CallTimeline({ 
  events = mockCallEvents, 
  totalDuration = '10:42',
  className = '' 
}: CallTimelineProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [showAllEvents, setShowAllEvents] = useState(false);

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
            <Badge variant="secondary" className="text-xs">
              <Timer className="h-3 w-3 mr-1" />
              {totalDuration}
            </Badge>
            <Badge className="bg-blue-100 text-blue-800 text-xs">
              {events.length} events
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
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
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-foreground">{totalDuration}</div>
            <div className="text-xs text-muted-foreground">Tổng thời gian</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-foreground">
              {events.filter(e => e.type === 'hold').length}
            </div>
            <div className="text-xs text-muted-foreground">Lần hold</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-foreground">
              {events.filter(e => e.type === 'transfer').length}
            </div>
            <div className="text-xs text-muted-foreground">Chuyển tiếp</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}