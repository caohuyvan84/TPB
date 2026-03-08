import { useState, useEffect } from "react";
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  PhoneForwarded,
  ChevronUp,
  ChevronDown,
  Users,
  ClipboardList,
  Maximize2,
  Volume2,
  VolumeX,
  User,
  Clock,
  MoreHorizontal,
  X
} from "lucide-react";

interface CallData {
  id: string;
  customerName: string;
  customerPhone: string;
  startTime: Date;
  status: 'ringing' | 'connected' | 'on-hold' | 'transferring' | 'ended'; // Fix: add 'ended' status
  source: string;
  avatar?: string;
}

interface FloatingCallWidgetProps {
  callData: CallData | null;
  isVisible: boolean;
  onHangup: () => void;
  onTransfer: () => void;
  onSurvey: () => void;
  onMaximize: () => void;
  onHide: () => void;
  className?: string;
}

export function FloatingCallWidget({
  callData,
  isVisible,
  onHangup,
  onTransfer,
  onSurvey,
  onMaximize,
  onHide,
  className = ""
}: FloatingCallWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState('00:00');

  // Timer for call duration
  useEffect(() => {
    if (!callData || callData.status !== 'connected') return;

    const timer = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - callData.startTime.getTime()) / 1000);
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setCallDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [callData]);

  // Auto-expand when call starts
  useEffect(() => {
    if (callData && callData.status === 'ringing') {
      setIsExpanded(true);
    }
  }, [callData]);

  if (!isVisible || !callData) {
    return null;
  }

  const getStatusColor = () => {
    switch (callData.status) {
      case 'ringing': return 'bg-yellow-100 text-yellow-800';
      case 'connected': return 'bg-green-100 text-green-800';
      case 'on-hold': return 'bg-orange-100 text-orange-800';
      case 'transferring': return 'bg-blue-100 text-blue-800';
      default: return 'bg-muted text-foreground';
    }
  };

  const getStatusText = () => {
    switch (callData.status) {
      case 'ringing': return 'Cuộc gọi đến';
      case 'connected': return 'Đang kết nối';
      case 'on-hold': return 'Đang giữ máy';
      case 'transferring': return 'Đang chuyển';
      default: return 'Cuộc gọi';
    }
  };

  const handleToggleHold = () => {
    setIsOnHold(!isOnHold);
    // In real app, this would call API to hold/unhold
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    // In real app, this would call API to mute/unmute
  };

  const handleToggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // In real app, this would call API to toggle speaker
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <Card className="w-80 shadow-2xl border-2 border-blue-200 bg-background">
        {/* Compact Header - Always Visible */}
        <div 
          className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                {callData.avatar ? (
                  <span className="text-lg">{callData.avatar}</span>
                ) : (
                  <User className="h-5 w-5 text-blue-600" />
                )}
              </div>
              
              {/* Call Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{callData.customerName}</h4>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor()}>
                    {getStatusText()}
                  </Badge>
                  {callData.status === 'connected' && (
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{callDuration}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-1">
              {/* Quick Hangup for emergencies */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onHangup();
                }}
                className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
              >
                <PhoneOff className="h-4 w-4" />
              </Button>
              
              {/* Expand/Collapse */}
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded Controls */}
        {isExpanded && (
          <CardContent className="pt-0 pb-4 px-4">
            <Separator className="mb-4" />
            
            {/* Call Details */}
            <div className="space-y-3 mb-4">
              <div className="text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Số điện thoại:</span>
                  <span className="font-mono">{callData.customerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nguồn:</span>
                  <span>{callData.source}</span>
                </div>
                {callData.status === 'connected' && (
                  <div className="flex justify-between">
                    <span>Thời lượng:</span>
                    <span className="font-mono">{callDuration}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Primary Controls */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Button
                variant={isOnHold ? "destructive" : "outline"}
                size="sm"
                onClick={handleToggleHold}
                className="flex flex-col h-12 text-xs"
              >
                {isOnHold ? <Phone className="h-4 w-4 mb-1" /> : <PhoneOff className="h-4 w-4 mb-1" />}
                {isOnHold ? 'Resume' : 'Hold'}
              </Button>
              
              <Button
                variant={isMuted ? "destructive" : "outline"}
                size="sm"
                onClick={handleToggleMute}
                className="flex flex-col h-12 text-xs"
              >
                {isMuted ? <Mic className="h-4 w-4 mb-1" /> : <MicOff className="h-4 w-4 mb-1" />}
                {isMuted ? 'Unmute' : 'Mute'}
              </Button>

              <Button
                variant={isSpeakerOn ? "default" : "outline"}
                size="sm"
                onClick={handleToggleSpeaker}
                className="flex flex-col h-12 text-xs"
              >
                {isSpeakerOn ? <Volume2 className="h-4 w-4 mb-1" /> : <VolumeX className="h-4 w-4 mb-1" />}
                Speaker
              </Button>
            </div>

            {/* Secondary Actions */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onTransfer();
                  }}
                  className="text-blue-700 border-blue-300 hover:bg-blue-50"
                >
                  <PhoneForwarded className="h-4 w-4 mr-1" />
                  Transfer
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onSurvey();
                  }}
                  className="text-purple-700 border-purple-300 hover:bg-purple-50"
                >
                  <ClipboardList className="h-4 w-4 mr-1" />
                  Survey
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    // Add conference functionality
                  }}
                  className="text-foreground/80"
                >
                  <Users className="h-4 w-4 mr-1" />
                  Conference
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onMaximize();
                  }}
                  className="text-foreground/80"
                >
                  <Maximize2 className="h-4 w-4 mr-1" />
                  Chi tiết
                </Button>
              </div>
            </div>

            {/* End Call - Prominent */}
            <Separator className="my-4" />
            <div className="flex space-x-2">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onHangup();
                }}
                className="flex-1"
              >
                <PhoneOff className="h-4 w-4 mr-2" />
                Kết thúc cuộc gọi
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onHide();
                }}
                className="px-3"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        )}

        {/* Call Status Indicator */}
        <div className="absolute -top-2 -right-2">
          <div className={`w-4 h-4 rounded-full ${
            callData.status === 'connected' ? 'bg-green-500' :
            callData.status === 'ringing' ? 'bg-yellow-500 animate-pulse' :
            callData.status === 'on-hold' ? 'bg-orange-500' :
            'bg-blue-500'
          }`}></div>
        </div>
      </Card>
    </div>
  );
}