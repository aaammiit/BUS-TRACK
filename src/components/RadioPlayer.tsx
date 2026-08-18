import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Maximize2 } from 'lucide-react';
import { Song } from '../types';

interface RadioPlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  musicVolume: number;
  hornVolume: number;
  isMuted: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  autoHorn: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onMusicVolumeChange: (vol: number) => void;
  onHornVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleAutoHorn: () => void;
  onPlayHorn: () => void;
  onToggleFullJourney: () => void;
}

export const RadioPlayer: React.FC<RadioPlayerProps> = ({
  currentSong,
  isPlaying,
  currentTime,
  duration,
  musicVolume,
  hornVolume,
  isMuted,
  isShuffle,
  isRepeat,
  autoHorn,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onMusicVolumeChange,
  onHornVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onToggleAutoHorn,
  onPlayHorn,
  onToggleFullJourney
}) => {
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const safeCurrentTime = isNaN(currentTime) ? 0 : currentTime;
  const safeDuration = isNaN(duration) || duration <= 0 ? 0 : duration;
  const progressPercent = safeDuration > 0 ? (safeCurrentTime / safeDuration) * 100 : 0;

  return (
    <div className="relative bg-gradient-to-b from-stone-900 via-stone-950 to-stone-900 border-2 border-stone-800 rounded-2xl p-4 sm:p-5 shadow-2xl text-amber-100 max-w-4xl mx-auto my-3 font-sans select-none">
      {/* VINTAGE RADIO BRANDING HEADER */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-2.5 mb-3">
        <div className="flex items-center space-x-2.5">
          <span className="text-xl">📻</span>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold tracking-widest text-amber-300 font-serif uppercase">
              BUS RADIO 90.4 FM
            </h2>
            <p className="text-[10px] text-amber-400/70 font-mono">
              RETRO HIGHWAY STEREO
            </p>
          </div>
        </div>

        <button
          onClick={onToggleFullJourney}
          className="flex items-center space-x-1.5 bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
          title="Full Journey View"
        >
          <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">FULL JOURNEY</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* SONG INFO & CASSETTE DISPLAY (6 cols) */}
        <div className="md:col-span-6 bg-stone-950/90 border border-amber-900/40 p-3 rounded-xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center space-x-1">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-stone-700'}`} />
              <span>{isPlaying ? 'PLAYING' : 'PAUSED'}</span>
            </span>
            <span className="text-[10px] text-amber-400/80 font-mono">90.4 MHz</span>
          </div>

          <div className="truncate">
            <div className="text-amber-300 font-bold text-sm sm:text-base truncate font-serif">
              {currentSong ? currentSong.title : 'No Song Loaded'}
            </div>
            <div className="text-xs text-amber-200/60 font-mono truncate">
              {currentSong ? currentSong.artist : 'Upload songs or select from list'}
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1 pt-1">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime || 0}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="w-full h-1.5 bg-stone-900 rounded appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-amber-300/70">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* PLAYER CONTROLS & HORN (6 cols) */}
        <div className="md:col-span-6 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between gap-2">
            {/* Prev / Play / Next */}
            <div className="flex items-center space-x-2">
              <button
                onClick={onPrev}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-700 active:scale-95 transition"
                title="Previous Track"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={onPlayPause}
                className="p-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black shadow-lg active:scale-95 transition"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-stone-950" /> : <Play className="w-5 h-5 fill-stone-950 ml-0.5" />}
              </button>

              <button
                onClick={onNext}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-700 active:scale-95 transition"
                title="Next Track"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Shuffle & Repeat */}
            <div className="flex items-center space-x-1">
              <button
                onClick={onToggleShuffle}
                className={`p-2 rounded-lg text-xs transition ${
                  isShuffle ? 'bg-amber-500 text-stone-950 font-bold' : 'bg-stone-900 text-amber-300/60 hover:text-amber-100'
                }`}
                title="Shuffle"
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onToggleRepeat}
                className={`p-2 rounded-lg text-xs transition ${
                  isRepeat ? 'bg-amber-500 text-stone-950 font-bold' : 'bg-stone-900 text-amber-300/60 hover:text-amber-100'
                }`}
                title="Repeat"
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* HORN BUTTON */}
            <button
              onClick={onPlayHorn}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-amber-100 border border-rose-400 px-3.5 py-2.5 rounded-xl shadow font-black text-xs active:scale-95 transition"
              title="Indian Bus Horn"
            >
              <span className="text-base">🎺</span>
              <span className="tracking-wider uppercase">HONK!</span>
            </button>
          </div>

          {/* VOLUMES */}
          <div className="grid grid-cols-2 gap-3 pt-1 text-[10px] font-mono">
            <div className="flex items-center space-x-2 bg-stone-950 p-1.5 rounded-lg border border-stone-800">
              <button onClick={onToggleMute} className="text-amber-400">
                {isMuted || musicVolume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <span className="text-amber-300/80">🎵 MUSIC</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={isMuted ? 0 : musicVolume}
                onChange={(e) => onMusicVolumeChange(Number(e.target.value))}
                className="w-full h-1 bg-stone-800 rounded appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <div className="flex items-center space-x-1.5 bg-stone-950 p-1.5 rounded-lg border border-stone-800">
              <span className="text-amber-300/80 shrink-0">🎺 HORN</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={hornVolume}
                onChange={(e) => onHornVolumeChange(Number(e.target.value))}
                className="w-full h-1 bg-stone-800 rounded appearance-none cursor-pointer accent-rose-500"
              />
              <label
                title="Select your MP3 file for horn sound"
                className="px-2 py-0.5 rounded text-[8px] font-extrabold uppercase bg-rose-900/80 hover:bg-rose-800 text-rose-100 border border-rose-600/80 cursor-pointer shrink-0 shadow-sm flex items-center space-x-1"
              >
                <span>HORN MP3</span>
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
              <button
                onClick={onToggleAutoHorn}
                className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 ${
                  autoHorn ? 'bg-rose-800 text-rose-100' : 'bg-stone-800 text-stone-400'
                }`}
              >
                AUTO
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
