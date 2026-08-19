export type SceneType = 'autumn' | 'mountain' | 'night' | 'rainy' | 'straight';
export type JourneySpeed = 'slow' | 'normal' | 'fast';
export type ViewMode = 'straight' | 'side' | 'cabin';
export type HornRhythm = 'classic' | 'double' | 'rhythmic';

export interface Song {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  url: string; // Blob URL or synthesized object URL
  fileName?: string;
  isPreset?: boolean;
  addedAt: number;
  blob?: Blob;
  contentUri?: string;
  isMediaStore?: boolean;
  size?: number;
}

export interface BusStopInfo {
  name: string;
  region: string;
  tagline: string;
}

export interface SceneConfig {
  id: SceneType;
  name: string;
  weatherLabel: string;
  skyGradient: string;
  sunOrMoon: 'sun' | 'rain-cloud' | 'winter-sun' | 'sunset-sun' | 'mountain-mist' | 'moon';
  groundColor: string;
  roadColor: string;
  mountainColor: string;
  treeColors: string[];
  ambientParticle: 'none' | 'rain' | 'fog' | 'sunset-glow' | 'heat-haze';
  stops: BusStopInfo[];
  description: string;
}

export interface PlayerState {
  isPlaying: boolean;
  currentSongIndex: number;
  currentTime: number;
  duration: number;
  musicVolume: number;
  hornVolume: number;
  isMuted: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  isFullJourney: boolean;
  isAtBusStop: boolean;
  currentStopName: string;
  autoHorn: boolean;
}
