import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Download,
  Clock,
  Headphones,
  User,
  UserCircle
} from 'lucide-react';

interface CallRecordingPlayerProps {
  recordingUrl?: string;
  recordingDuration?: number;
  callDuration?: string;
  quality?: 'high' | 'medium' | 'low';
  className?: string;
}

export function CallRecordingPlayer({ 
  recordingUrl = '#', 
  recordingDuration = 185, // 3:05 in seconds
  callDuration = '03:05',
  quality = 'high',
  className = '' 
}: CallRecordingPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Format time to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle play/pause
  const togglePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      // In real implementation, pause the audio
    } else {
      setIsLoading(true);
      // Simulate loading
      setTimeout(() => {
        setIsLoading(false);
        setIsPlaying(true);
      }, 500);
    }
  };

  // Handle seek
  const handleSeek = (value: number[]) => {
    setCurrentTime(value[0]);
    // In real implementation, seek the audio
  };

  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    setIsMuted(value[0] === 0);
  };

  // Toggle mute
  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(75);
    } else {
      setIsMuted(true);
      setVolume(0);
    }
  };

  // Skip forward/backward
  const skip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(recordingDuration, currentTime + seconds));
    setCurrentTime(newTime);
  };

  // Change playback speed
  const changePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
  };

  // Simulate audio progress (for demo)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= recordingDuration) {
            setIsPlaying(false);
            return recordingDuration;
          }
          return prev + playbackRate;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, recordingDuration, playbackRate]);

  const getQualityColor = () => {
    switch (quality) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-muted text-foreground';
    }
  };

  // Generate random waveform data for demo
  const generateWaveform = (count: number, max: number) => {
    return Array.from({ length: count }, () => Math.random() * max + 20);
  };

  // Generate waveforms for customer and agent (simulated)
  const waveformBars = 120;
  const customerWaveform = generateWaveform(waveformBars, 60);
  const agentWaveform = generateWaveform(waveformBars, 60);

  // Mock conversation segments (who's speaking when)
  const conversationSegments = [
    { startTime: 0, endTime: 12, speaker: 'agent' },      // Agent greeting
    { startTime: 12, endTime: 28, speaker: 'customer' },  // Customer explains issue
    { startTime: 28, endTime: 45, speaker: 'agent' },     // Agent responds
    { startTime: 45, endTime: 62, speaker: 'customer' },  // Customer provides details
    { startTime: 62, endTime: 88, speaker: 'agent' },     // Agent checks system
    { startTime: 88, endTime: 105, speaker: 'customer' }, // Customer asks question
    { startTime: 105, endTime: 135, speaker: 'agent' },   // Agent explains solution
    { startTime: 135, endTime: 152, speaker: 'customer' },// Customer confirms
    { startTime: 152, endTime: 185, speaker: 'agent' },   // Agent closing
  ];

  // Determine who's currently speaking
  const getCurrentSpeaker = () => {
    const segment = conversationSegments.find(
      seg => currentTime >= seg.startTime && currentTime < seg.endTime
    );
    return segment?.speaker || null;
  };

  const currentSpeaker = getCurrentSpeaker();

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Headphones className="h-5 w-5 text-blue-600" />
            <span>File ghi âm cuộc gọi</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge className={getQualityColor()}>
              {quality === 'high' && 'HD'}
              {quality === 'medium' && 'SD'}
              {quality === 'low' && 'Low'}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {callDuration}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Sound Waves Visualization */}
        <div className="space-y-3">
          {/* Time Display */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(recordingDuration)}</span>
          </div>

          {/* Customer Waveform */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className={`h-3 w-3 transition-all duration-300 ${
                  currentSpeaker === 'customer' && isPlaying
                    ? 'text-green-600 scale-125' 
                    : 'text-green-600'
                }`} />
                <span className={`text-xs font-medium transition-all duration-300 ${
                  currentSpeaker === 'customer' && isPlaying
                    ? 'text-green-700 font-bold' 
                    : 'text-green-700'
                }`}>
                  Khách hàng
                </span>
              </div>
              {currentSpeaker === 'customer' && isPlaying && (
                <Badge className="bg-green-600 text-white text-xs animate-pulse">
                  Đang nói
                </Badge>
              )}
            </div>
            <div 
              className={`relative h-16 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 ${
                currentSpeaker === 'customer' && isPlaying
                  ? 'bg-gradient-to-b from-green-100 to-green-50 border-2 border-green-400 shadow-lg shadow-green-200' 
                  : 'bg-gradient-to-b from-green-50 to-white border border-green-200'
              }`}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                handleSeek([Math.floor(percentage * recordingDuration)]);
              }}
            >
              {/* Waveform bars */}
              <div className="absolute inset-0 flex items-center justify-around px-1">
                {customerWaveform.map((height, index) => {
                  const progress = (currentTime / recordingDuration) * 100;
                  const barProgress = (index / waveformBars) * 100;
                  const isPassed = barProgress <= progress;
                  const isActive = currentSpeaker === 'customer' && isPlaying;
                  
                  return (
                    <div
                      key={index}
                      className={`w-0.5 rounded-full transition-all duration-75 ${
                        isPassed 
                          ? isActive ? 'bg-green-600' : 'bg-green-600' 
                          : isActive ? 'bg-green-400' : 'bg-green-300'
                      }`}
                      style={{
                        height: `${height}%`,
                        opacity: isPassed 
                          ? (isActive ? 1 : 1) 
                          : (isActive ? 0.7 : 0.4),
                        transform: isActive && isPassed ? 'scaleY(1.1)' : 'scaleY(1)',
                      }}
                    />
                  );
                })}
              </div>
              
              {/* Active speaker glow effect */}
              {currentSpeaker === 'customer' && isPlaying && (
                <div className="absolute inset-0 bg-green-400/10 animate-pulse pointer-events-none" />
              )}
              
              {/* Playhead indicator */}
              <div 
                className={`absolute top-0 bottom-0 w-0.5 shadow-lg z-10 transition-all duration-300 ${
                  currentSpeaker === 'customer' && isPlaying
                    ? 'bg-green-700 shadow-green-500/50' 
                    : 'bg-green-700'
                }`}
                style={{
                  left: `${(currentTime / recordingDuration) * 100}%`,
                  transition: isPlaying ? 'none' : 'left 0.2s ease'
                }}
              >
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 rounded-full transition-all duration-300 ${
                  currentSpeaker === 'customer' && isPlaying
                    ? 'bg-green-700 w-3 h-3 shadow-lg shadow-green-500/50' 
                    : 'bg-green-700'
                }`} />
                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-2 h-2 rounded-full transition-all duration-300 ${
                  currentSpeaker === 'customer' && isPlaying
                    ? 'bg-green-700 w-3 h-3 shadow-lg shadow-green-500/50' 
                    : 'bg-green-700'
                }`} />
              </div>
            </div>
          </div>

          {/* Agent Waveform */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserCircle className={`h-3 w-3 transition-all duration-300 ${
                  currentSpeaker === 'agent' && isPlaying
                    ? 'text-blue-600 scale-125' 
                    : 'text-blue-600'
                }`} />
                <span className={`text-xs font-medium transition-all duration-300 ${
                  currentSpeaker === 'agent' && isPlaying
                    ? 'text-blue-700 font-bold' 
                    : 'text-blue-700'
                }`}>
                  Agent
                </span>
              </div>
              {currentSpeaker === 'agent' && isPlaying && (
                <Badge className="bg-blue-600 text-white text-xs animate-pulse">
                  Đang nói
                </Badge>
              )}
            </div>
            <div 
              className={`relative h-16 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 ${
                currentSpeaker === 'agent' && isPlaying
                  ? 'bg-gradient-to-b from-blue-100 to-blue-50 border-2 border-blue-400 shadow-lg shadow-blue-200' 
                  : 'bg-gradient-to-b from-blue-50 to-white border border-blue-200'
              }`}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                handleSeek([Math.floor(percentage * recordingDuration)]);
              }}
            >
              {/* Waveform bars */}
              <div className="absolute inset-0 flex items-center justify-around px-1">
                {agentWaveform.map((height, index) => {
                  const progress = (currentTime / recordingDuration) * 100;
                  const barProgress = (index / waveformBars) * 100;
                  const isPassed = barProgress <= progress;
                  const isActive = currentSpeaker === 'agent' && isPlaying;
                  
                  return (
                    <div
                      key={index}
                      className={`w-0.5 rounded-full transition-all duration-75 ${
                        isPassed 
                          ? isActive ? 'bg-blue-600' : 'bg-blue-600' 
                          : isActive ? 'bg-blue-400' : 'bg-blue-300'
                      }`}
                      style={{
                        height: `${height}%`,
                        opacity: isPassed 
                          ? (isActive ? 1 : 1) 
                          : (isActive ? 0.7 : 0.4),
                        transform: isActive && isPassed ? 'scaleY(1.1)' : 'scaleY(1)',
                      }}
                    />
                  );
                })}
              </div>
              
              {/* Active speaker glow effect */}
              {currentSpeaker === 'agent' && isPlaying && (
                <div className="absolute inset-0 bg-blue-400/10 animate-pulse pointer-events-none" />
              )}
              
              {/* Playhead indicator */}
              <div 
                className={`absolute top-0 bottom-0 w-0.5 shadow-lg z-10 transition-all duration-300 ${
                  currentSpeaker === 'agent' && isPlaying
                    ? 'bg-blue-700 shadow-blue-500/50' 
                    : 'bg-blue-700'
                }`}
                style={{
                  left: `${(currentTime / recordingDuration) * 100}%`,
                  transition: isPlaying ? 'none' : 'left 0.2s ease'
                }}
              >
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 rounded-full transition-all duration-300 ${
                  currentSpeaker === 'agent' && isPlaying
                    ? 'bg-blue-700 w-3 h-3 shadow-lg shadow-blue-500/50' 
                    : 'bg-blue-700'
                }`} />
                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-2 h-2 rounded-full transition-all duration-300 ${
                  currentSpeaker === 'agent' && isPlaying
                    ? 'bg-blue-700 w-3 h-3 shadow-lg shadow-blue-500/50' 
                    : 'bg-blue-700'
                }`} />
              </div>
            </div>
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-center space-x-4">
          {/* Skip Backward */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => skip(-15)}
            className="h-8 w-8 p-0"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          {/* Play/Pause */}
          <Button
            onClick={togglePlayPause}
            disabled={isLoading}
            className={`h-12 w-12 rounded-full ${
              isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5 text-white" />
            ) : (
              <Play className="h-5 w-5 text-white ml-0.5" />
            )}
          </Button>

          {/* Skip Forward */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => skip(15)}
            className="h-8 w-8 p-0"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Secondary Controls */}
        <div className="flex items-center justify-between">
          {/* Volume Control */}
          <div className="flex items-center space-x-2 w-32">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="h-6 w-6 p-0"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange([parseInt(e.target.value)])}
              className="flex-1 h-1 bg-border rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Playback Speed */}
          <Button
            variant="ghost"
            size="sm"
            onClick={changePlaybackRate}
            className="text-xs px-2 h-6"
          >
            {playbackRate}x
          </Button>

          {/* Download */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => alert('Đang tải xuống file ghi âm...')}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Recording Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Chất lượng âm thanh:</span>
            <span className="capitalize">{quality === 'high' ? 'Cao (48kHz)' : quality === 'medium' ? 'Trung bình (22kHz)' : 'Thấp (8kHz)'}</span>
          </div>
          <div className="flex justify-between">
            <span>Định dạng:</span>
            <span>WAV / MP3</span>
          </div>
          <div className="flex justify-between">
            <span>Kích thước:</span>
            <span>~{Math.round(recordingDuration * 0.5)} MB</span>
          </div>
        </div>

        {/* Hidden audio element for real implementation */}
        <audio ref={audioRef} src={recordingUrl} preload="metadata" />
      </CardContent>
    </Card>
  );
}