import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Phone, PhoneOff, PhoneIncoming, PhoneOutgoing, PhoneForwarded,
  Mic, MicOff, Pause, Play,
  ChevronUp, ChevronDown, Keyboard, X,
  Volume2, User, Clock, Grip
} from 'lucide-react';
import { useSoftphone } from '@/contexts/SoftphoneContext';
import { useSharedCallControl } from '@/contexts/CallControlContext';
import { useCallEvents } from '@/hooks/useCallEvents';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const DIALPAD_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['*', '0', '#'],
];

const FAIL_REASON_MAP: Record<string, string> = {
  busy: 'Máy bận',
  no_answer: 'Không nghe máy',
  wrong_number: 'Số không tồn tại',
  rejected: 'Từ chối cuộc gọi',
  unavailable: 'Người dùng không khả dụng',
  cancelled: 'Đã huỷ',
  network_error: 'Lỗi mạng',
  timeout: 'Hết thời gian chờ',
  error: 'Lỗi cuộc gọi',
  normal: '',
};

export function SoftphoneBubble() {
  const { user } = useAuth();
  const callControl = useSharedCallControl();
  const softphone = useSoftphone();
  const [callDuration, setCallDuration] = useState('00:00');

  // Call timer
  useEffect(() => {
    if (!callControl.callStartTime) { setCallDuration('00:00'); return; }
    const timer = setInterval(() => {
      const diff = Math.floor((Date.now() - callControl.callStartTime!.getTime()) / 1000);
      const m = Math.floor(diff / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setCallDuration(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [callControl.callStartTime]);

  // Auto-open on incoming call + play ring sound
  useEffect(() => {
    if (callControl.incomingCall) {
      softphone.open();
      softphone.setCallMetadata({
        callerNumber: callControl.incomingCall.callerNumber,
        callerName: callControl.incomingCall.callerName,
        direction: 'inbound',
      });
      // Ring using Notification API + title flash
      const origTitle = document.title;
      let flash = true;
      const titleInterval = setInterval(() => {
        document.title = flash ? '📞 Cuộc gọi đến!' : origTitle;
        flash = !flash;
      }, 500);
      // Try Web Audio ring tone (works if user already interacted)
      let audioCtx: AudioContext | null = null;
      let ringInterval: ReturnType<typeof setInterval> | null = null;
      try {
        audioCtx = new AudioContext();
        if (audioCtx.state === 'running') {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.frequency.value = 480;
          gain.gain.value = 0.2;
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          let on = true;
          ringInterval = setInterval(() => { gain.gain.value = (on = !on) ? 0.2 : 0; }, 800);
          (window as any).__ringOsc = osc;
          (window as any).__ringGain = gain;
        }
      } catch {}
      (window as any).__ringCleanup = () => {
        clearInterval(titleInterval);
        document.title = origTitle;
        if (ringInterval) clearInterval(ringInterval);
        try { (window as any).__ringOsc?.stop(); } catch {}
        try { audioCtx?.close(); } catch {}
      };
      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification('Cuộc gọi đến', {
          body: `Từ ${callControl.incomingCall.callerNumber}`,
          tag: 'incoming-call',
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    } else {
      if ((window as any).__ringCleanup) {
        (window as any).__ringCleanup();
        (window as any).__ringCleanup = null;
      }
    }
  }, [callControl.incomingCall]);

  // Auto-open on active call
  useEffect(() => {
    if (callControl.hasActiveCall && !softphone.isOpen) {
      softphone.open();
    }
  }, [callControl.hasActiveCall]);

  const [outboundState, setOutboundState] = useState<string | null>(null);
  const [failReason, setFailReason] = useState<string | null>(null);

  // Listen for outbound call state events from GoACD via Socket.IO
  useCallEvents({
    onOutboundRinging: () => {
      setOutboundState('ringing');
    },
    onCallAnswered: () => {
      setOutboundState(null);
    },
    onCallEnded: () => {
      // Server says call ended — cleanup frontend state only (do NOT call hangup again — causes loop)
      setOutboundState(null);
      setFailReason(null);
      softphone.setCallMetadata(null);
    },
    onOutboundFailed: (event) => {
      const reason = event.reason || 'error';
      const label = FAIL_REASON_MAP[reason] || reason;
      const sipCode = event.sipCode ? ` (${event.sipCode})` : '';
      const hangupCause = event.hangupCause || '';
      const detail = `${label}${sipCode}`;
      setOutboundState('failed');
      setFailReason(detail);
      if (detail) toast.error(`Cuộc gọi thất bại: ${detail}`, {
        description: hangupCause ? `Nguyên nhân: ${hangupCause}` : undefined,
        duration: 5000,
      });
      // Force cleanup SIP session (agent leg may still be connected)
      try { callControl.hangup(); } catch { /* already gone */ }
      setTimeout(() => {
        setOutboundState(null);
        setFailReason(null);
        softphone.setCallMetadata(null);
      }, 5000);
    },
  }, user?.agentId);

  const handleDial = useCallback(async () => {
    const num = softphone.dialNumber.replace(/[\s\-\(\)]/g, '');
    if (!num) return;
    try {
      setOutboundState('initiating');
      setFailReason(null);
      await callControl.dial(num);
      // HTTP returned OK → GoACD accepted, originate in progress
      softphone.setCallMetadata({ direction: 'outbound', destination: num });
    } catch (err: any) {
      console.error('Dial failed:', err);
      setOutboundState('failed');
      const errData = err?.response?.data;
      const errMsg = typeof errData === 'string' ? errData : errData?.message || err?.message || 'Lỗi kết nối';
      setFailReason(String(errMsg));
      setTimeout(() => { setOutboundState(null); setFailReason(null); }, 5000);
    }
  }, [softphone.dialNumber, callControl, softphone]);

  const handleDialpadPress = useCallback((key: string) => {
    if (callControl.hasActiveCall) {
      // DTMF in-call (send via SIP INFO — future)
      console.log('[Softphone] DTMF:', key);
    }
    softphone.setDialNumber(softphone.dialNumber + key);
  }, [callControl.hasActiveCall, softphone]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && softphone.dialNumber) handleDial();
  }, [softphone.dialNumber, handleDial]);

  // Determine display info
  const isRinging = !!callControl.incomingCall;
  const isActive = callControl.hasActiveCall;
  const isOutboundPending = outboundState === 'initiating' || outboundState === 'ringing';
  const isOutboundFailed = outboundState === 'failed';
  const isIdle = !isRinging && !isActive && !isOutboundPending && !isOutboundFailed;
  const meta = softphone.callMetadata;
  const displayName = meta?.callerName || meta?.customerName || meta?.destination || softphone.dialNumber || '';
  const displayNumber = meta?.callerNumber || meta?.destination || softphone.dialNumber || '';

  const statusColor =
    isOutboundFailed ? 'bg-red-500' :
    isOutboundPending ? 'bg-blue-500 animate-pulse' :
    isRinging ? 'bg-yellow-500 animate-pulse' :
    isActive ? 'bg-green-500' :
    callControl.sipStatus === 'registered' ? 'bg-green-500' : 'bg-gray-400';

  const statusText =
    isOutboundFailed ? (failReason || 'Cuộc gọi thất bại') :
    outboundState === 'ringing' ? `Đang đổ chuông ${displayNumber}` :
    outboundState === 'initiating' ? `Đang gọi ${displayNumber}...` :
    isRinging ? 'Cuộc gọi đến' :
    isActive ? `Đang kết nối ${callDuration}` :
    callControl.sipStatus === 'registered' ? 'SIP Ready' :
    callControl.sipStatus === 'connecting' ? 'Đang kết nối...' : 'SIP Offline';

  if (!softphone.isOpen && !isRinging && !isActive && !isOutboundPending && !isOutboundFailed) {
    // Show floating phone button — always visible
    return (
      <div className="fixed bottom-6 right-6 z-[9999]">
        <Button
          onClick={() => softphone.open()}
          className="rounded-full w-14 h-14 shadow-2xl bg-blue-600 hover:bg-blue-700 border-2 border-white"
          title="Softphone"
        >
          <Phone className="h-6 w-6 text-white" />
        </Button>
        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${statusColor} border-2 border-white`} />
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] w-80">
      <div className="bg-background rounded-2xl shadow-2xl border border-border/50 overflow-hidden backdrop-blur-sm">

        {/* Header — always visible */}
        <div
          className="px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors flex items-center justify-between"
          onClick={() => softphone.isExpanded ? softphone.collapse() : softphone.expand()}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${statusColor}`} />
            <div className="min-w-0">
              {(isRinging || isActive || isOutboundPending || isOutboundFailed) ? (
                <>
                  <p className="text-sm font-medium truncate">{displayName || displayNumber || 'Cuộc gọi'}</p>
                  <p className={`text-xs ${isOutboundFailed ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>{statusText}</p>
                </>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">{statusText}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-1 flex-shrink-0">
            {isActive && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                onClick={(e) => { e.stopPropagation(); callControl.hangup(); }}>
                <PhoneOff className="h-4 w-4" />
              </Button>
            )}
            {softphone.isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>

        {/* Expanded content */}
        {softphone.isExpanded && (
          <div className="border-t border-border/30">

            {/* Outbound pending/failed info */}
            {(isOutboundPending || isOutboundFailed) && !isActive && (
              <div className={`px-4 py-3 ${isOutboundFailed ? 'bg-red-50' : 'bg-blue-50'}`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isOutboundFailed ? 'bg-red-100' : 'bg-blue-100'}`}>
                    <PhoneOutgoing className={`h-5 w-5 ${isOutboundFailed ? 'text-red-600' : 'text-blue-600'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{displayNumber}</p>
                    <p className={`text-xs font-medium ${isOutboundFailed ? 'text-red-600' : 'text-blue-600'}`}>{statusText}</p>
                  </div>
                  {isOutboundPending && (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                      onClick={(e) => { e.stopPropagation(); callControl.hangup(); setOutboundState(null); }}>
                      <PhoneOff className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Call info section */}
            {(isRinging || isActive) && (
              <div className="px-4 py-3 bg-muted/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    {meta?.direction === 'outbound' ? <PhoneOutgoing className="h-5 w-5 text-blue-600" /> : <PhoneIncoming className="h-5 w-5 text-blue-600" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{displayName || 'Khách hàng'}</p>
                    <p className="text-xs text-muted-foreground font-mono">{displayNumber}</p>
                    {meta?.queue && <p className="text-xs text-muted-foreground">Queue: {meta.queue} {meta.ivrSelection ? `| IVR: ${meta.ivrSelection}` : ''}</p>}
                    {meta?.waitTimeMs && <p className="text-xs text-muted-foreground">Chờ: {Math.round(meta.waitTimeMs / 1000)}s</p>}
                  </div>
                  {isActive && (
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="font-mono">{callDuration}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Answer/Reject for ringing */}
            {isRinging && (
              <div className="px-4 py-3 flex space-x-2">
                <Button onClick={() => callControl.answer()} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  <Phone className="h-4 w-4 mr-2" />Trả lời
                </Button>
                <Button onClick={() => callControl.hangup()} variant="destructive" className="flex-1">
                  <PhoneOff className="h-4 w-4 mr-2" />Từ chối
                </Button>
              </div>
            )}

            {/* Call controls for active call */}
            {isActive && (
              <div className="px-4 py-2">
                <div className="grid grid-cols-4 gap-2">
                  <Button variant={callControl.isMuted ? 'destructive' : 'outline'} size="sm"
                    onClick={() => callControl.toggleMute()} className="flex flex-col h-12 text-xs">
                    {callControl.isMuted ? <MicOff className="h-4 w-4 mb-0.5" /> : <Mic className="h-4 w-4 mb-0.5" />}
                    {callControl.isMuted ? 'Bật mic' : 'Tắt mic'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => callControl.toggleHold()} className="flex flex-col h-12 text-xs">
                    <Pause className="h-4 w-4 mb-0.5" />Hold
                  </Button>
                  <Button variant="outline" size="sm" className="flex flex-col h-12 text-xs text-blue-700"
                    onClick={() => { /* TODO: open transfer dialog */ }}>
                    <PhoneForwarded className="h-4 w-4 mb-0.5" />Transfer
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => callControl.hangup()} className="flex flex-col h-12 text-xs">
                    <PhoneOff className="h-4 w-4 mb-0.5" />Kết thúc
                  </Button>
                </div>
              </div>
            )}

            {/* Dialpad toggle + number input */}
            {isIdle && (
              <div className="px-4 py-3 space-y-2">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Nhập số điện thoại..."
                    value={softphone.dialNumber}
                    onChange={(e) => softphone.setDialNumber(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 font-mono"
                  />
                  <Button onClick={handleDial} disabled={!softphone.dialNumber || !callControl.isRegistered}
                    className="bg-green-600 hover:bg-green-700 text-white px-3">
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>

                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground"
                  onClick={() => softphone.setShowDialpad(!softphone.showDialpad)}>
                  <Keyboard className="h-3 w-3 mr-1" />
                  {softphone.showDialpad ? 'Ẩn bàn phím' : 'Bàn phím số'}
                </Button>

                {softphone.showDialpad && (
                  <div className="grid grid-cols-3 gap-1">
                    {DIALPAD_KEYS.flat().map((key) => (
                      <Button key={key} variant="outline" size="sm"
                        onClick={() => handleDialpadPress(key)}
                        className="h-10 text-lg font-mono hover:bg-blue-50">
                        {key}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer: SIP status + close */}
            <div className="px-4 py-2 border-t border-border/30 flex items-center justify-between bg-muted/10">
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <div className={`w-2 h-2 rounded-full ${callControl.sipStatus === 'registered' ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span>{callControl.sipStatus === 'registered' ? 'SIP Registered' : callControl.sipStatus}</span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => softphone.close()}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
