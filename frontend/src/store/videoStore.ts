import { create } from 'zustand';

interface VideoStore {
  globalMute: boolean;
  globalVolume: number; // Volume 0-100
  lastVolume: number; // Last volume before mute (0-1)
  activeId?: string;
  setGlobalMute: (muted: boolean) => void;
  setGlobalVolume: (volume: number) => void;
  setLastVolume: (volume: number) => void;
  setActiveId: (id?: string) => void;
}

const hasStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

// Initialize lastVolume from localStorage
const getStoredLastVolume = (): number => {
  try {
    if (!hasStorage) {
      return 0.6;
    }
    const stored = window.localStorage.getItem('tiktok_vol');
    if (stored) {
      const vol = parseFloat(stored);
      return isNaN(vol) ? 0.6 : Math.max(0.2, Math.min(1, vol));
    }
  } catch (e) {
    console.warn('Failed to read tiktok_vol from localStorage:', e);
  }
  return 0.6; // Default lastVolume
};

// Check if user has previously set mute preference
const getStoredMuteState = (): boolean => {
  try {
    if (!hasStorage) {
      return false;
    }
    const stored = window.localStorage.getItem('tiktok_mute');
    if (stored !== null) {
      return stored === 'true';
    }
  } catch (e) {
    console.warn('Failed to read tiktok_mute from localStorage:', e);
  }
  return false; // Default unmuted - sound will play
};

export const useVideoStore = create<VideoStore>((set) => ({
  globalMute: getStoredMuteState(), // Check localStorage for mute preference, default unmuted
  globalVolume: 100, // Default volume 100%
  lastVolume: getStoredLastVolume(),
  activeId: undefined,
  setGlobalMute: (muted: boolean) => {
    set({ globalMute: muted });
    // Persist to localStorage
    try {
      if (hasStorage) {
        window.localStorage.setItem('tiktok_mute', muted.toString());
      }
    } catch (e) {
      console.warn('Failed to write tiktok_mute to localStorage:', e);
    }
  },
  setGlobalVolume: (volume: number) => set({ globalVolume: Math.max(0, Math.min(100, volume)) }),
  setLastVolume: (volume: number) => {
    const clampedVol = Math.max(0.2, Math.min(1, volume));
    set({ lastVolume: clampedVol });
    // Persist to localStorage
    try {
      if (hasStorage) {
        window.localStorage.setItem('tiktok_vol', clampedVol.toString());
      }
    } catch (e) {
      console.warn('Failed to write tiktok_vol to localStorage:', e);
    }
  },
  setActiveId: (id?: string) => set({ activeId: id }),
}));













