import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate
} from 'react-router-dom';
import type { Location } from 'react-router-dom';
import './App.css';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { WatchHistoryProvider } from './context/WatchHistoryContext';
import { RecommendationProvider } from './context/RecommendationContext';
import { getAllVideos } from './api/videos';
import { videos as sampleVideos } from './data/sampleData';
import ProtectedRoute from './routes/ProtectedRoute';
import ErrorToasts from './components/ErrorToasts';

const ForYouFeed = lazy(() => import('./components/ForYouFeed'));
const Navbar = lazy(() => import('./components/Navbar'));
const Sidebar = lazy(() => import('./components/Sidebar'));
const SystemNotificationBanner = lazy(() => import('./components/SystemNotificationBanner'));
const Explore = lazy(() => import('./components/Explore'));
const Following = lazy(() => import('./components/Following'));
const Live = lazy(() => import('./components/LIVE'));
const WatchLater = lazy(() => import('./components/WatchLater'));
const PlaylistsManager = lazy(() => import('./components/PlaylistsManager'));
const VideoQAInbox = lazy(() => import('./components/VideoQAInbox'));
const UploadPage = lazy(() => import('./components/UploadPage'));
const Profile = lazy(() => import('./components/Profile'));
const More = lazy(() => import('./components/More'));
const Login = lazy(() => import('./components/Login'));
const Signup = lazy(() => import('./components/Signup'));
const TikTokStudio = lazy(() => import('./components/TikTokStudio'));
const EffectsLab = lazy(() => import('./components/EffectsLab'));
const SellerDashboard = lazy(() => import('./components/SellerDashboard'));
const GrowthToolsHub = lazy(() => import('./components/GrowthToolsHub'));
const SupportCenter = lazy(() => import('./components/SupportCenter'));

interface VideoUserProfile {
  avatar?: string;
}

interface VideoUser {
  username?: string;
  profile?: VideoUserProfile;
  [key: string]: unknown;
}

export interface VideoData {
  _id?: string;
  id?: string;
  url?: string;
  videoUrl?: string;
  thumbnail?: string;
  user?: VideoUser;
  avatar?: string;
  description?: string;
  song?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  __source?: 'api' | 'sample';
  [key: string]: unknown;
}

interface FeedItem {
  id: string;
  src: string;
  poster?: string;
  profileImg?: string;
  username?: string;
  description?: string;
  song?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  video: VideoData;
}

