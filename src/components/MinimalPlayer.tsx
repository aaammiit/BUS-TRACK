import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  ListMusic, Shuffle, Repeat, Radio
} from 'lucide-react';
import { Song, JourneySpeed, ViewMode, SceneType } from '../types';

interface MinimalPlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  musicVolume: number;
  hornVolume: number;
  isMuted: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  journeySpeed: JourneySpeed;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onMusicVolumeChange: (vol: number) => void;
  onHornVolumeChange?: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onSpeedChange: (speed: JourneySpeed) => void;
  onPlayHorn: () => void;
  onTogglePlaylist: () => void;
  isPlaylistOpen: boolean;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  sceneType?: SceneType;
  onSceneChange?: (scene: SceneType) => void;
}

export const MinimalPlayer: React.FC<MinimalPlayerProps> = ({
  currentSong,
  isPlaying,
  currentTime,
  duration,
  musicVolume,
  hornVolume,
  isMuted,
  isShuffle,
  isRepeat,
  journeySpeed,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onMusicVolumeChange,
  onHornVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onSpeedChange,
  onPlayHorn,
  onTogglePlaylist,
  isPlaylistOpen,
  viewMode = 'straight',
  onViewModeChange,
  sceneType = 'autumn',
  onSceneChange
}) => {
  const [showVolume, setShowVolume] = useState(false);
  const [isTunerOpen, setIsTunerOpen] = useState(false);

  // Real-time trip metrics (Trip distance & Average Speed)
  const [tripDistanceKm, setTripDistanceKm] = useState(3.6);
  const [totalDriveSeconds, setTotalDriveSeconds] = useState(180);
  const [totalDistanceAccum, setTotalDistanceAccum] = useState(3.6);

  useEffect(() => {
    if (!isPlaying) return;

    const speedKmH = journeySpeed === 'fast' ? 90 : journeySpeed === 'slow' ? 45 : 72;
    const interval = setInterval(() => {
      setTripDistanceKm((prev) => prev + (speedKmH / 3600) * 0.5);
      setTotalDistanceAccum((prev) => prev + (speedKmH / 3600) * 0.5);
      setTotalDriveSeconds((prev) => prev + 0.5);
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, journeySpeed]);

  const averageSpeedKmH = totalDriveSeconds > 0
    ? Math.round(totalDistanceAccum / (totalDriveSeconds / 3600))
    : (journeySpeed === 'fast' ? 90 : journeySpeed === 'slow' ? 45 : 72);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs <= 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleNativeFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const safeCurrentTime = isNaN(currentTime) ? 0 : currentTime;
  const safeDuration = isNaN(duration) || duration <= 0 ? 0 : duration;
  const progressPercent = safeDuration > 0 ? Math.min(100, Math.max(0, (safeCurrentTime / safeDuration) * 100)) : 0;

  // Universal compact bottom control bar across all views (REAR, SIDE, CABIN)
  return (
    <motion.aside 
      initial={{ y: 45, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        duration: 0.55,
        ease: [0.16, 1, 0.3, 1], // cinematic smooth ease-out curve
        delay: 0.1
      }}
      aria-label="Bottom Vehicle & Radio Control Deck"
      className="fixed bottom-0 inset-x-0 z-40 select-none pointer-events-auto bg-stone-950/95 border-t border-amber-500/50 shadow-[0_-10px_30px_rgba(0,0,0,0.85)] backdrop-blur-md px-1.5 sm:px-3 py-1 sm:py-1.5 flex items-center justify-between gap-1 sm:gap-2 font-mono text-amber-100 overflow-x-auto no-scrollbar"
      style={{
        paddingBottom: 'max(0.4rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.4rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.4rem, env(safe-area-inset-right))',
      }}
    >
      {/* 1. CAMERA SELECTION BUTTONS (REAR, SIDE, CABIN) */}
      <div 
        aria-label="Camera Views"
        className="flex items-center gap-0.5 bg-stone-900 border border-amber-500/40 rounded-lg p-0.5 shrink-0"
      >
        {[
          { id: 'straight', label: 'REAR', icon: '🛣️' },
          { id: 'side', label: 'SIDE', icon: '🚌' },
          { id: 'cabin', label: 'CABIN', icon: '🚘' },
        ].map((v) => (
          <button
            key={v.id}
            onClick={() => onViewModeChange?.(v.id as ViewMode)}
            className={`min-h-[28px] sm:min-h-[32px] px-1.5 sm:px-2.5 rounded-md font-black text-[8.5px] sm:text-[10px] transition flex items-center justify-center space-x-0.5 uppercase cursor-pointer active:scale-95 ${
              viewMode === v.id
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-stone-950 shadow-[0_0_8px_rgba(245,158,11,0.8)] font-black scale-[1.02]'
                : 'text-amber-200/90 hover:text-amber-100 hover:bg-stone-800'
            }`}
            title={`Switch to ${v.label} View`}
          >
            <span className="text-[9px] sm:text-[11px]">{v.icon}</span>
            <span>{v.label}</span>
          </button>
        ))}
      </div>

      {/* 2. SPEED TOGGLE BUTTON & TRIP METRICS DISPLAY */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => {
            const speeds: JourneySpeed[] = ['slow', 'normal', 'fast'];
            const curIdx = speeds.indexOf(journeySpeed);
            const nextIdx = (curIdx < 0 ? 0 : curIdx + 1) % speeds.length;
            onSpeedChange(speeds[nextIdx]);
          }}
          className="min-h-[28px] sm:min-h-[32px] px-1.5 sm:px-2 rounded-lg bg-stone-900/90 hover:bg-stone-800 border border-amber-900/60 flex items-center gap-1 active:scale-95 transition cursor-pointer"
          title="Speed Control - Click to cycle Slow / Normal / Fast"
        >
          <span className="text-emerald-400 font-black text-[7px] animate-pulse">●</span>
          <span className="font-black text-white text-[8.5px] sm:text-[10px]">
            {journeySpeed === 'fast' ? '90' : journeySpeed === 'slow' ? '45' : '72'}
          </span>
          <span className="text-[7px] text-amber-400 font-bold">KM/H</span>
        </button>

        {/* NON-INTRUSIVE TRIP DISTANCE & AVERAGE SPEED DASHBOARD DISPLAY */}
        <div 
          aria-label="Trip Distance and Average Speed"
          className="hidden xs:flex items-center gap-1.5 min-h-[28px] sm:min-h-[32px] px-1.5 sm:px-2.5 rounded-lg bg-stone-900/90 border border-amber-900/60 text-amber-200/90 shrink-0 font-mono text-[7px] sm:text-[8.5px] select-none shadow-inner cursor-pointer"
          title={`Current Trip Distance: ${tripDistanceKm.toFixed(1)} km | Average Speed: ${averageSpeedKmH} km/h (Click to reset trip)`}
          onClick={() => {
            setTripDistanceKm(0);
            setTotalDistanceAccum(0);
            setTotalDriveSeconds(0);
          }}
        >
          <div className="flex items-center gap-0.5">
            <span className="text-[6.5px] sm:text-[7px] text-amber-500 font-bold">TRIP</span>
            <span className="font-black text-amber-300">{tripDistanceKm.toFixed(1)}</span>
            <span className="text-[6px] sm:text-[7px] text-amber-500/80">KM</span>
          </div>
          <span className="text-stone-600 font-bold text-[7px]">|</span>
          <div className="flex items-center gap-0.5">
            <span className="text-[6.5px] sm:text-[7px] text-amber-500 font-bold">AVG</span>
            <span className="font-black text-emerald-400">{averageSpeedKmH}</span>
            <span className="text-[6px] sm:text-[7px] text-amber-500/80">KM/H</span>
          </div>
        </div>
      </div>

      {/* 3. COMPACT MUSIC PLAYER & RADIO */}
      <div className="flex items-center gap-1 min-w-0 flex-1 justify-center max-w-[340px] sm:max-w-[480px]">
        {/* Audio Controls */}
        <div className="flex items-center gap-0.5 bg-stone-900 border border-amber-900/60 rounded-lg p-0.5 shrink-0">
          <button
            onClick={onPrev}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded hover:bg-stone-800 text-amber-200 flex items-center justify-center transition active:scale-95 cursor-pointer"
            title="Previous Track"
          >
            <SkipBack className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>

          <button
            onClick={onPlayPause}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded bg-gradient-to-tr from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 flex items-center justify-center shadow-sm transition active:scale-95 cursor-pointer font-black"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-stone-950" />
            ) : (
              <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-stone-950 ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded hover:bg-stone-800 text-amber-200 flex items-center justify-center transition active:scale-95 cursor-pointer"
            title="Next Track"
          >
            <SkipForward className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>

        {/* Compact Song Info & Mini Scrubber */}
        <div className="flex flex-col flex-1 min-w-[70px] max-w-[180px] sm:max-w-[220px] bg-stone-900/90 border border-amber-900/60 rounded-lg px-1.5 py-0.5 overflow-hidden">
          <div className="flex items-center justify-between text-[7px] sm:text-[8px] leading-tight">
            <span className="truncate text-amber-300 font-bold">
              {currentSong ? currentSong.title : 'Bus Radio'}
            </span>
            <span className="text-amber-500/80 font-mono shrink-0 ml-1">
              {formatTime(currentTime)}
            </span>
          </div>
          {/* Scrubber slider */}
          <div className="relative w-full h-1 bg-stone-800 rounded-full overflow-hidden mt-0.5">
            <div
              className="h-full bg-amber-400 transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime || 0}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              title="Seek track position"
            />
          </div>
        </div>

        {/* Volume & Settings & Playlist */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Volume & Audio Settings Popover */}
          <div className="relative flex items-center">
            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded border flex items-center justify-center transition active:scale-95 cursor-pointer ${
                showVolume ? 'bg-amber-900/80 text-amber-300 border-amber-500' : 'bg-stone-900/90 text-amber-200 border-stone-800'
              }`}
              title="Volume & Sound Settings"
            >
              {isMuted || musicVolume === 0 ? (
                <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              )}
            </button>

            {showVolume && (
              <div className="absolute bottom-10 right-0 bg-stone-950/95 border-2 border-amber-600/70 p-2.5 rounded-xl shadow-2xl flex flex-col space-y-1.5 w-48 sm:w-56 max-w-[calc(100vw-1.5rem)] z-50 text-[9px] sm:text-[10px] font-mono backdrop-blur-xl animate-in fade-in zoom-in-95">
                {/* Music Volume Slider */}
                <div className="flex flex-col space-y-0.5">
                  <div className="flex justify-between text-amber-300 font-bold">
                    <span>🎵 MUSIC VOL</span>
                    <span>{Math.round((isMuted ? 0 : musicVolume) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted ? 0 : musicVolume}
                    onChange={(e) => onMusicVolumeChange(Number(e.target.value))}
                    className="w-full h-1.5 bg-stone-800 rounded appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Horn Volume Slider */}
                <div className="flex flex-col space-y-0.5 pt-1 border-t border-stone-800">
                  <div className="flex justify-between items-center text-rose-400 font-bold">
                    <span>🎺 HORN VOL</span>
                    <span>{Math.round(hornVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={hornVolume}
                    onChange={(e) => onHornVolumeChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-stone-800 rounded appearance-none cursor-pointer accent-rose-500"
                  />

                  {/* Custom Horn MP3 Upload */}
                  <label
                    title="Select your custom MP3 file for the bus horn"
                    className="mt-1 px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-[7.5px] sm:text-[8px] uppercase cursor-pointer flex items-center justify-between border border-stone-700 transition"
                  >
                    <span>CUSTOM HORN MP3</span>
                    <span>📂</span>
                    <input
                      type="file"
                      accept="audio/mp3,audio/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const audioSynth = await import('../utils/audioSynth');
                          await audioSynth.setHornMp3File(file);
                          audioSynth.playBusHorn(hornVolume);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Shuffle & Repeat Toggles inside Settings */}
                <div className="flex items-center justify-between pt-1 border-t border-stone-800 gap-1">
                  <button
                    onClick={onToggleShuffle}
                    className={`flex-1 py-1 px-1 rounded border flex items-center justify-center gap-1 transition cursor-pointer active:scale-95 ${
                      isShuffle ? 'bg-amber-900/80 text-amber-300 border-amber-500' : 'bg-stone-900 text-stone-400 border-stone-800'
                    }`}
                  >
                    <Shuffle className="w-2.5 h-2.5" />
                    <span>SHUFFLE</span>
                  </button>
                  <button
                    onClick={onToggleRepeat}
                    className={`flex-1 py-1 px-1 rounded border flex items-center justify-center gap-1 transition cursor-pointer active:scale-95 ${
                      isRepeat ? 'bg-amber-900/80 text-amber-300 border-amber-500' : 'bg-stone-900 text-stone-400 border-stone-800'
                    }`}
                  >
                    <Repeat className="w-2.5 h-2.5" />
                    <span>REPEAT</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Playlist Button */}
          <button
            onClick={onTogglePlaylist}
            className={`min-h-[28px] sm:min-h-[32px] px-2 sm:px-3 rounded-lg border flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0 ${
              isPlaylistOpen
                ? 'bg-amber-500 text-stone-950 border-amber-300 font-bold shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                : 'bg-stone-900/90 hover:bg-stone-800 text-amber-200 border-amber-900/60 hover:border-amber-500/80'
            }`}
            title="Open Bus Radio Playlist"
          >
            <ListMusic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
            <span className="text-[8.5px] sm:text-[10px] font-mono font-bold tracking-wider uppercase">SONGS</span>
          </button>
        </div>
      </div>

      {/* 4. WEATHER / ROUTE SELECTOR DROPDOWN & FULLSCREEN */}
      <div className="flex items-center gap-1 shrink-0">
        {onSceneChange ? (
          <select
            value={sceneType}
            onChange={(e) => onSceneChange(e.target.value as SceneType)}
            className="min-h-[28px] sm:min-h-[32px] bg-stone-900 border border-amber-700/80 text-amber-300 font-extrabold text-[8px] sm:text-[9.5px] rounded-lg px-1.5 outline-none cursor-pointer hover:border-amber-400 transition uppercase shadow-inner max-w-[70px] sm:max-w-[100px] truncate"
          >
            <option value="straight">🛣️ ROUTE</option>
            <option value="autumn">🍂 AUTUMN</option>
            <option value="mountain">🌄 HILLS</option>
            <option value="night">🌙 NIGHT</option>
            <option value="rainy">🌧️ RAIN</option>
          </select>
        ) : (
          <div className="min-h-[28px] sm:min-h-[32px] px-1.5 rounded-lg bg-stone-900 border border-stone-800 flex items-center space-x-1 font-bold text-[8px] text-amber-300">
            <span>🍂</span>
            <span>AUTUMN</span>
          </div>
        )}

        <button
          onClick={handleNativeFullscreen}
          className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-stone-900/90 hover:bg-stone-800 text-amber-200 border border-stone-800 flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0 text-[10px] font-mono hidden sm:flex"
          title="Toggle Fullscreen"
        >
          ⛶
        </button>
      </div>
    </motion.aside>
  );
};
