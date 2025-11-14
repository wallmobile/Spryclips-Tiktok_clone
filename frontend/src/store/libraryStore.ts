import { create } from 'zustand';
import { videos as sampleVideos } from '../data/sampleData';

type VideoSource = 'api' | 'sample';

export interface LibraryVideo {
  _id: string;
  url?: string;
  thumbnail?: string;
  description?: string;
  username?: string;
  profileAvatar?: string;
  source?: VideoSource;
}

export interface WatchLaterEntry {
  video: LibraryVideo;
  addedAt: string;
}

export interface PlaylistEntry {
  video: LibraryVideo;
  addedAt: string;
}

export interface Playlist {
  _id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  videos: PlaylistEntry[];
}

interface LibraryStore {
  watchLater: WatchLaterEntry[];
  playlists: Playlist[];
  initialized: boolean;
  hydrate: (bootstrap?: Partial<Pick<LibraryStore, 'watchLater' | 'playlists'>>) => void;
  setWatchLater: (entries: WatchLaterEntry[]) => void;
  setPlaylists: (entries: Playlist[]) => void;
  addToWatchLater: (video: LibraryVideo) => void;
  removeFromWatchLater: (videoId: string) => void;
  isInWatchLater: (videoId: string) => boolean;
  createPlaylist: (payload: { name: string; description?: string; isPublic?: boolean }) => Playlist;
  removePlaylist: (playlistId: string) => void;
  addToPlaylist: (playlistId: string, video: LibraryVideo) => void;
  removeFromPlaylist: (playlistId: string, videoId: string) => void;
}

const STORAGE_KEY = 'tiktok_library_v1';

const hasStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

interface PersistedState {
  watchLater: WatchLaterEntry[];
  playlists: Playlist[];
}

const readStorage = (): PersistedState | null => {
  if (!hasStorage) return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      Array.isArray(parsed.watchLater) &&
      Array.isArray(parsed.playlists)
    ) {
      return parsed as PersistedState;
    }
  } catch (error) {
    console.warn('Failed to read library state from localStorage', error);
  }
  return null;
};

const writeStorage = (state: PersistedState) => {
  if (!hasStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to persist library state', error);
  }
};

export const toLibraryVideo = (video: Record<string, unknown>, fallbackId: string): LibraryVideo => {
  const userRecord = (video['user'] ?? {}) as Record<string, unknown>;
  const username =
    (userRecord['username'] as string | undefined) ||
    (video['channel'] as string | undefined) ||
    (video['owner'] as string | undefined) ||
    (video['creator'] as string | undefined);

  const avatar =
    (userRecord['profile'] as { avatar?: string } | undefined)?.avatar ||
    (video['avatar'] as string | undefined);

  return {
    _id:
      (video['_id'] as string | undefined) ||
      (video['id'] as string | undefined) ||
      fallbackId,
    url: (video['videoUrl'] as string | undefined) || (video['url'] as string | undefined),
    thumbnail: video['thumbnail'] as string | undefined,
    description: video['description'] as string | undefined,
    username,
    profileAvatar: avatar,
    source: (video['__source'] as VideoSource | undefined) ?? 'sample',
  };
};

const createSampleWatchLater = (): WatchLaterEntry[] =>
  sampleVideos.slice(0, 6).map((video, index) => ({
    video: toLibraryVideo(video as Record<string, unknown>, `sample-watch-${index}`),
    addedAt: new Date(Date.now() - index * 60_000).toISOString(),
  }));

