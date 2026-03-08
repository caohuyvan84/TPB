import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ChatSLABadge, WaitingTimeBadge } from './ChatSLABadge';
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  Clock, 
  User,
  MoreHorizontal,
  AlertCircle,
  CheckCircle,
  Play,
  Pause,
  Star,
  PhoneMissed,
  Crown,
  PhoneCall,
  CheckCheck
} from "lucide-react";

interface InteractionListItemProps {
  interaction: any;
  isSelected?: boolean;
  onSelect?: () => void;
  onCallBack?: (interaction: any) => void;
}

export function InteractionListItem({ 
  interaction, 
  isSelected = false, 
  onSelect,
  onCallBack
}: InteractionListItemProps) {
  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'missed-call':
        return <PhoneMissed className="h-4 w-4 text-red-600" />;
      case 'call':
      case 'voice':
        return <Phone className="h-4 w-4 text-blue-600" />;
      case 'email':
        return <Mail className="h-4 w-4 text-orange-600" />;
      case 'chat':
        return <MessageSquare className="h-4 w-4 text-green-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'missed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'new':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'waiting':
        return 'bg-muted text-foreground border-border';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'escalated':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-muted text-foreground border-border';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'missed': return 'Nhỡ';
      case 'new': return 'Mới';
      case 'in-progress': return 'Đang diễn ra';
      case 'waiting': return 'Chờ xử lý';
      case 'resolved': return 'Đã giải quyết';
      case 'escalated': return 'Chuyển cấp trên';
      case 'completed': return 'Hoàn thành';
      case 'active': return 'Đang hoạt động';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-blue-600';
      case 'low':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'missed':
        return <PhoneMissed className="h-3 w-3 text-red-600" />;
      case 'active':
        return <Play className="h-3 w-3 text-green-600" />;
      case 'waiting':
        return <Pause className="h-3 w-3 text-muted-foreground" />;
      case 'resolved':
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case 'escalated':
        return <AlertCircle className="h-3 w-3 text-red-600" />;
      default:
        return null;
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return interaction.time || '';
    }
  };

  const getChannelName = (channel: string) => {
    switch (channel) {
      case 'voice': return 'Cuộc gọi';
      case 'email': return 'Email';
      case 'chat': return 'Chat';
      case 'missed-call': return 'Cuộc gọi nhỡ';
      default: return channel;
    }
  };

  // Truncate subject for display
  const truncateText = (text: string, maxLength = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Get missed call reason label
  const getMissedReasonLabel = (reason: string) => {
    switch (reason) {
      case 'timeout': return 'Không trả lời';
      case 'not-ready': return 'Không sẵn sàng';
      case 'disconnected': return 'Mất kết nối';
      case 'away': return 'Tạm vắng';
      default: return reason;
    }
  };

  // Determine if this is a missed call interaction
  const isMissedCall = interaction.type === 'missed-call';

  // Handle call back button click
  const handleCallBackClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card selection
    if (onCallBack) {
      onCallBack(interaction);
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : isMissedCall
          ? 'border-red-200 bg-red-50 hover:border-red-300'
          : 'border-border hover:border-gray-300'
      }`}
      onClick={onSelect}
      data-interaction-id={interaction.id}
      title={isMissedCall ? `Cuộc gọi nhỡ từ ${interaction.customerName || interaction.customerPhone} lúc ${formatTime(interaction.timestamp)}` : undefined}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with channel icon, time, and priority */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getChannelIcon(interaction.type || interaction.channel)}
              <Badge 
                variant="outline" 
                className={`text-xs ${getStatusColor(interaction.status)}`}
              >
                {getStatusIcon(interaction.status)}
                <span className="ml-1">{getStatusText(interaction.status)}</span>
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatTime(interaction.timestamp)}</span>
            </div>
          </div>

          {/* Customer info */}
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${interaction.customerName || interaction.customerPhone}`} />
              <AvatarFallback className="text-xs">
                {interaction.customerName ? interaction.customerName.charAt(0).toUpperCase() : 
                 interaction.customerPhone ? interaction.customerPhone.slice(-2) : '?'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className={`font-medium text-sm truncate ${isMissedCall ? 'text-red-900 italic' : 'text-foreground'}`}>
                  {interaction.customerName || interaction.customerPhone || 'Số ẩn'}
                </p>
                {interaction.isVIP && (
                  <Crown className="h-3 w-3 text-yellow-600 flex-shrink-0" aria-label="Khách hàng VIP" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {isMissedCall ? 
                  (interaction.customerPhone || interaction.customerEmail) :
                  interaction.customerEmail
                }
              </p>
            </div>
          </div>

          {/* Subject/Title */}
          <div>
            <p className={`font-medium text-sm leading-tight ${isMissedCall ? 'text-red-900 italic' : 'text-foreground'}`}>
              {isMissedCall ? 
                `Cuộc gọi nhỡ${interaction.missedReason ? ` - ${getMissedReasonLabel(interaction.missedReason)}` : ''}` :
                truncateText(interaction.subject)
              }
            </p>
            {interaction.source && (
              <p className="text-xs text-muted-foreground mt-1">
                {getChannelName(interaction.type || interaction.channel)} • {interaction.source}
              </p>
            )}
            {/* Email snippet preview */}
            {interaction.type === 'email' && interaction.snippet && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                {interaction.snippet}
              </p>
            )}
          </div>

          {/* Agent and duration */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              {isMissedCall ? (
                <span className="text-red-600 font-medium">Cần xử lý</span>
              ) : interaction.assignedAgent ? (
                <>
                  <User className="h-3 w-3" />
                  <span>{interaction.assignedAgent}</span>
                </>
              ) : (
                <span className="text-orange-600">Chưa phân bổ</span>
              )}
            </div>
            
            {interaction.duration && (
              <span className="text-xs bg-muted px-2 py-1 rounded">
                {new Date(interaction.timestamp).toLocaleDateString('en-GB')}
              </span>
            )}
          </div>

          {/* Missed Call Action Buttons */}
          {isMissedCall && (
            <div className="flex items-center gap-2 pt-2 border-t border-red-200">
              {interaction.calledBack ? (
                <div className="flex items-center gap-2 w-full">
                  <Badge className="bg-green-100 text-green-700 border-green-300 flex-1 justify-center py-1.5">
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Đã gọi lại lúc {interaction.calledBackTime}
                  </Badge>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={handleCallBackClick}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <PhoneCall className="h-3 w-3 mr-1.5" />
                  Gọi lại ngay
                </Button>
              )}
            </div>
          )}

          {/* Chat SLA badges */}
          {interaction.type === 'chat' && interaction.chatSLA && (
            <div className="flex items-center gap-2 flex-wrap">
              <ChatSLABadge
                status={interaction.chatSLA.status}
                remainingSeconds={interaction.chatSLA.slaRemainingSeconds}
                slaThresholdMinutes={interaction.chatSLA.slaThresholdMinutes}
                firstResponseTime={interaction.chatSLA.firstResponseTime}
                showCountdown={interaction.chatSLA.status === 'not-responded' || interaction.chatSLA.status === 'near-breach'}
                size="sm"
              />
              {interaction.chatSLA.waitingSeconds !== undefined && interaction.chatSLA.waitingSeconds > 0 && (
                <WaitingTimeBadge waitingSeconds={interaction.chatSLA.waitingSeconds} />
              )}
            </div>
          )}

          {/* Tags */}
          {interaction.tags && interaction.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {interaction.tags.slice(0, 2).map((tag: string, index: number) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs px-2 py-0 h-5"
                >
                  {tag}
                </Badge>
              ))}
              {interaction.tags.length > 2 && (
                <Badge variant="outline" className="text-xs px-2 py-0 h-5">
                  +{interaction.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}