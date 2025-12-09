import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams
} from 'react-router-dom';
import type { Location } from 'react-router-dom';
import './App.css';
import ErrorBoundary from './components/common/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { WatchHistoryProvider } from './context/WatchHistoryContext';
import { RecommendationProvider } from './context/RecommendationContext';
import { getAllVideos } from './api/videos';
import { videos as sampleVideos } from './data/sampleData';
import ProtectedRoute from './routes/ProtectedRoute';
import ErrorToasts from './components/common/ErrorToasts';

const ForYouFeed = lazy(() => import('./components/video/ForYouFeed'));
const Navbar = lazy(() => import('./components/navigation/Navbar'));
const Sidebar = lazy(() => import('./components/navigation/Sidebar'));
const SystemNotificationBanner = lazy(() => import('./components/common/SystemNotificationBanner'));
const Explore = lazy(() => import('./components/feed/Explore'));
const SearchPage = lazy(() => import('./components/feed/SearchPage'));
const Following = lazy(() => import('./components/feed/Following'));
// StoriesBar removed - Stories only show around profile picture
const StoryViewer = lazy(() => import('./components/stories/StoryViewer'));
const StoryCreator = lazy(() => import('./components/stories/StoryCreator'));
const Live = lazy(() => import('./components/live/LIVE'));
const WatchLater = lazy(() => import('./components/playlist/WatchLater'));
const PlaylistsManager = lazy(() => import('./components/playlist/PlaylistsManager'));
const VideoQAInbox = lazy(() => import('./components/video/VideoQAInbox'));
const UploadPage = lazy(() => import('./components/upload/UploadPage'));
const Profile = lazy(() => import('./components/profile/Profile'));
const More = lazy(() => import('./components/common/More'));
const Login = lazy(() => import('./components/auth/Login'));
const Signup = lazy(() => import('./components/auth/Signup'));
const TikTokStudio = lazy(() => import('./components/creator/TikTokStudio'));
const EffectsLab = lazy(() => import('./components/creator/EffectsLab'));
const SellerDashboard = lazy(() => import('./components/business/SellerDashboard'));
const GrowthToolsHub = lazy(() => import('./components/creator/GrowthToolsHub'));
const SupportCenter = lazy(() => import('./components/common/SupportCenter'));
const BusinessSuite = lazy(() => import('./components/business/BusinessSuite'));
const AdManager = lazy(() => import('./components/business/AdManager'));
const ProductCatalog = lazy(() => import('./components/business/ProductCatalog'));
const BusinessMessaging = lazy(() => import('./components/business/BusinessMessaging'));
const NotificationCenter = lazy(() => import('./components/social/NotificationCenter'));
const NotificationSettings = lazy(() => import('./components/settings/NotificationSettings'));
const PrivacySettings = lazy(() => import('./components/settings/PrivacySettings'));
const Balance = lazy(() => import('./components/common/Balance'));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel') as Promise<{ default: React.ComponentType<any> }>);
const AdminLogin = lazy(() => import('./components/admin/AdminLogin'));
const PolicyCompliance = lazy(() => import('./components/admin/PolicyCompliance'));
const SecuritySettings = lazy(() => import('./components/admin/SecuritySettings'));
const NotificationsControl = lazy(() => import('./components/admin/NotificationsControl'));

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
      background: '#ffffff'
    }}
  >
    <div
      className="loading-spinner"
      style={{
        width: '50px',
        height: '50px',
        border: '4px solid rgba(0, 0, 0, 0.1)',
        borderTop: '4px solid #656565',
        borderRadius: '50%',
        animation: 'spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite'
      }}
    ></div>
    <p
      style={{
        color: '#656565',
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
  const { isAuthenticated } = useAuth();
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Story viewer and creator removed from HomeFeed - only available from Profile
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

      // Production: Backend already returns full URLs (https://spryclips.com/uploads/...)
      // Development: Use relative URLs, browser will use localhost:5000
      const videoUrl = (video.url as string) || (video.videoUrl as string) || '';
      const thumbnailUrl = video.thumbnail;

      return {
        id,
        src: videoUrl,
        poster: thumbnailUrl || undefined,
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

  // Story handling removed - stories only accessible from Profile page

  if (error && feedItems.length === 0) {
    return (
      <div className="feed-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <>
      {/* StoriesBar removed - Stories only show around profile picture ring */}
      <ForYouFeed items={feedItems} />
    </>
  );
};

const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  return <Explore mode="overlay" onClose={() => navigate('/', { replace: true })} />;
};

const SearchPageRoute: React.FC = () => {
  const navigate = useNavigate();
  return <SearchPage onClose={() => navigate('/', { replace: true })} />;
};

const FollowingPage: React.FC = () => {
  return <Following />;
};

const LivePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromCreatorTools = location.state?.from === 'creator-tools';
  
  return <Live onClose={() => {
    if (fromCreatorTools) {
      sessionStorage.setItem('openCreatorTools', 'true');
      navigate('/profile', { replace: true, state: { openCreatorTools: true } });
    } else {
      navigate('/');
    }
  }} />;
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
  const location = useLocation();
  const fromCreatorTools = location.state?.from === 'creator-tools' || 
                           document.referrer.includes('profile') ||
                           sessionStorage.getItem('fromCreatorTools') === 'true';
  
  // Store in sessionStorage when navigating from Creator Tools
  React.useEffect(() => {
    if (location.state?.from === 'creator-tools') {
      sessionStorage.setItem('fromCreatorTools', 'true');
    }
  }, [location.state]);
  
  const handleClose = () => {
    if (fromCreatorTools) {
      sessionStorage.setItem('openCreatorTools', 'true');
      navigate('/profile', { replace: true, state: { openCreatorTools: true } });
    } else {
      sessionStorage.removeItem('openCreatorTools');
      navigate('/');
    }
  };
  
  return <UploadPage onClose={handleClose} />;
};

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { username } = useParams<{ username?: string }>();
  return <Profile onClose={() => navigate('/')} username={username} />;
};

