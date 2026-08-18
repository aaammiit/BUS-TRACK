import React, { useState, useRef, useEffect } from 'react';
import { 
  Music, 
  Trash2, 
  Play, 
  Pause, 
  ArrowUp, 
  ArrowDown, 
  Lock, 
  Smartphone, 
  Radio, 
  HardDrive, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle, 
  FolderSearch, 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';
import { Song } from '../types';
import { isAndroidNative, fetchAndroidMediaStoreAudio, MediaStoreAudio } from '../utils/mediaStore';

interface PlaylistPanelProps {
  playlist: Song[];
  currentSongIndex: number;
  isPlaying: boolean;
  onSelectSong: (index: number) => void;
  onAddSongs: (files: FileList) => void;
  onAddMediaStoreSongs?: (songs: Song[]) => void;
  onRemoveSong: (id: string) => void;
  onMoveSong: (fromIndex: number, toIndex: number) => void;
}

export const PlaylistPanel: React.FC<PlaylistPanelProps> = ({
  playlist,
  currentSongIndex,
  isPlaying,
  onSelectSong,
  onAddSongs,
  onAddMediaStoreSongs,
  onRemoveSong,
  onMoveSong
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'local' | 'presets'>('local');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStatusMsg, setScanStatusMsg] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const [permissionReqType, setPermissionReqType] = useState<string>('READ_MEDIA_AUDIO');
  const isAndroid = isAndroidNative();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const localSongs = playlist.filter((s) => !s.isPreset);
  const presetSongs = playlist.filter((s) => s.isPreset);

  const displayList =
    activeTab === 'local'
      ? localSongs
      : activeTab === 'presets'
      ? presetSongs
      : playlist;

  // Auto-check permission on mount if on Android
  useEffect(() => {
    if (isAndroid) {
      MediaStoreAudio.checkPermission()
        .then((res) => {
          setPermissionDenied(!res.granted);
          if (res.permissionRequired) {
            setPermissionReqType(res.permissionRequired);
          }
        })
        .catch(() => {});
    }
  }, [isAndroid]);

  // Handle Native Android MediaStore Audio scan
  const handleScanAndroidAudio = async () => {
    setIsScanning(true);
    setScanStatusMsg(null);
    setPermissionDenied(false);

    try {
      const result = await fetchAndroidMediaStoreAudio();
      
      if (result.status === 'PERMISSION_DENIED') {
        setPermissionDenied(true);
        setScanStatusMsg(result.message);
      } else if (result.status === 'NO_SONGS') {
        setScanStatusMsg('Scanned MediaStore but 0 audio songs were found in /Music, /Download, or /Audio.');
      } else if (result.status === 'SUCCESS' && result.songs.length > 0) {
        setScanStatusMsg(`✅ Discovered ${result.songs.length} songs from Android Phone Storage!`);
        if (onAddMediaStoreSongs) {
          onAddMediaStoreSongs(result.songs);
        }
      } else {
        setScanStatusMsg(result.message);
      }
    } catch (e: any) {
      setScanStatusMsg(e?.message || 'Failed to scan device audio.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRequestPermissionAgain = async () => {
    try {
      const permRes = await MediaStoreAudio.requestAudioPermission();
      if (permRes.granted) {
        setPermissionDenied(false);
        handleScanAndroidAudio();
      } else {
        setPermissionDenied(true);
        setScanStatusMsg(`Audio permission (${permRes.permissionRequired}) was not granted. Please enable in Android Settings > Apps > Bus Wala Track > Permissions > Music and Audio.`);
      }
    } catch (e: any) {
      setScanStatusMsg('Could not request permission: ' + (e?.message || 'Unknown error'));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddSongs(e.target.files);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs <= 0) return '03:15';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="text-amber-100 font-sans w-full pr-6 sm:pr-8">
      {/* ─────────────────────────────────────────────────────────────
          HEADER
         ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-amber-800/60 pb-2 mb-2 gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
            <Music className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-base font-extrabold tracking-wider text-amber-300 font-serif uppercase flex items-center gap-1.5 leading-tight">
              <span>BUS RADIO PLAYLIST</span>
              {isAndroid && (
                <span className="text-[8px] sm:text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-500/60 px-1.5 py-0.2 rounded-full font-mono font-bold">
                  ANDROID MEDIASTORE
                </span>
              )}
            </h3>
            <div className="flex items-center space-x-1 text-[8.5px] sm:text-[10px] text-amber-400/80 font-mono">
              <Lock className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
              <span>100% Offline • No Server Uploads</span>
            </div>
          </div>
        </div>

        {/* TOP ACTION BUTTONS */}
        <div className="flex items-center space-x-1.5">
          {/* Scan Android Phone Storage Button */}
          <button
            onClick={handleScanAndroidAudio}
            disabled={isScanning}
            className="flex items-center justify-center space-x-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 disabled:opacity-60 text-stone-950 border border-amber-300 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-black text-[9.5px] sm:text-xs shadow-md transition active:scale-95 cursor-pointer shrink-0"
            title="Scan device for MP3, WAV, M4A songs via Android MediaStore"
          >
            {isScanning ? (
              <RefreshCw className="w-3 h-3 text-stone-950 animate-spin" />
            ) : (
              <FolderSearch className="w-3.5 h-3.5 text-stone-950 stroke-[2.5]" />
            )}
            <span className="uppercase tracking-wider whitespace-nowrap">
              {isScanning ? 'SCANNING...' : 'SCAN PHONE SONGS'}
            </span>
          </button>

          {/* Fallback File Picker */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/aac,audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
            multiple
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center space-x-1 bg-stone-900 hover:bg-stone-800 text-amber-200 border border-amber-800/80 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg font-bold text-[9px] sm:text-[10.5px] shadow transition active:scale-95 cursor-pointer shrink-0"
            title="Choose files manually from file manager"
          >
            <Smartphone className="w-3 h-3 text-amber-300" />
            <span className="hidden xs:inline uppercase tracking-wider">PICK FILES</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CATEGORY FILTER TABS
         ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-stone-950/80 p-1 rounded-lg border border-amber-900/60 mb-2 gap-1 overflow-x-auto custom-scrollbar">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('local')}
            className={`flex items-center space-x-1 px-2 sm:px-2.5 py-1 rounded-md text-[9.5px] sm:text-xs font-bold font-mono transition cursor-pointer shrink-0 ${
              activeTab === 'local'
                ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                : 'text-amber-300/70 hover:text-amber-100 hover:bg-stone-900'
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span>LOCAL SONGS</span>
            <span className={`ml-1 text-[8.5px] px-1 py-0.2 rounded-full font-sans ${
              activeTab === 'local' ? 'bg-stone-950 text-amber-300' : 'bg-amber-900/60 text-amber-200'
            }`}>
              {localSongs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center space-x-1 px-2 sm:px-2.5 py-1 rounded-md text-[9.5px] sm:text-xs font-bold font-mono transition cursor-pointer shrink-0 ${
              activeTab === 'all'
                ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                : 'text-amber-300/70 hover:text-amber-100 hover:bg-stone-900'
            }`}
          >
            <HardDrive className="w-3 h-3" />
            <span>ALL TRACKS</span>
            <span className={`ml-1 text-[8.5px] px-1 py-0.2 rounded-full font-sans ${
              activeTab === 'all' ? 'bg-stone-950 text-amber-300' : 'bg-amber-900/60 text-amber-200'
            }`}>
              {playlist.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center space-x-1 px-2 sm:px-2.5 py-1 rounded-md text-[9.5px] sm:text-xs font-bold font-mono transition cursor-pointer shrink-0 ${
              activeTab === 'presets'
                ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                : 'text-amber-300/70 hover:text-amber-100 hover:bg-stone-900'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>HIGHWAY RADIO</span>
            <span className={`ml-1 text-[8.5px] px-1 py-0.2 rounded-full font-sans ${
              activeTab === 'presets' ? 'bg-stone-950 text-amber-300' : 'bg-amber-900/60 text-amber-200'
            }`}>
              {presetSongs.length}
            </span>
          </button>
        </div>

        {/* MediaStore / IndexedDB Status Indicator */}
        <div className="hidden sm:flex items-center space-x-1 text-[8.5px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md shrink-0">
          <CheckCircle2 className="w-2.5 h-2.5" />
          <span>{isAndroid ? 'MediaStore Active' : 'Local Storage Ready'}</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PERMISSION / SCAN STATUS BANNER
         ───────────────────────────────────────────────────────────── */}
      {permissionDenied && (
        <div className="bg-rose-950/90 border border-rose-600/80 rounded-xl p-2 sm:p-2.5 mb-2 text-[10px] text-rose-100 flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <p className="font-bold text-rose-200 text-xs">Audio Permission Needed</p>
              <p className="text-[9px] text-rose-300/90">
                Grant <strong>Music and Audio access ({permissionReqType})</strong> to scan songs in Music & Download folders.
              </p>
            </div>
          </div>
          <button
            onClick={handleRequestPermissionAgain}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-lg text-[9px] uppercase tracking-wider shadow active:scale-95 cursor-pointer whitespace-nowrap"
          >
            Allow Audio Access
          </button>
        </div>
      )}

      {scanStatusMsg && !permissionDenied && (
        <div className="bg-stone-900/95 border border-amber-600/60 rounded-xl p-2 mb-2 text-[9.5px] sm:text-[10px] text-amber-200 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-mono">{scanStatusMsg}</span>
          </div>
          <button
            onClick={() => setScanStatusMsg(null)}
            className="text-stone-400 hover:text-amber-200 text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PLAYLIST ITEMS LIST CONTAINER
         ───────────────────────────────────────────────────────────── */}
      {displayList.length === 0 ? (
        <div className="text-center py-3 sm:py-5 px-2 text-amber-400/70 font-mono text-xs border border-dashed border-amber-800/60 rounded-xl bg-stone-950/40 flex flex-col items-center justify-center space-y-2">
          <Smartphone className="w-6 h-6 text-amber-500/80 animate-bounce" />
          <div>
            <p className="font-bold text-amber-300 text-xs sm:text-sm">No Local Songs Found</p>
            <p className="text-[9px] sm:text-[10px] text-amber-400/60 mt-0.5 max-w-sm">
              Tap <strong>Scan Phone Songs</strong> to automatically read MP3, WAV, or M4A audio files indexed in your Music or Download folders.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleScanAndroidAudio}
              disabled={isScanning}
              className="bg-amber-500 hover:bg-amber-400 text-stone-950 px-3 py-1.5 rounded-lg font-black text-[9.5px] sm:text-[10.5px] uppercase tracking-wider shadow-md transition active:scale-95 cursor-pointer flex items-center space-x-1"
            >
              <FolderSearch className="w-3.5 h-3.5" />
              <span>{isScanning ? 'Scanning...' : 'Scan Phone Storage'}</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-stone-900 hover:bg-stone-800 text-amber-200 border border-amber-800 px-2.5 py-1.5 rounded-lg font-bold text-[9px] sm:text-[10px] uppercase tracking-wider transition active:scale-95 cursor-pointer"
            >
              Browse Files
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1 max-h-[clamp(110px,38vh,220px)] overflow-y-auto pr-1 custom-scrollbar">
          {displayList.map((song) => {
            const originalIndex = playlist.findIndex((s) => s.id === song.id);
            const isCurrent = originalIndex === currentSongIndex;

            return (
              <div
                key={song.id}
                className={`flex items-center justify-between p-1.5 sm:p-2 rounded-lg border transition ${
                  isCurrent
                    ? 'bg-amber-900/90 border-amber-500 text-amber-100 shadow-md'
                    : 'bg-stone-900/80 border-amber-900/40 text-amber-100/90 hover:bg-stone-900'
                }`}
              >
                {/* Play button & Song Details */}
                <div
                  className="flex items-center space-x-2 flex-1 min-w-0 cursor-pointer"
                  onClick={() => onSelectSong(originalIndex)}
                >
                  <button
                    className={`p-1.5 rounded-md border flex-shrink-0 cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-400 text-amber-950 border-amber-300'
                        : 'bg-stone-800 text-amber-400 border-amber-800 hover:bg-amber-900/60'
                    }`}
                  >
                    {isCurrent && isPlaying ? (
                      <Pause className="w-3 h-3 fill-amber-950" />
                    ) : (
                      <Play className="w-3 h-3 fill-current ml-0.5" />
                    )}
                  </button>

                  <div className="truncate">
                    <div className="font-bold text-xs truncate font-serif flex items-center space-x-1">
                      <span className="truncate">{song.title}</span>
                      {song.isMediaStore && (
                        <span className="text-[7.5px] bg-emerald-900/70 text-emerald-300 border border-emerald-600/50 px-1 py-0.2 rounded shrink-0 font-mono font-bold">
                          MEDIASTORE
                        </span>
                      )}
                      {!song.isPreset && !song.isMediaStore && (
                        <span className="text-[7.5px] bg-amber-600/40 text-amber-200 border border-amber-500/40 px-1 py-0.2 rounded shrink-0 font-mono">
                          PHONE AUDIO
                        </span>
                      )}
                    </div>
                    <div className="text-[9.5px] sm:text-[10px] text-amber-400/70 truncate font-mono mt-0.5 flex items-center space-x-1.5">
                      <span className="truncate">{song.artist}</span>
                      {song.size ? (
                        <span>• {formatSize(song.size)}</span>
                      ) : null}
                      {song.isPreset && (
                        <span>• [Highway Radio]</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Duration & Actions */}
                <div className="flex items-center space-x-1.5 flex-shrink-0 pl-1">
                  <span className="text-[9.5px] sm:text-[10px] font-mono text-amber-300/90 font-bold mr-0.5">
                    {formatTime(song.duration)}
                  </span>

                  {/* Move Up / Down */}
                  <div className="flex flex-col space-y-0.5">
                    <button
                      disabled={originalIndex === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveSong(originalIndex, originalIndex - 1);
                      }}
                      className="p-0.5 rounded text-amber-400/60 hover:text-amber-200 disabled:opacity-20 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-2.5 h-2.5" />
                    </button>
                    <button
                      disabled={originalIndex === playlist.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveSong(originalIndex, originalIndex + 1);
                      }}
                      className="p-0.5 rounded text-amber-400/60 hover:text-amber-200 disabled:opacity-20 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  {/* Remove Song */}
                  {!song.isPreset && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSong(song.id);
                      }}
                      className="p-1 rounded-md text-rose-400/80 hover:text-rose-200 hover:bg-rose-950/80 transition cursor-pointer ml-0.5"
                      title="Remove local song from playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