const normalizeVideoData = (
  video: Record<string, unknown>,
  source: 'api' | 'sample' = 'api'
): VideoData => {
  const candidateId =
    video._id ??
    video.id ??
    video.videoId ??
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const username =
    (video.user as VideoUser | undefined)?.username ||
    (video.channel as string | undefined) ||
    '@user';

  const avatar =
    (video.user as VideoUser | undefined)?.profile?.avatar ||
    (video.avatar as string | undefined) ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=ff0050&color=fff`;

  return {
    _id: String(candidateId),
    id: String(candidateId),
    url: (video.url as string) || (video.videoUrl as string) || '',
    videoUrl: (video.videoUrl as string) || (video.url as string) || '',
    thumbnail: video.thumbnail as string | undefined,
    user:
      (video.user as VideoUser | undefined) ||
      ({
        username,
        profile: {
          avatar
        }
      } as VideoUser),
    avatar,
    description: (video.description as string) || '',
    song: (video.song as string) || 'Original Sound',
    likes: typeof video.likes === 'number' ? video.likes : 0,
    comments: typeof video.comments === 'number' ? video.comments : 0,
    shares: typeof video.shares === 'number' ? video.shares : 0,
    views: typeof video.views === 'number' ? video.views : 0,
    hashtags: video.hashtags as string[] | undefined,
    channel: video.channel as string | undefined,
    __source: source
  };
};

const LoadingSpinner: React.FC = () => (
  <div
    className="loading-container fade-in"
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      flexDirection: 'column',
      gap: '1.5rem',
      background: 'linear-gradient(135deg, #f8faff 0%, #e0f2fe 50%, #dbeafe 100%)'
    }}
  >
    <div
      className="loading-spinner"
      style={{
        width: '50px',
        height: '50px',
        border: '4px solid rgba(37, 99, 235, 0.1)',
        borderTop: '4px solid #2563EB',
        borderRight: '4px solid #3B82F6',
        borderRadius: '50%',
        animation: 'spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
      }}
    ></div>
    <p
      style={{
        color: '#2563EB',
        fontSize: '16px',
        fontWeight: '500',
        animation: 'pulse 2s ease-in-out infinite'
      }}
    >
      Loading amazing content...
    </p>
    <style>
      {`@keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .loading-container {
        transition: opacity 0.3s ease;
      }`}
    </style>
  </div>
);

const HomeFeed: React.FC = () => {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fallbackVideos = useMemo(
    () => sampleVideos.map((video) => normalizeVideoData(video as Record<string, unknown>, 'sample')),
    []
  );
  const fetchErrorLoggedRef = useRef(false);

  // Listen for video upload events to refresh feed
  useEffect(() => {
    const handleVideoUploaded = async (event: Event) => {
      try {
        console.log('Video uploaded event received, refreshing feed...');
        setLoading(true);
        
        // Clear cache and fetch fresh data
        const data = await getAllVideos();
        console.log('Fetched videos after upload:', data?.length || 0);
        
        if (data && Array.isArray(data) && data.length > 0) {
          const normalizedVideos = data.map((video) => normalizeVideoData(video as Record<string, unknown>, 'api'));
          console.log('Normalized videos:', normalizedVideos.length);
          setVideos(normalizedVideos);
        } else {
          console.warn('No videos returned after upload');
        }
        setError(null);
      } catch (err) {
        console.error('Error refreshing videos after upload:', err);
        setError('Failed to refresh feed. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener('videoUploaded', handleVideoUploaded);
    return () => {
      window.removeEventListener('videoUploaded', handleVideoUploaded);
    };
  }, [setVideos]);

  useEffect(() => {
    let isMounted = true;
    const fetchVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAllVideos();
        if (!isMounted) return;
        if (Array.isArray(data) && data.length > 0) {
          setVideos(data.map((video) => normalizeVideoData(video as Record<string, unknown>, 'api')));
        } else {
          if (!fetchErrorLoggedRef.current) {
            console.warn('Video feed returned no items. Using fallback catalogue.');
            fetchErrorLoggedRef.current = true;
          }
          setVideos(fallbackVideos);
        }
      } catch (err) {
        if (!isMounted) return;
        if (!fetchErrorLoggedRef.current) {
          console.warn('Failed to load videos, using fallback data:', err);
          fetchErrorLoggedRef.current = true;
        }
        setError('Failed to load videos');
        setVideos(fallbackVideos);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchVideos();
    return () => {
      isMounted = false;
    };
  }, [fallbackVideos]);

  const feedItems: FeedItem[] = useMemo(() => {
    if (!videos || videos.length === 0) return [];

    return videos.map((video) => {
      const fallbackId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const id = String(video._id || video.id || fallbackId);
      const username = video.user?.username || (video as { channel?: string }).channel || '@user';
      const avatar =
        video.user?.profile?.avatar ||
        (video as { avatar?: string }).avatar ||
        `https://ui-avatars.com/api/?name=${username}&background=ff0050&color=fff`;

      return {
        id,
        src: (video.url as string) || (video.videoUrl as string) || '',
        poster: video.thumbnail || undefined,
        profileImg: avatar,
        username,
        description: video.description || '',
        song: (video.song as string) || 'Original Sound',
        likes: video.likes || 0,
        comments: video.comments || 0,
        shares: video.shares || 0,
        views: video.views || 0,
        video
      };
    });
  }, [videos]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error && feedItems.length === 0) {
    return (
      <div className="feed-error">
        <p>{error}</p>
      </div>
    );
  }

  return <ForYouFeed items={feedItems} />;
};

const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  return <Explore mode="overlay" onClose={() => navigate('/', { replace: true })} />;
};

const FollowingPage: React.FC = () => {
  return <Following />;
};

const LivePage: React.FC = () => {
  const navigate = useNavigate();
  return <Live onClose={() => navigate('/')} />;
};

const WatchLaterPage: React.FC = () => {
  return <WatchLater />;
};

const PlaylistsPage: React.FC = () => {
  return <PlaylistsManager />;
};

