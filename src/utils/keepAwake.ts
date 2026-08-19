import { KeepAwake } from '@capacitor-community/keep-awake';
import { Capacitor } from '@capacitor/core';

let webWakeLockSentinel: WakeLockSentinel | null = null;
let isKeepAwakeActive = false;

/**
 * Request the device screen to stay awake and prevent auto-lock / sleep
 * Works seamlessly on Android Native (via Capacitor KeepAwake plugin)
 * and on mobile browsers/PWAs (via Screen Wake Lock API).
 */
export async function enableScreenKeepAwake(): Promise<boolean> {
  isKeepAwakeActive = true;

  // 1. Try Native Capacitor Android Plugin
  if (Capacitor.isNativePlatform()) {
    try {
      await KeepAwake.keepAwake();
      return true;
    } catch (err) {
      console.warn('Native KeepAwake error:', err);
    }
  }

  // 2. Try Standard Web Screen Wake Lock API (Chrome, Edge, Android WebView, PWA)
  if ('wakeLock' in navigator && navigator.wakeLock) {
    try {
      if (!webWakeLockSentinel || webWakeLockSentinel.released) {
        webWakeLockSentinel = await navigator.wakeLock.request('screen');
        webWakeLockSentinel.addEventListener('release', () => {
          webWakeLockSentinel = null;
          // If we still want keep awake active, re-acquire upon visibility change or user interaction
          if (isKeepAwakeActive && document.visibilityState === 'visible') {
            reacquireWakeLock();
          }
        });
        return true;
      }
    } catch (err) {
      console.warn('Screen WakeLock API request failed:', err);
    }
  }

  return false;
}

/**
 * Release screen keep awake lock to allow natural device screen timeout
 */
export async function disableScreenKeepAwake(): Promise<void> {
  isKeepAwakeActive = false;

  if (Capacitor.isNativePlatform()) {
    try {
      await KeepAwake.allowSleep();
    } catch {
      // Ignore
    }
  }

  if (webWakeLockSentinel) {
    try {
      await webWakeLockSentinel.release();
      webWakeLockSentinel = null;
    } catch {
      // Ignore
    }
  }
}

/**
 * Helper to re-acquire wake lock when tab/app regains visibility or focus
 */
async function reacquireWakeLock() {
  if (!isKeepAwakeActive || document.visibilityState !== 'visible') return;

  if ('wakeLock' in navigator && navigator.wakeLock) {
    try {
      webWakeLockSentinel = await navigator.wakeLock.request('screen');
    } catch {
      // Ignore
    }
  }
}

/**
 * Initialize automatic listeners to ensure Screen Keep Awake persists
 * when returning from background, unlocking device, or switching apps.
 */
export function initKeepAwakeManager() {
  // Always enable by default when the app runs
  enableScreenKeepAwake();

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && isKeepAwakeActive) {
      enableScreenKeepAwake();
    }
  };

  const handleUserInteraction = () => {
    if (isKeepAwakeActive && (!webWakeLockSentinel || webWakeLockSentinel.released)) {
      enableScreenKeepAwake();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleVisibilityChange);
  window.addEventListener('touchstart', handleUserInteraction, { passive: true });
  window.addEventListener('click', handleUserInteraction, { passive: true });

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleVisibilityChange);
    window.removeEventListener('touchstart', handleUserInteraction);
    window.removeEventListener('click', handleUserInteraction);
  };
}
