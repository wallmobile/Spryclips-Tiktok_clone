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
import { ADMIN_ROUTES, ADMIN_BASE_PATH } from './config/adminRoutes';

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
const SpryclipsStudio = lazy(() => import('./components/creator/TikTokStudio'));
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
const MessageCenter = lazy(() => import('./components/social/MessageCenter'));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel'));
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
    song:
      (video.song as string) ||
      ((video as any)?.music?.name as string) ||
      (((video as any)?.metadata?.music?.name) as string) ||
      'Original Sound',
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
  const [searchTerm, setSearchTerm] = useState<string>(''); // Inline search term
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
        setLoading(true);
        
        // Clear cache and fetch fresh data
        const data = await getAllVideos();
        
        if (data && Array.isArray(data) && data.length > 0) {
          const normalizedVideos = data.map((video) => normalizeVideoData(video as Record<string, unknown>, 'api'));
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

  // Listen for search term changes from Navbar
  useEffect(() => {
    const handleSearchChange = (event: CustomEvent<string>) => {
      const term = String(event.detail || '').trim();
      setSearchTerm(term);
    };
    
    window.addEventListener('searchTermChange' as any, handleSearchChange);
    document.addEventListener('searchTermChange' as any, handleSearchChange);
    
    return () => {
      window.removeEventListener('searchTermChange' as any, handleSearchChange);
      document.removeEventListener('searchTermChange' as any, handleSearchChange);
    };
  }, []); // Keep empty deps - we want this to run once

  // Separate featured videos (top videos) - NOT filtered by search
  const featuredVideos: FeedItem[] = useMemo(() => {
    if (!videos || videos.length === 0) return [];
    // Get top 3-5 videos by engagement (likes + views)
    const sorted = [...videos].sort((a, b) => {
      const engagementA = (a.likes || 0) + (a.views || 0);
      const engagementB = (b.likes || 0) + (b.views || 0);
      return engagementB - engagementA;
    });
    const topVideos = sorted.slice(0, 5);

    return topVideos.map((video) => {
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

  // Regular feed items - filtered by search term (if any)
  // Featured videos are excluded from this list (unless search is active)
  const feedItems: FeedItem[] = useMemo(() => {
    console.log('🔵 feedItems useMemo RUNNING - searchTerm:', searchTerm, 'videos.length:', videos?.length || 0);
    
    if (!videos || videos.length === 0) {
      console.log('⚠️ No videos available - returning empty array');
      return [];
    }

    // Get featured video IDs (needed for both search and non-search cases)
    const featuredIds = new Set(featuredVideos.map(v => v.id));
    
    // If search is active, search ALL videos (including featured)
    // If no search, exclude featured videos from regular feed
    let filteredVideos = videos;
    
    if (!searchTerm.trim()) {
      // No search - exclude featured videos from regular feed
      console.log('Featured video IDs to exclude:', Array.from(featuredIds));
      filteredVideos = videos.filter(v => !featuredIds.has(String(v._id || v.id)));
      console.log('Videos after excluding featured:', filteredVideos.length);
    } else {
      // Search is active - search ALL videos (don't exclude featured)
      console.log('Search active - searching ALL videos (including featured)');
      filteredVideos = videos;
    }
    
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      console.log('=== SEARCH FILTERING START ===');
      console.log('Search term (lowercase):', searchLower);
      console.log('Total videos in database:', videos.length);
      console.log('Videos to filter:', filteredVideos.length);
      console.log('Featured video IDs:', Array.from(featuredIds));
      console.log('All videos data:', videos.map(v => ({
        id: v._id || v.id,
        description: v.description,
        username: v.user?.username || (v as { channel?: string }).channel
      })));
      
      let matchCount = 0;
      filteredVideos = filteredVideos.filter((video) => {
        // Get all searchable text fields
        const description = String(video.description || '').toLowerCase();
        const username = String(video.user?.username || (video as { channel?: string }).channel || '').toLowerCase();
        const hashtags = Array.isArray(video.hashtags) 
          ? video.hashtags.map(h => String(h).toLowerCase()).join(' ')
          : String(video.hashtags || '').toLowerCase();
        const song = String(video.song || '').toLowerCase();
        
        // Also check video title if it exists
        const title = String((video as { title?: string }).title || '').toLowerCase();
        
        // Combine all searchable text
        const allSearchableText = `${description} ${username} ${hashtags} ${song} ${title}`.toLowerCase();
        
        // Check if search term is in any field or in combined text
        const matches = description.includes(searchLower) || 
               username.includes(searchLower) || 
               hashtags.includes(searchLower) ||
               song.includes(searchLower) ||
               title.includes(searchLower) ||
               allSearchableText.includes(searchLower);
        
        if (matches) {
          matchCount++;
          console.log(`✓ Video ${matchCount} MATCHES:`, {
            id: video._id || video.id,
            description: video.description,
            username: username,
            hashtags: video.hashtags,
            song: video.song,
            title: (video as { title?: string }).title,
            searchTerm: searchLower,
            'description check': description.includes(searchLower),
            'username check': username.includes(searchLower),
            'hashtags check': hashtags.includes(searchLower),
            'song check': song.includes(searchLower),
            'combined text check': allSearchableText.includes(searchLower)
          });
        } else {
          // Log first few non-matches for debugging
          if (matchCount < 3) {
            console.log('✗ Video NO MATCH:', {
              id: video._id || video.id,
              description: video.description || '(empty)',
              username: username || '(empty)',
              hashtags: video.hashtags || '(empty)',
              song: song || '(empty)',
              searchTerm: searchLower,
              'description.includes?': description.includes(searchLower),
              'username.includes?': username.includes(searchLower),
              'hashtags.includes?': hashtags.includes(searchLower),
              'song.includes?': song.includes(searchLower),
              'allSearchableText': allSearchableText.substring(0, 100)
            });
          }
        }
        return matches;
      });
      console.log('=== SEARCH FILTERING END ===');
      console.log('Total videos after filter:', filteredVideos.length);
      console.log('Matched videos:', matchCount);
      if (filteredVideos.length === 0) {
        console.warn('⚠️ NO VIDEOS MATCHED THE SEARCH TERM!');
        console.warn('Search term was:', searchLower);
        console.warn('Try checking if video descriptions contain this text');
      }
    } else {
      console.log('No search term - showing all videos (excluding featured)');
    }

    return filteredVideos.map((video) => {
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
  }, [videos, searchTerm, featuredVideos]);

  // Combine featured and regular videos - featured always at top
  // Must be before early returns to follow React Hooks rules
  const allFeedItems: FeedItem[] = useMemo(() => {
    console.log('allFeedItems - searchTerm:', searchTerm, 'feedItems count:', feedItems.length, 'featuredVideos count:', featuredVideos.length);
    // If search is active, only show filtered results (no featured)
    if (searchTerm.trim()) {
      console.log('Search active - showing filtered results only:', feedItems.length);
      return feedItems;
    }
    // If no search, show featured first, then regular videos
    const combined = [...featuredVideos, ...feedItems];
    console.log('No search - showing combined:', combined.length);
    return combined;
  }, [featuredVideos, feedItems, searchTerm]);

  if (loading) {
    return <LoadingSpinner />;
  }

  // Story handling removed - stories only accessible from Profile page

  if (error && allFeedItems.length === 0) {
    return (
      <div className="feed-error">
        <p>{error}</p>
      </div>
    );
  }

  // Debug: Log final state
  console.log('HomeFeed render - searchTerm:', searchTerm, 'allFeedItems.length:', allFeedItems.length, 'videos.length:', videos.length);

  return (
    <>
      {/* StoriesBar removed - Stories only show around profile picture ring */}
      {/* Featured videos always at top when no search, filtered results when searching */}
      <ForYouFeed items={allFeedItems} />
    </>
  );
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
  // Redirect to home since More options are now in sidebar
  return <Navigate to="/" replace />;
};

const SpryclipsStudioPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fromCreatorTools = location.state?.from === 'creator-tools';
  
  return <SpryclipsStudio onClose={() => {
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

const MessageCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const targetUser = searchParams.get('user');
  
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MessageCenter 
        onClose={() => navigate(-1)} 
        initialUser={targetUser || undefined}
      />
    </Suspense>
  );
};

const GoogleAuthCallback = lazy(() => import('./components/auth/GoogleAuthCallback'));

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading, user } = useAuth();
  
  const queryParams = new URLSearchParams(location.search);
  const returnTo = queryParams.get('returnTo');
  const from = returnTo || ((location.state as { from?: Location })?.from?.pathname) || '/';
  
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
          
          // If returnTo is a full URL (OIDC interaction), use window.location.href
          if (returnTo && (returnTo.startsWith('http://') || returnTo.startsWith('https://'))) {
            window.location.href = returnTo;
            return;
          }

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
  }, [isAuthenticated, loading, from, navigate, user, returnTo]);

  const handleClose = () => {
    // If returnTo is a full URL (OIDC interaction), use window.location.href
    if (returnTo && (returnTo.startsWith('http://') || returnTo.startsWith('https://'))) {
      window.location.href = returnTo;
      return;
    }

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
  // Show navbar ONLY on home page (For You page) - hide on all other pages including profile
  // Only show on exact root path '/', hide everywhere else
  const showNavbar = location.pathname === '/' || location.pathname === '';
  
  // Debug: Log pathname to verify (remove in production)
  useEffect(() => {
    console.log('[Navbar Visibility] Pathname:', location.pathname, 'Show Navbar:', showNavbar);
  }, [location.pathname, showNavbar]);

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

  // Add class to body when on profile page to hide navbar
  useEffect(() => {
    const isProfilePage = location.pathname.startsWith('/profile') || location.pathname.startsWith('/user/');
    if (isProfilePage) {
      document.body.classList.add('profile-page-open');
    } else {
      document.body.classList.remove('profile-page-open');
    }
    return () => {
      document.body.classList.remove('profile-page-open');
    };
  }, [location.pathname]);

  // Pause all videos when navigating away from the page
  useEffect(() => {
    const pauseAllVideos = () => {
      const allVideos = document.querySelectorAll('video');
      allVideos.forEach((video) => {
        if (!video.paused) {
          video.pause();
          video.muted = true;
        }
      });
      
      const allAudios = document.querySelectorAll('audio');
      allAudios.forEach((audio) => {
        if (!audio.paused) {
          audio.pause();
          audio.muted = true;
        }
      });
    };

    // Pause videos when route changes
    pauseAllVideos();
  }, [location.pathname]);

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
      {/* Search route removed - search is now a modal */}
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
      <Route path="more/studio" element={<ProtectedRoute><SpryclipsStudioPage /></ProtectedRoute>} />
      <Route path="more/effects" element={<ProtectedRoute><EffectsLabPage /></ProtectedRoute>} />
      <Route path="more/shop" element={<ProtectedRoute><SellerDashboardPage /></ProtectedRoute>} />
      <Route path="more/growth-tools" element={<ProtectedRoute><GrowthToolsPage /></ProtectedRoute>} />
      <Route path="more/support" element={<ProtectedRoute><SupportCenterPage /></ProtectedRoute>} />
      <Route path="balance" element={<ProtectedRoute><BalancePage /></ProtectedRoute>} />
      <Route path="wallet" element={<ProtectedRoute><BalancePage /></ProtectedRoute>} />
      <Route path="messages" element={<ProtectedRoute><MessageCenterPage /></ProtectedRoute>} />
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
    <Route path={ADMIN_ROUTES.LOGIN} element={
      <Suspense fallback={<LoadingSpinner />}>
        <AdminLogin />
      </Suspense>
    } />
    <Route path={ADMIN_ROUTES.DASHBOARD} element={
      <Suspense fallback={<LoadingSpinner />}>
        <ProtectedRoute>
          <AdminPanel mode="page" onClose={() => window.history.back()} />
        </ProtectedRoute>
      </Suspense>
    } />
    <Route path={ADMIN_ROUTES.POLICY_COMPLIANCE} element={
      <Suspense fallback={<LoadingSpinner />}>
        <ProtectedRoute>
          <PolicyCompliance onClose={() => window.history.back()} />
        </ProtectedRoute>
      </Suspense>
    } />
    <Route path={ADMIN_ROUTES.SECURITY_SETTINGS} element={
      <Suspense fallback={<LoadingSpinner />}>
        <ProtectedRoute>
          <SecuritySettings onClose={() => window.history.back()} />
        </ProtectedRoute>
      </Suspense>
    } />
    <Route path={ADMIN_ROUTES.NOTIFICATIONS_CONTROL} element={
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
