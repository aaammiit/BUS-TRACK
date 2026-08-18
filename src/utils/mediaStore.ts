import { registerPlugin, Capacitor } from '@capacitor/core';
import { Song } from '../types';

export interface NativeSongItem {
  id: string;
  mediaStoreId: number;
  title: string;
  artist: string;
  duration: number;
  fileName: string;
  mimeType: string;
  contentUri: string;
  size: number;
  dateAdded: number;
}

export interface QueryAudioResult {
  status: 'SUCCESS' | 'PERMISSION_DENIED' | 'ERROR';
  count: number;
  message?: string;
  songs: NativeSongItem[];
}

export interface PermissionResult {
  granted: boolean;
  androidVersion: number;
  permissionRequired: string;
}

export interface AudioBase64Result {
  base64: string;
  size: number;
}

export interface MediaStoreAudioPluginInterface {
  checkPermission(): Promise<PermissionResult>;
  requestAudioPermission(): Promise<PermissionResult>;
  queryAudioFiles(): Promise<QueryAudioResult>;
  getAudioBase64(options: { contentUri: string }): Promise<AudioBase64Result>;
}

// Register the custom native plugin
export const MediaStoreAudio = registerPlugin<MediaStoreAudioPluginInterface>('MediaStoreAudio');

/**
 * Checks whether the app is currently running in a native Android environment with the MediaStore plugin
 */
export function isAndroidNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

/**
 * Queries Android device audio using the native MediaStore plugin
 */
export async function fetchAndroidMediaStoreAudio(): Promise<{
  success: boolean;
  songs: Song[];
  status: 'SUCCESS' | 'PERMISSION_DENIED' | 'NO_SONGS' | 'NOT_ANDROID' | 'ERROR';
  message: string;
}> {
  if (!isAndroidNative()) {
    return {
      success: false,
      songs: [],
      status: 'NOT_ANDROID',
      message: 'Not running in native Android environment. Use standard file picker or web audio.'
    };
  }

  try {
    // 1. Check or request permission
    const permStatus = await MediaStoreAudio.checkPermission();
    if (!permStatus.granted) {
      const reqResult = await MediaStoreAudio.requestAudioPermission();
      if (!reqResult.granted) {
        return {
          success: false,
          songs: [],
          status: 'PERMISSION_DENIED',
          message: `Permission to access audio files was denied (${reqResult.permissionRequired || 'READ_MEDIA_AUDIO'}). Please allow Music/Audio access in Android Settings.`
        };
      }
    }

    // 2. Query MediaStore
    const res = await MediaStoreAudio.queryAudioFiles();
    if (res.status === 'PERMISSION_DENIED') {
      return {
        success: false,
        songs: [],
        status: 'PERMISSION_DENIED',
        message: res.message || 'Permission denied when accessing Android MediaStore.'
      };
    }

    if (res.status === 'ERROR') {
      return {
        success: false,
        songs: [],
        status: 'ERROR',
        message: res.message || 'Error querying Android MediaStore audio index.'
      };
    }

    if (!res.songs || res.songs.length === 0) {
      return {
        success: true,
        songs: [],
        status: 'NO_SONGS',
        message: 'No music files detected by Android MediaStore in Music, Download, or Audio folders.'
      };
    }

    // 3. Map into Song interfaces
    const songs: Song[] = res.songs.map((s) => ({
      id: s.id,
      title: s.title || s.fileName.replace(/\.[^/.]+$/, '') || 'Local Audio Track',
      artist: s.artist && s.artist !== '<unknown>' ? s.artist : 'Phone Storage',
      duration: s.duration > 0 ? s.duration : 180,
      url: s.contentUri, // content:// URI or base64 resolved on load
      contentUri: s.contentUri,
      fileName: s.fileName,
      isPreset: false,
      isMediaStore: true,
      size: s.size,
      addedAt: s.dateAdded > 0 ? s.dateAdded * 1000 : Date.now()
    }));

    return {
      success: true,
      songs,
      status: 'SUCCESS',
      message: `Found ${songs.length} audio tracks in Android MediaStore.`
    };
  } catch (error: any) {
    console.error('Error fetching Android MediaStore audio:', error);
    return {
      success: false,
      songs: [],
      status: 'ERROR',
      message: error?.message || 'Failed to communicate with Android MediaStore plugin.'
    };
  }
}

/**
 * Resolves a playable URL for an Android MediaStore song.
 * Converts native content:// URI into an in-memory playable object URL if needed.
 */
export async function resolvePlayableSongUrl(song: Song): Promise<string> {
  // If it's already a valid blob:, data:, or http URL, return directly
  if (song.url && (song.url.startsWith('blob:') || song.url.startsWith('data:') || song.url.startsWith('http'))) {
    return song.url;
  }

  // If it has contentUri on Android, fetch the raw bytes via plugin and create an in-memory blob
  if (isAndroidNative() && (song.contentUri || song.url.startsWith('content://'))) {
    try {
      const uri = song.contentUri || song.url;
      const res = await MediaStoreAudio.getAudioBase64({ contentUri: uri });
      if (res && res.base64) {
        const mimeType = song.fileName?.endsWith('.wav') ? 'audio/wav'
          : song.fileName?.endsWith('.m4a') ? 'audio/mp4'
          : song.fileName?.endsWith('.ogg') ? 'audio/ogg'
          : song.fileName?.endsWith('.flac') ? 'audio/flac'
          : 'audio/mpeg';

        const binaryString = window.atob(res.base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        song.url = blobUrl;
        return blobUrl;
      }
    } catch (e) {
      console.error('Failed to convert content URI to playable Blob URL:', e);
    }
  }

  return song.url;
}
