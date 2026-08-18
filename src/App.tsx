import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Song, SceneType, JourneySpeed, ViewMode } from './types';
import { getPresetSongs } from './data/presetSongs';
import { getAllSongsFromDB, saveSongToDB, deleteSongFromDB } from './utils/db';
import { playBusHorn } from './utils/audioSynth';
import { SCENES } from './data/scenes';
import { BusScene } from './components/BusScene';
import { MinimalPlayer } from './components/MinimalPlayer';
import { PlaylistPanel } from './components/PlaylistPanel';
import { isAndroidNative, fetchAndroidMediaStoreAudio, resolvePlayableSongUrl } from './utils/mediaStore';
import { X } from 'lucide-react';

export default function App() {
  // Capacitor Android Mobile Initialization (Landscape Lock & Fullscreen Status Bar)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      ScreenOrientation.lock({ orientation: 'landscape' }).catch((err) => {
        console.warn('Screen orientation lock error:', err);
      });
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#020617' }).catch(() => {});
    } else {
      try {
        const screenOrient = window.screen?.orientation as unknown as { lock?: (o: string) => Promise<void> };
        if (screenOrient?.lock) {
          screenOrient.lock('landscape').catch(() => {});
        }
      } catch {
        // Safe fallback for web preview iframe
      }
    }
  }, []);

  // Playlist & Player State
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  
  // Audio Volumes
  const [musicVolume, setMusicVolume] = useState<number>(0.8);
  const [hornVolume, setHornVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Playback Modes
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);

  // Journey States
  const [sceneType, setSceneType] = useState<SceneType>('autumn');
  const [viewMode, setViewMode] = useState<ViewMode>('side');
  const [journeySpeed, setJourneySpeed] = useState<JourneySpeed>('normal');
  const [isAtBusStop, setIsAtBusStop] = useState<boolean>(false);
  const [currentStopName, setCurrentStopName] = useState<string>('');
  const [isPlaylistOpen, setIsPlaylistOpen] = useState<boolean>(false);

  // Audio Ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync state to refs to eliminate stale closure bugs
  const playlistRef = useRef<Song[]>(playlist);
  const currentSongIndexRef = useRef<number>(currentSongIndex);
  const isRepeatRef = useRef<boolean>(isRepeat);
  const isShuffleRef = useRef<boolean>(isShuffle);
  const sceneTypeRef = useRef<SceneType>(sceneType);
  const hornVolumeRef = useRef<number>(hornVolume);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const hasTriggeredCompletionRef = useRef<boolean>(false);

  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { currentSongIndexRef.current = currentSongIndex; }, [currentSongIndex]);
  useEffect(() => { isRepeatRef.current = isRepeat; }, [isRepeat]);
  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { sceneTypeRef.current = sceneType; }, [sceneType]);
  useEffect(() => { hornVolumeRef.current = hornVolume; }, [hornVolume]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Helper functions for safe play/pause without AbortError noise
  const safePlay = () => {
    if (!audioRef.current) return;
    const p = audioRef.current.play();
    if (p !== undefined) {
      p.catch((err) => {
        if (err.name !== 'AbortError') {
          console.log('Playback error:', err);
        }
      });
    }
  };

  const safePause = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
  };

  // Helper to pick next song index considering shuffle
  const getNextSongIndex = (current: number, total: number, shuffle: boolean) => {
    if (total <= 1) return 0;
    if (shuffle) {
      let rand = current;
      while (rand === current) {
        rand = Math.floor(Math.random() * total);
      }
      return rand;
    }
    return (current + 1) % total;
  };

  // 3. Seamless Track Completion & Automatic Bus Stop Routine
  const handleSongCompletion = () => {
    const list = playlistRef.current;
    if (!list || list.length === 0) return;

    const currentIdx = currentSongIndexRef.current;
    const currentScene = sceneTypeRef.current;

    // Pick random bus stop name from current scene
    const currentSceneObj = SCENES[currentScene] || SCENES.autumn;
    const randomStop =
      currentSceneObj.stops[Math.floor(Math.random() * currentSceneObj.stops.length)];
    setCurrentStopName(randomStop.name);

    // 1. Song finishes completely -> Stop music & Halt bus journey at bus stop shelter
    setIsPlaying(false);
    isPlayingRef.current = false;
    setIsAtBusStop(true);
    playBusHorn(hornVolumeRef.current * 0.7); // Gentle arrival honk!

    // Determine next song index
    const nextIndex = isRepeatRef.current
      ? currentIdx
      : getNextSongIndex(currentIdx, list.length, isShuffleRef.current);

    const scenesList: SceneType[] = ['straight', 'autumn', 'mountain', 'night', 'rainy'];
    const nextScene = scenesList[nextIndex % scenesList.length];

    // 2. Keep the bus stopped for 1 second, then automatically start next song & resume driving
    setTimeout(() => {
      hasTriggeredCompletionRef.current = false;
      setSceneType(nextScene);
      setIsAtBusStop(false);

      isPlayingRef.current = true;
      setIsPlaying(true);

      if (nextIndex === currentIdx) {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          safePlay();
        }
      } else {
        setCurrentSongIndex(nextIndex);
      }
    }, 1000);
  };

  const handleSongCompletionRef = useRef(handleSongCompletion);
  useEffect(() => {
    handleSongCompletionRef.current = handleSongCompletion;
  });

  // 1. Initialize Preset Songs and Local Songs (from MediaStore on Android, plus IndexedDB)
  useEffect(() => {
    async function loadAllSongs() {
      const presets = getPresetSongs();
      const savedUserSongs = await getAllSongsFromDB();
      let nativeMediaStoreSongs: Song[] = [];

      if (isAndroidNative()) {
        try {
          const res = await fetchAndroidMediaStoreAudio();
          if (res.success && res.songs.length > 0) {
            nativeMediaStoreSongs = res.songs;
          }
        } catch (e) {
          console.warn('Initial MediaStore check skipped or failed:', e);
        }
      }

      // Merge avoiding duplicates by ID or title
      const existingIds = new Set(savedUserSongs.map((s) => s.id));
      const filteredNative = nativeMediaStoreSongs.filter((s) => !existingIds.has(s.id));

      const combined = [...presets, ...savedUserSongs, ...filteredNative];
      setPlaylist(combined);
    }
    loadAllSongs();
  }, []);

  // 2. Setup Single Audio Element for entire lifetime
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      const cur = isNaN(audio.currentTime) ? 0 : audio.currentTime;
      const dur = isNaN(audio.duration) ? 0 : audio.duration;
      setCurrentTime(cur);

      // Trigger completion if audio reaches exact end
      if (dur > 0 && cur >= dur && !hasTriggeredCompletionRef.current) {
        hasTriggeredCompletionRef.current = true;
        handleSongCompletionRef.current();
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(isNaN(audio.duration) ? 0 : audio.duration);
    };

    const handleEnded = () => {
      if (!hasTriggeredCompletionRef.current) {
        hasTriggeredCompletionRef.current = true;
        handleSongCompletionRef.current();
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, []);

  // Sync music volume and mute state to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : musicVolume;
    }
  }, [musicVolume, isMuted]);

  // Load active song into audio element when song index or playlist changes
  const currentSong = playlist[currentSongIndex] || null;

  useEffect(() => {
    if (!currentSong || !audioRef.current) return;

    let isCancelled = false;
    hasTriggeredCompletionRef.current = false;
    safePause();

    async function prepareAndPlaySong() {
      const resolvedUrl = await resolvePlayableSongUrl(currentSong!);
      if (isCancelled || !audioRef.current) return;

      audioRef.current.src = resolvedUrl;
      audioRef.current.load();

      if (isPlayingRef.current) {
        safePlay();
      }
    }

    prepareAndPlaySong();

    return () => {
      isCancelled = true;
    };
  }, [currentSongIndex, playlist]);

  // 4. Controls Handlers
  const handlePlayPause = () => {
    if (!audioRef.current || !currentSong) return;

    if (isPlaying) {
      setIsPlaying(false);
      safePause();
    } else {
      setIsPlaying(true);
      safePlay();
    }
  };

  const handleNext = () => {
    if (playlist.length === 0) return;
    const nextIdx = getNextSongIndex(currentSongIndex, playlist.length, isShuffle);
    const scenesList: SceneType[] = ['straight', 'autumn', 'mountain', 'night', 'rainy'];
    setSceneType(scenesList[nextIdx % scenesList.length]);
    setCurrentSongIndex(nextIdx);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (playlist.length === 0) return;
    let prevIdx: number;
    if (isShuffle) {
      prevIdx = Math.floor(Math.random() * playlist.length);
    } else {
      prevIdx = (currentSongIndex - 1 + playlist.length) % playlist.length;
    }
    const scenesList: SceneType[] = ['straight', 'autumn', 'mountain', 'night', 'rainy'];
    setSceneType(scenesList[prevIdx % scenesList.length]);
    setCurrentSongIndex(prevIdx);
    setIsPlaying(true);
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleManualHorn = () => {
    playBusHorn(hornVolume);
  };

  const handleAddSongs = async (files: FileList) => {
    const newSongs: Song[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const blobUrl = URL.createObjectURL(file);
      
      const rawName = file.name.replace(/\.[^/.]+$/, '');
      let title = rawName;
      let artist = 'Phone Storage';

      if (rawName.includes(' - ')) {
        const parts = rawName.split(' - ');
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      }

      // Asynchronously calculate accurate duration
      const duration = await new Promise<number>((resolve) => {
        const tempAudio = new Audio(blobUrl);
        tempAudio.onloadedmetadata = () => {
          resolve(isNaN(tempAudio.duration) || !tempAudio.duration ? 180 : tempAudio.duration);
        };
        tempAudio.onerror = () => resolve(180);
      });

      const newSong: Song = {
        id: `user-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        title,
        artist,
        duration,
        url: blobUrl,
        fileName: file.name,
        isPreset: false,
        size: file.size,
        addedAt: Date.now()
      };

      await saveSongToDB(newSong, file);
      newSongs.push(newSong);
    }

    if (newSongs.length > 0) {
      setPlaylist((prev) => {
        const updated = [...prev, ...newSongs];
        // If current song index is out of bounds or playlist was only presets, select the first newly added local song
        const firstNewIdx = updated.length - newSongs.length;
        if (!isPlayingRef.current) {
          setCurrentSongIndex(firstNewIdx);
        }
        return updated;
      });
    }
  };

  const handleAddMediaStoreSongs = async (mediaStoreSongs: Song[]) => {
    if (!mediaStoreSongs || mediaStoreSongs.length === 0) return;

    for (const song of mediaStoreSongs) {
      await saveSongToDB(song);
    }

    setPlaylist((prev) => {
      const existingIds = new Set(prev.map((s) => s.id));
      const newlyAdded = mediaStoreSongs.filter((s) => !existingIds.has(s.id));
      if (newlyAdded.length === 0) return prev;

      const updated = [...prev, ...newlyAdded];
      if (!isPlayingRef.current) {
        const firstNewIdx = prev.length;
        setCurrentSongIndex(firstNewIdx);
      }
      return updated;
    });
  };

  const handleRemoveSong = async (id: string) => {
    await deleteSongFromDB(id);
    setPlaylist((prev) => prev.filter((s) => s.id !== id));
    if (currentSongIndex >= playlist.length - 1) {
      setCurrentSongIndex(Math.max(0, playlist.length - 2));
    }
  };

  const handleMoveSong = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= playlist.length) return;
    const updated = [...playlist];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    if (currentSongIndex === fromIndex) {
      setCurrentSongIndex(toIndex);
    } else if (currentSongIndex > fromIndex && currentSongIndex <= toIndex) {
      setCurrentSongIndex(currentSongIndex - 1);
    } else if (currentSongIndex < fromIndex && currentSongIndex >= toIndex) {
      setCurrentSongIndex(currentSongIndex + 1);
    }

    setPlaylist(updated);
  };

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-slate-950 text-amber-100 font-sans select-none">
      {/* FULL-SCREEN CINEMATIC BUS JOURNEY ENVIRONMENT */}
      <BusScene
        sceneType={sceneType}
        viewMode={viewMode}
        onViewModeChange={(vm) => setViewMode(vm)}
        isPlaying={isPlaying}
        isAtBusStop={isAtBusStop}
        currentStopName={currentStopName}
        journeySpeed={journeySpeed}
        currentTime={currentTime}
        duration={duration}
        onSceneChange={(st) => setSceneType(st)}
        onSpeedChange={(spd) => setJourneySpeed(spd)}
        onToggleRadio={() => setIsPlaylistOpen(!isPlaylistOpen)}
      />

      {/* 2. VINTAGE FLOATING BUS RADIO PLAYER */}
      <MinimalPlayer
        currentSong={currentSong}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        musicVolume={musicVolume}
        hornVolume={hornVolume}
        isMuted={isMuted}
        isShuffle={isShuffle}
        isRepeat={isRepeat}
        journeySpeed={journeySpeed}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrev={handlePrev}
        onSeek={handleSeek}
        onMusicVolumeChange={(vol) => setMusicVolume(vol)}
        onHornVolumeChange={(vol) => setHornVolume(vol)}
        onToggleMute={() => setIsMuted(!isMuted)}
        onToggleShuffle={() => setIsShuffle(!isShuffle)}
        onToggleRepeat={() => setIsRepeat(!isRepeat)}
        onSpeedChange={(spd) => setJourneySpeed(spd)}
        onPlayHorn={handleManualHorn}
        onTogglePlaylist={() => setIsPlaylistOpen(!isPlaylistOpen)}
        isPlaylistOpen={isPlaylistOpen}
        viewMode={viewMode}
        onViewModeChange={(vm) => setViewMode(vm)}
        sceneType={sceneType}
        onSceneChange={(st) => setSceneType(st)}
      />

      {/* 3. OVERLAY PLAYLIST DRAWER MODAL */}
      {isPlaylistOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl max-h-[92vh] bg-stone-950/95 border-2 border-amber-500/60 rounded-2xl p-3 sm:p-4 shadow-2xl overflow-y-auto custom-scrollbar flex flex-col">
            <button
              onClick={() => setIsPlaylistOpen(false)}
              className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 p-1.5 sm:p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-700 transition active:scale-95 cursor-pointer"
              title="Close Playlist"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <PlaylistPanel
              playlist={playlist}
              currentSongIndex={currentSongIndex}
              isPlaying={isPlaying}
              onSelectSong={(idx) => {
                const scenesList: SceneType[] = ['straight', 'autumn', 'mountain', 'night', 'rainy'];
                setSceneType(scenesList[idx % scenesList.length]);
                setCurrentSongIndex(idx);
                setIsPlaying(true);
                setIsPlaylistOpen(false);
              }}
              onAddSongs={handleAddSongs}
              onAddMediaStoreSongs={handleAddMediaStoreSongs}
              onRemoveSong={handleRemoveSong}
              onMoveSong={handleMoveSong}
            />
          </div>
        </div>
      )}
    </div>
  );
}
