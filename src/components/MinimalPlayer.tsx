import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  ListMusic, Shuffle, Repeat, Radio
} from 'lucide-react';
import { Song, JourneySpeed, ViewMode, SceneType, HornRhythm } from '../types';
import { playBusHorn, setHornMp3File } from '../utils/audioSynth';

interface MinimalPlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  musicVolume: number;
  hornVolume: number;
  hornRhythm?: HornRhythm;
  onHornRhythmChange?: (rhythm: HornRhythm) => void;
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
  hornRhythm = 'classic',
  onHornRhythmChange,
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
        ease: [0.16, 1, 0.3, 1],
        delay: 0.1
      }}
      aria-label="Bottom Vehicle & Radio Control Deck"
      className="fixed bottom-0 inset-x-0 z-40 select-none pointer-events-auto bg-stone-950/95 border-t border-amber-500/50 shadow-[0_-10px_30px_rgba(0,0,0,0.85)] backdrop-blur-md px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-2 font-mono text-amber-100"
      style={{
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.6rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.6rem, env(safe-area-inset-right))',
      }}
    >
      {/* 1. BOTTOM-LEFT ROUNDED MUSIC PLAYER & SCRUBBER */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 justify-start max-w-[580px]">
        {/* Round Audio Playback Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-stone-900/95 border border-amber-500/40 rounded-full p-1 sm:p-1.5 shadow-[0_2px_15px_rgba(0,0,0,0.6)] shrink-0">
          <button
            onClick={onPrev}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-900 hover:bg-stone-800 text-amber-200 border border-stone-800 flex items-center justify-center transition active:scale-90 cursor-pointer"
            title="Previous Track"
          >
            <SkipBack className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>

          <button
            onClick={onPlayPause}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.75)] transition active:scale-90 cursor-pointer font-black"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4.5 h-4.5 sm:w-5 sm:h-5 fill-stone-950" />
            ) : (
              <Play className="w-4.5 h-4.5 sm:w-5 sm:h-5 fill-stone-950 ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-900 hover:bg-stone-800 text-amber-200 border border-stone-800 flex items-center justify-center transition active:scale-90 cursor-pointer"
            title="Next Track"
          >
            <SkipForward className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Rounded Song Info & Scrubber Box */}
        <div className="flex flex-col flex-1 min-w-[120px] max-w-[320px] bg-stone-900/90 border border-amber-900/60 rounded-2xl px-3 py-1.5 overflow-hidden shadow-inner">
          <div className="flex items-center justify-between text-[8.5px] sm:text-[10.5px] leading-tight">
            <span className="truncate text-amber-300 font-bold tracking-wide">
              {currentSong ? currentSong.title : 'Bus Radio'}
            </span>
            <span className="text-amber-500/90 font-mono shrink-0 ml-2 text-[8px] sm:text-[9.5px] font-bold">
              {formatTime(currentTime)}
            </span>
          </div>
          {/* Scrubber slider */}
          <div className="relative w-full h-2 bg-stone-800 rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-100"
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
      </div>

      {/* 3. RIGHT TOOLS: VOLUME, SONGS, ROUTE & FULLSCREEN */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Volume & Audio Settings Popover */}
        <div className="relative flex items-center">
          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center transition active:scale-95 cursor-pointer ${
              showVolume ? 'bg-amber-900/80 text-amber-300 border-amber-500' : 'bg-stone-900/90 text-amber-200 border-stone-800'
            }`}
            title="Volume & Sound Settings"
          >
            {isMuted || musicVolume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>

          {showVolume && (
            <div className="absolute bottom-11 right-0 bg-stone-950/95 border-2 border-amber-600/70 p-2.5 rounded-xl shadow-2xl flex flex-col space-y-1.5 w-52 sm:w-60 max-w-[calc(100vw-1.5rem)] z-50 text-[9px] sm:text-[10px] font-mono backdrop-blur-xl animate-in fade-in zoom-in-95">
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
                        await setHornMp3File(file);
                        playBusHorn(hornVolume, (hornRhythm as HornRhythm) || 'classic');
                      }
                    }}
                  />
                </label>
              </div>

              {/* Horn Rhythm Mode Selection */}
              <div className="flex flex-col space-y-1 pt-1.5 border-t border-stone-800">
                <div className="flex justify-between items-center text-amber-300 font-bold">
                  <span>📯 HORN RHYTHM</span>
                  <span className="text-[7.5px] text-amber-400">
                    {hornRhythm === 'double' ? 'Double Tap' : hornRhythm === 'rhythmic' ? 'Rhythmic Constant' : 'Classic Single'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'classic', label: '1X SINGLE', icon: '🎺', desc: 'Classic Single Honk' },
                    { id: 'double', label: '2X TAP', icon: '⚡⚡', desc: 'Double Tap' },
                    { id: 'rhythmic', label: 'RHYTHM', icon: '🎶', desc: 'Rhythmic Constant' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        onHornRhythmChange?.(m.id as HornRhythm);
                        onPlayHorn?.();
                      }}
                      title={m.desc}
                      className={`py-1 px-1 rounded border text-[7.5px] font-bold flex flex-col items-center justify-center gap-0.5 transition cursor-pointer active:scale-95 ${
                        hornRhythm === m.id
                          ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)] font-black'
                          : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200'
                      }`}
                    >
                      <span className="text-[9px]">{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
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
          className={`min-h-[30px] sm:min-h-[34px] px-2.5 sm:px-3.5 rounded-lg border flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0 ${
            isPlaylistOpen
              ? 'bg-amber-500 text-stone-950 border-amber-300 font-bold shadow-[0_0_8px_rgba(245,158,11,0.6)]'
              : 'bg-stone-900/90 hover:bg-stone-800 text-amber-200 border-amber-900/60 hover:border-amber-500/80'
          }`}
          title="Open Bus Radio Playlist"
        >
          <ListMusic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
          <span className="text-[9px] sm:text-[10.5px] font-mono font-bold tracking-wider uppercase">SONGS</span>
        </button>

        {/* Weather / Route Dropdown */}
        {onSceneChange ? (
          <select
            value={sceneType}
            onChange={(e) => onSceneChange(e.target.value as SceneType)}
            className="min-h-[30px] sm:min-h-[34px] bg-stone-900 border border-amber-700/80 text-amber-300 font-extrabold text-[8.5px] sm:text-[10px] rounded-lg px-2 outline-none cursor-pointer hover:border-amber-400 transition uppercase shadow-inner max-w-[80px] sm:max-w-[110px] truncate"
          >
            <option value="straight">🛣️ ROUTE</option>
            <option value="autumn">🍂 AUTUMN</option>
            <option value="mountain">🌄 HILLS</option>
            <option value="night">🌙 NIGHT</option>
            <option value="rainy">🌧️ RAIN</option>
          </select>
        ) : (
          <div className="min-h-[30px] sm:min-h-[34px] px-2 rounded-lg bg-stone-900 border border-stone-800 flex items-center space-x-1 font-bold text-[8.5px] text-amber-300">
            <span>🍂</span>
            <span>AUTUMN</span>
          </div>
        )}

        {/* Fullscreen toggle */}
        <button
          onClick={handleNativeFullscreen}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-stone-900/90 hover:bg-stone-800 text-amber-200 border border-stone-800 flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0 text-[11px] font-mono hidden sm:flex"
          title="Toggle Fullscreen"
        >
          ⛶
        </button>
      </div>
    </motion.aside>
  );
};