const VideoQAPage: React.FC = () => {
  const navigate = useNavigate();
  return <VideoQAInbox mode="overlay" onClose={() => navigate('/', { replace: true })} />;
};

const UploadPageRoute: React.FC = () => {
  const navigate = useNavigate();
  return <UploadPage onClose={() => navigate('/')} />;
};

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  return <Profile onClose={() => navigate('/')} />;
};

const MorePage: React.FC = () => {
  const navigate = useNavigate();
  return <More mode="page" onClose={() => navigate('/')} />;
};

const TikTokStudioPage: React.FC = () => {
  const navigate = useNavigate();
  return <TikTokStudio onClose={() => navigate('/more')} />;
};

const EffectsLabPage: React.FC = () => {
  const navigate = useNavigate();
  return <EffectsLab onClose={() => navigate('/more')} />;
};

const SellerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  return <SellerDashboard onClose={() => navigate('/more')} />;
};

const GrowthToolsPage: React.FC = () => {
  const navigate = useNavigate();
  return <GrowthToolsHub onClose={() => navigate('/more')} />;
};

const SupportCenterPage: React.FC = () => {
  const navigate = useNavigate();
  return <SupportCenter onClose={() => navigate('/more')} />;
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const from = ((location.state as { from?: Location })?.from?.pathname) || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, from, navigate]);

  const handleClose = () => {
    navigate(from, { replace: true });
  };

  return (
    <div className="auth-page">
      <Suspense fallback={<LoadingSpinner />}>
        <Login
          onClose={handleClose}
          onSwitchToSignup={() => navigate('/signup', { replace: true, state: { from } })}
        />
      </Suspense>
    </div>
  );
};

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const from = ((location.state as { from?: Location })?.from?.pathname) || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, from, navigate]);

  const handleClose = () => {
    navigate(from, { replace: true });
  };

  return (
    <div className="auth-page">
      <Suspense fallback={<LoadingSpinner />}>
        <Signup
          onClose={handleClose}
          onSwitchToLogin={() => navigate('/login', { replace: true, state: { from } })}
        />
      </Suspense>
    </div>
  );
};

const MainLayout: React.FC = () => {
  const location = useLocation();
  const showHomeChrome = location.pathname === '/';

  return (
    <div className="app">
      <Suspense fallback={<LoadingSpinner />}>
        <Sidebar />
      </Suspense>
      <div className="app-content">
        {showHomeChrome && (
          <>
            <Suspense fallback={<div style={{ height: '60px' }}></div>}>
              <Navbar />
            </Suspense>
            <Suspense fallback={null}>
              <SystemNotificationBanner />
            </Suspense>
          </>
        )}
        <div className="app-outlet">
          <Suspense fallback={<LoadingSpinner />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

const AppRoutes: React.FC = () => (
  <Routes>
    <Route element={<MainLayout />}>
      <Route index element={<HomeFeed />} />
      <Route path="explore" element={<ExplorePage />} />
      <Route
        path="following"
        element={
          <ProtectedRoute>
            <FollowingPage />
          </ProtectedRoute>
        }
      />
      <Route path="live" element={<LivePage />} />
      <Route
        path="watch-later"
        element={
          <ProtectedRoute>
            <WatchLaterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="playlists"
        element={
          <ProtectedRoute>
            <PlaylistsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="qa"
        element={
          <ProtectedRoute>
            <VideoQAPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="upload"
        element={
          <ProtectedRoute>
            <UploadPageRoute />
          </ProtectedRoute>
        }
      />
      <Route
        path="profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="more"
        element={
          <ProtectedRoute>
            <MorePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="more/studio"
        element={
          <ProtectedRoute>
            <TikTokStudioPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="more/effects"
        element={
          <ProtectedRoute>
            <EffectsLabPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="more/shop"
        element={
          <ProtectedRoute>
            <SellerDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="more/growth-tools"
        element={
          <ProtectedRoute>
            <GrowthToolsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="more/support"
        element={
          <ProtectedRoute>
            <SupportCenterPage />
          </ProtectedRoute>
        }
      />
    </Route>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App: React.FC = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <WatchHistoryProvider>
            <RecommendationProvider>
              <ErrorToasts />
              <AppRoutes />
            </RecommendationProvider>
          </WatchHistoryProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
