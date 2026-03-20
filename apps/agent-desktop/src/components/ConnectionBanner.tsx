import { useState, useEffect, useRef } from 'react';
import { useConnectionStatus } from '@/contexts/ConnectionHubContext';
import { Wifi, WifiOff, PhoneOff, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * ConnectionBanner — fixed banner below header showing connection warnings.
 * Auto-hides 3s after all connections recover.
 */
export function ConnectionBanner() {
  const conn = useConnectionStatus();
  const [visible, setVisible] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevHasIssue = useRef(false);
  const alertSoundRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (conn.hasIssue) {
      setVisible(true);
      setRecovering(false);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }

      // Play alert beep when connection just lost (transition from OK to issue)
      if (!prevHasIssue.current) {
        playAlertBeep();
        // Browser notification if tab not visible
        if (document.hidden) {
          try {
            new Notification('TPB CRM — Cảnh báo kết nối', {
              body: conn.summary,
              icon: '/favicon.ico',
              tag: 'connection-warning',
            });
          } catch { /* permission not granted */ }
        }
      }
    } else if (prevHasIssue.current && !conn.hasIssue) {
      // Just recovered
      setRecovering(true);
      toast.success('Đã kết nối lại thành công');

      hideTimerRef.current = setTimeout(() => {
        setVisible(false);
        setRecovering(false);
      }, 3000);
    }

    prevHasIssue.current = conn.hasIssue;
  }, [conn.hasIssue, conn.summary]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  if (!visible) return null;

  const isOffline = conn.network === 'offline';
  const isDegraded = conn.network === 'degraded';
  const isSipLost = conn.sip === 'disconnected' || conn.sip === 'error';
  const isReconnecting = conn.sip === 'connecting' || conn.ctiSocket === 'connecting';

  let bgColor = 'bg-yellow-500';
  let textColor = 'text-yellow-50';
  let Icon = AlertTriangle;

  if (recovering) {
    bgColor = 'bg-green-500';
    textColor = 'text-green-50';
    Icon = CheckCircle2;
  } else if (isOffline) {
    bgColor = 'bg-red-500';
    textColor = 'text-red-50';
    Icon = WifiOff;
  } else if (isSipLost) {
    bgColor = 'bg-orange-500';
    textColor = 'text-orange-50';
    Icon = PhoneOff;
  } else if (isReconnecting) {
    bgColor = 'bg-yellow-500';
    textColor = 'text-yellow-50';
    Icon = Loader2;
  } else if (isDegraded) {
    bgColor = 'bg-orange-400';
    textColor = 'text-orange-50';
    Icon = Wifi;
  }

  return (
    <div className={`${bgColor} ${textColor} px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 z-[9998] relative`}>
      <Icon className={`h-4 w-4 ${isReconnecting ? 'animate-spin' : ''}`} />
      <span>
        {recovering
          ? 'Đã kết nối lại thành công'
          : conn.summary || 'Đang kiểm tra kết nối...'}
      </span>
      {isReconnecting && <span className="text-xs opacity-75">(đang thử lại...)</span>}
    </div>
  );
}

function playAlertBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 440;
    gain.gain.value = 0.1;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => ctx.close(), 300);
  } catch { /* audio not available */ }
}
