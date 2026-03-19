import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

interface CallRecordingPlayerLiveProps {
  recordingUrl: string;
  callId: string;
  duration?: number;
}

/**
 * Real recording player that loads audio from the media service.
 * Replaces mock playback with actual URL-based audio streaming.
 */
export function CallRecordingPlayerLive({
  recordingUrl,
  callId,
  duration,
}: CallRecordingPlayerLiveProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border p-2 bg-muted/50">
      <Button
        variant="ghost"
        size="sm"
        onClick={togglePlay}
        className="h-8 w-8 p-0"
      >
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
        )}
      </Button>

      <div className="flex-1">
        <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-primary rounded-full transition-all"
            style={{ width: totalDuration ? `${(currentTime / totalDuration) * 100}%` : '0%' }}
          />
        </div>
      </div>

      <span className="text-xs text-muted-foreground w-16 text-right">
        {formatTime(currentTime)} / {formatTime(totalDuration)}
      </span>

      <audio
        ref={audioRef}
        src={recordingUrl}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setTotalDuration(audioRef.current.duration);
        }}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
}