const MorePage: React.FC = () => {
  const navigate = useNavigate();
  return <More mode="page" onClose={() => navigate('/')} />;
};

const TikTokStudioPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromCreatorTools = location.state?.from === 'creator-tools';
  
  return <TikTokStudio onClose={() => {
    if (fromCreatorTools) {
      navigate('/profile', { replace: true });
    } else {
      navigate('/profile');
    }
  }} />;
};

const EffectsLabPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  return <EffectsLab onClose={() => {
    // Always navigate back to More page
    navigate('/more', { replace: true });
  }} />;
};

const SellerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  return <SellerDashboard onClose={() => navigate('/profile')} />;
};

const GrowthToolsPage: React.FC = () => {
  const navigate = useNavigate();
  return <GrowthToolsHub onClose={() => navigate('/more')} />;
};

const BusinessSuitePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromBusinessTools = location.state?.from === 'business-tools';
  
  return <BusinessSuite onClose={() => {
    if (fromBusinessTools) {
      sessionStorage.setItem('openBusinessTools', 'true');
      navigate('/profile', { replace: true, state: { openBusinessTools: true } });
    } else {
      navigate('/profile');
    }
  }} />;
};

const AdManagerPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromBusinessTools = location.state?.from === 'business-tools';
  
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AdManager onClose={() => {
        if (fromBusinessTools) {
          sessionStorage.setItem('openBusinessTools', 'true');
          navigate('/profile', { replace: true, state: { openBusinessTools: true } });
        } else {
          navigate('/profile');
        }
      }} />
    </Suspense>
  );
};

const ProductCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromBusinessTools = location.state?.from === 'business-tools';
  
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProductCatalog onClose={() => {
        if (fromBusinessTools) {
          sessionStorage.setItem('openBusinessTools', 'true');
          navigate('/profile', { replace: true, state: { openBusinessTools: true } });
        } else {
          navigate('/profile');
        }
      }} />
    </Suspense>
  );
};

const BusinessMessagingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromBusinessTools = location.state?.from === 'business-tools';
  
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <BusinessMessaging onClose={() => {
        if (fromBusinessTools) {
          sessionStorage.setItem('openBusinessTools', 'true');
          navigate('/profile', { replace: true, state: { openBusinessTools: true } });
        } else {
          navigate('/profile');
        }
      }} />
    </Suspense>
  );
};

const ActivityCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPersonalTools = location.state?.from === 'personal-tools';
  
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <NotificationCenter onClose={() => {
        if (fromPersonalTools) {
          sessionStorage.setItem('openPersonalTools', 'true');
          navigate('/profile', { replace: true, state: { openPersonalTools: true } });
        } else {
          navigate('/profile');
        }
      }} />
    </Suspense>
  );
};

const NotificationSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <NotificationSettings onClose={() => navigate('/profile')} />
    </Suspense>
  );
};

const PrivacySettingsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PrivacySettings onClose={() => navigate('/profile')} />
    </Suspense>
  );
};

const BalancePage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Balance onClose={() => navigate(-1)} />
    </Suspense>
  );
};

const SupportCenterPage: React.FC = () => {
  const navigate = useNavigate();
  return <SupportCenter onClose={() => navigate('/more')} />;
};

const GoogleAuthCallback = lazy(() => import('./components/auth/GoogleAuthCallback'));

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading, user } = useAuth();
  const from = ((location.state as { from?: Location })?.from?.pathname) || '/';
  const hasRedirectedRef = React.useRef(false);
  const isInitialMountRef = React.useRef(true);

  // Redirect after login if user was trying to access a protected route
  useEffect(() => {
    // Skip redirect on initial mount (refresh case) - let user stay on page
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    // Redirect if user is authenticated AND not loading AND not on initial mount
    // This handles both cases: already authenticated when page loads, and just logged in
    if (!loading && isAuthenticated && !hasRedirectedRef.current && user) {
      // Small delay to prevent race condition with state updates
      const redirectTimer = setTimeout(() => {
        if (!hasRedirectedRef.current && isAuthenticated) {
          hasRedirectedRef.current = true;
          // If user came from a specific page (like /admin), redirect there
          if (from && from !== '/login' && from !== '/signup') {
            navigate(from, { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        }
      }, 100);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [isAuthenticated, loading, from, navigate, user]);

  const handleClose = () => {
    // If user was redirected from a specific page (like /admin), redirect there after login
    if (from && from !== '/login' && from !== '/signup') {
      navigate(from, { replace: true });
    } else if (window.history.length > 1 && from !== '/') {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  };

  // Always show login page - don't redirect automatically
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
  const { isAuthenticated, loading, user } = useAuth();
  const from = ((location.state as { from?: Location })?.from?.pathname) || '/';
  const hasRedirectedRef = React.useRef(false);
  const isInitialMountRef = React.useRef(true);

  // Allow user to stay on signup page even if authenticated - don't force redirect on refresh
  // Only redirect if they explicitly navigate here while authenticated (not on initial mount/refresh)
  useEffect(() => {
    // Skip redirect on initial mount (refresh case) - let user stay on page
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    // Only redirect if user is authenticated AND not loading AND not on initial mount
    if (!loading && isAuthenticated && !hasRedirectedRef.current && user) {
      // Small delay to prevent race condition with state updates
      const redirectTimer = setTimeout(() => {
        if (!hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          navigate(from, { replace: true });
        }
      }, 100);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [isAuthenticated, loading, from, navigate, user]);

  const handleClose = () => {
    navigate(from, { replace: true });
  };

  // Always show signup page - don't redirect automatically
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
  const { isAuthenticated } = useAuth();
  const showHomeChrome = location.pathname === '/';
  // Only show navbar when on home page AND user is NOT authenticated
  const showNavbar = showHomeChrome && !isAuthenticated;

  // Add class to body when user is authenticated to remove navbar spacing
  useEffect(() => {
    if (isAuthenticated) {
      document.body.classList.add('user-authenticated');
    } else {
      document.body.classList.remove('user-authenticated');
    }
    return () => {
      document.body.classList.remove('user-authenticated');
    };
  }, [isAuthenticated]);

  return (
    <div className={`app ${isAuthenticated ? 'user-authenticated' : ''}`}>
      <Suspense fallback={<LoadingSpinner />}>
        <Sidebar />
      </Suspense>
      <div className={`app-content ${isAuthenticated ? 'user-authenticated' : ''}`}>
        {showNavbar && (
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
      {/* Public Routes - No Login Required */}
      <Route index element={<HomeFeed />} />
      <Route path="explore" element={<ExplorePage />} />
      <Route path="search" element={<SearchPageRoute />} />
      <Route path="live" element={<LivePage />} />
      <Route path="more" element={<MorePage />} />
      
      {/* Protected Routes - Login Required */}
      <Route path="following" element={<ProtectedRoute><FollowingPage /></ProtectedRoute>} />
      <Route path="watch-later" element={<ProtectedRoute><WatchLaterPage /></ProtectedRoute>} />
      <Route path="playlists" element={<ProtectedRoute><PlaylistsPage /></ProtectedRoute>} />
      <Route path="qa" element={<ProtectedRoute><VideoQAPage /></ProtectedRoute>} />
      <Route path="upload" element={<ProtectedRoute><UploadPageRoute /></ProtectedRoute>} />
      <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="user/:username" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="more/studio" element={<ProtectedRoute><TikTokStudioPage /></ProtectedRoute>} />
      <Route path="more/effects" element={<ProtectedRoute><EffectsLabPage /></ProtectedRoute>} />
      <Route path="more/shop" element={<ProtectedRoute><SellerDashboardPage /></ProtectedRoute>} />
      <Route path="more/growth-tools" element={<ProtectedRoute><GrowthToolsPage /></ProtectedRoute>} />
      <Route path="more/support" element={<ProtectedRoute><SupportCenterPage /></ProtectedRoute>} />
      <Route path="balance" element={<ProtectedRoute><BalancePage /></ProtectedRoute>} />
      <Route path="wallet" element={<ProtectedRoute><BalancePage /></ProtectedRoute>} />
    </Route>
    {/* Full Screen Routes - No Sidebar */}
    <Route path="/more/business-suite" element={
      <Suspense fallback={<LoadingSpinner />}>
        <ProtectedRoute><BusinessSuitePage /></ProtectedRoute>
      </Suspense>
    } />
    <Route path="/more/ad-manager" element={
      <ProtectedRoute><AdManagerPage /></ProtectedRoute>
    } />
    <Route path="/more/product-catalog" element={
      <ProtectedRoute><ProductCatalogPage /></ProtectedRoute>
    } />
    <Route path="/more/business-messaging" element={
      <ProtectedRoute><BusinessMessagingPage /></ProtectedRoute>
    } />
    <Route path="/more/activity-center" element={
      <ProtectedRoute><ActivityCenterPage /></ProtectedRoute>
    } />
    <Route path="/more/notification-settings" element={
      <ProtectedRoute><NotificationSettingsPage /></ProtectedRoute>
    } />
    <Route path="/more/privacy-settings" element={
      <ProtectedRoute><PrivacySettingsPage /></ProtectedRoute>
    } />
    <Route path="/admin/login" element={
      <Suspense fallback={<LoadingSpinner />}>
        <AdminLogin />
      </Suspense>
    } />
    <Route path="/admin" element={
      <Suspense fallback={<LoadingSpinner />}>
        <ProtectedRoute>
          <AdminPanel mode="page" onClose={() => window.history.back()} />
        </ProtectedRoute>
      </Suspense>
    } />
    <Route path="/admin/policy-compliance" element={
      <Suspense fallback={<LoadingSpinner />}>
        <ProtectedRoute>
          <PolicyCompliance onClose={() => window.history.back()} />
        </ProtectedRoute>
      </Suspense>
    } />
    <Route path="/admin/security-settings" element={
      <Suspense fallback={<LoadingSpinner />}>
        <ProtectedRoute>
          <SecuritySettings onClose={() => window.history.back()} />
        </ProtectedRoute>
      </Suspense>
    } />
    <Route path="/admin/notifications-control" element={
      <Suspense fallback={<LoadingSpinner />}>
        <ProtectedRoute>
          <NotificationsControl onClose={() => window.history.back()} />
        </ProtectedRoute>
      </Suspense>
    } />
    {/* Auth Routes */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
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