const createSamplePlaylists = (): Playlist[] => [
  {
    _id: 'sample-playlist-1',
    name: 'Trending Picks',
    description: 'A curated mix of trending videos.',
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    videos: sampleVideos.slice(0, 3).map((video, index) => ({
      video: toLibraryVideo(video as Record<string, unknown>, `sample-playlist-1-${index}`),
      addedAt: new Date(Date.now() - index * 45_000).toISOString(),
    })),
  },
  {
    _id: 'sample-playlist-2',
    name: 'Workout Boost',
    description: 'High energy clips to stay motivated.',
    isPublic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    videos: sampleVideos.slice(3, 6).map((video, index) => ({
      video: toLibraryVideo(video as Record<string, unknown>, `sample-playlist-2-${index}`),
      addedAt: new Date(Date.now() - index * 30_000).toISOString(),
    })),
  },
];

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  watchLater: [],
  playlists: [],
  initialized: false,
  hydrate: (bootstrap) => {
    if (get().initialized) return;

    const persisted = readStorage();
    const nextWatchLater =
      persisted?.watchLater ??
      bootstrap?.watchLater ??
      createSampleWatchLater();
    const nextPlaylists =
      persisted?.playlists ??
      bootstrap?.playlists ??
      createSamplePlaylists();

    set({
      watchLater: nextWatchLater,
      playlists: nextPlaylists,
      initialized: true,
    });

    writeStorage({ watchLater: nextWatchLater, playlists: nextPlaylists });
  },
  setWatchLater: (entries) => {
    const { playlists } = get();
    set({
      watchLater: entries,
      initialized: true,
    });
    writeStorage({ watchLater: entries, playlists });
  },
  setPlaylists: (entries) => {
    const { watchLater } = get();
    set({
      playlists: entries,
      initialized: true,
    });
    writeStorage({ watchLater, playlists: entries });
  },
  addToWatchLater: (video) => {
    const { watchLater, playlists } = get();
    if (watchLater.some((entry) => entry.video._id === video._id)) {
      return;
    }
    const entry: WatchLaterEntry = {
      video,
      addedAt: new Date().toISOString(),
    };
    const nextWatchLater = [entry, ...watchLater];
    set({ watchLater: nextWatchLater });
    writeStorage({ watchLater: nextWatchLater, playlists });
  },
  removeFromWatchLater: (videoId) => {
    const { watchLater, playlists } = get();
    const nextWatchLater = watchLater.filter((entry) => entry.video._id !== videoId);
    set({ watchLater: nextWatchLater });
    writeStorage({ watchLater: nextWatchLater, playlists });
  },
  isInWatchLater: (videoId) => get().watchLater.some((entry) => entry.video._id === videoId),
  createPlaylist: ({ name, description, isPublic = true }) => {
    const { playlists, watchLater } = get();
    const now = new Date().toISOString();
    const playlist: Playlist = {
      _id: `playlist-${now}`,
      name,
      description,
      isPublic,
      createdAt: now,
      updatedAt: now,
      videos: [],
    };
    const nextPlaylists = [playlist, ...playlists];
    set({ playlists: nextPlaylists });
    writeStorage({ watchLater, playlists: nextPlaylists });
    return playlist;
  },
  removePlaylist: (playlistId) => {
    const { playlists, watchLater } = get();
    const nextPlaylists = playlists.filter((playlist) => playlist._id !== playlistId);
    set({ playlists: nextPlaylists });
    writeStorage({ watchLater, playlists: nextPlaylists });
  },
  addToPlaylist: (playlistId, video) => {
    const { playlists, watchLater } = get();
    const nextPlaylists = playlists.map((playlist) => {
      if (playlist._id !== playlistId) {
        return playlist;
      }
      if (playlist.videos.some((entry) => entry.video._id === video._id)) {
        return playlist;
      }
      return {
        ...playlist,
        videos: [
          { video, addedAt: new Date().toISOString() },
          ...playlist.videos,
        ],
        updatedAt: new Date().toISOString(),
      };
    });
    set({ playlists: nextPlaylists });
    writeStorage({ watchLater, playlists: nextPlaylists });
  },
  removeFromPlaylist: (playlistId, videoId) => {
    const { playlists, watchLater } = get();
    const nextPlaylists = playlists.map((playlist) => {
      if (playlist._id !== playlistId) return playlist;
      return {
        ...playlist,
        videos: playlist.videos.filter((entry) => entry.video._id !== videoId),
        updatedAt: new Date().toISOString(),
      };
    });
    set({ playlists: nextPlaylists });
    writeStorage({ watchLater, playlists: nextPlaylists });
  },
}));

export const makeLibraryVideoFromFeed = (
  videoId: string,
  payload: {
    src?: string;
    thumbnail?: string;
    description?: string;
    username?: string;
    avatar?: string;
    source?: VideoSource;
  }
): LibraryVideo => ({
  _id: videoId,
  url: payload.src,
  thumbnail: payload.thumbnail,
  description: payload.description,
  username: payload.username,
  profileAvatar: payload.avatar,
  source: payload.source ?? 'api',
});

