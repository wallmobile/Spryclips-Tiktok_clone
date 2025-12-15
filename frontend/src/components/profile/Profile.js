/**
 * User Profile Component
 * 
 * Recent Changes:
 * - Enhanced profile viewing and editing functionality
 * - Improved image upload handling
 * - Added support for live streaming features
 * - Enhanced user interaction features (follow, like, etc.)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AccountSettings from '../settings/AccountSettings';
import { getMyVideos, getUserVideos, deleteVideo, promoteVideo, getVideoAnalytics, downloadVideo, retryVideoProcessing } from '../../api/videos';
import { updateProfile, pinVideo, followUser } from '../../api/users';
import { getUserStories } from '../../api/stories';
import StoryViewer from '../stories/StoryViewer';
import api, { API_URL } from '../../config/axios';
import './Profile.css';

const Profile = ({ onClose, username: viewUsername }) => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  // If viewUsername is provided, we're viewing another user's profile
  const isViewingOtherProfile = viewUsername && viewUsername !== user?.username;
  const [activeTab, setActiveTab] = useState('videos');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null); // Store actual file for upload
  const fileInputRef = useRef(null);
  const bannerFileInputRef = useRef(null);
  const justFollowedRef = useRef(false);
  const refreshTimeoutRef = useRef(null);
  const isRefreshingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [bannerImage, setBannerImage] = useState(user?.profile?.banner || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&h=400&fit=crop');
  const [bannerPreview, setBannerPreview] = useState(null);
  const [bannerFile, setBannerFile] = useState(null); // Store actual file for upload
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [hasAccountSettingsSubFeature, setHasAccountSettingsSubFeature] = useState(false);

  // Stats and videos from backend
  const [stats, setStats] = useState({
    followers: 0,
    following: 0,
    likes: 0
  });

  const [videos, setVideos] = useState([]);
  const [likedVideos, setLikedVideos] = useState([]);
  const [repostedVideos, setRepostedVideos] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('latest'); // 'latest', 'popular', 'oldest'
  const [activeVideoId, setActiveVideoId] = useState(null);

  // Check if viewing own profile or other user's profile
  const isMyProfile = !isViewingOtherProfile;

    const [bioText, setBioText] = useState(user?.profile?.bio || 'No bio yet');   
  const [usernameText, setUsernameText] = useState(user?.username || '');       
  const [websiteLink, setWebsiteLink] = useState(user?.profile?.website || '');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isPrivate, setIsPrivate] = useState(user?.privacy?.accountType === 'private');
  const [pinnedVideo, setPinnedVideo] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [loadingLiked, setLoadingLiked] = useState(false);
  const [loadingReposts, setLoadingReposts] = useState(false);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [userStories, setUserStories] = useState([]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  // const [loadingStories, setLoadingStories] = useState(false); // Not currently used
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowPending, setIsFollowPending] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [viewedUser, setViewedUser] = useState(null); // Store the user being viewed

  useEffect(() => {
    const sidebar = document.querySelector('.sidebar');
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    if (sidebar) {
      sidebar.classList.add('page-open');
    }
    document.body.classList.add('profile-page-open');
    document.documentElement.classList.add('profile-page-open');
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (sidebar) {
        sidebar.classList.remove('page-open');
      }
      document.body.classList.remove('profile-page-open');
      document.documentElement.classList.remove('profile-page-open');
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Fetch user stories (for own profile or other user's profile)
  // Use useMemo to stabilize userId to prevent infinite loops
  const userId = React.useMemo(() => user?._id || user?.id, [user?._id, user?.id]);
  
  // Sync banner image when user data changes (e.g., on page reload)
  useEffect(() => {
    if (!isViewingOtherProfile && user?.profile) {
      // Always sync banner from backend when user data loads
      if (user.profile.banner && user.profile.banner.trim() !== '') {
        // User has a saved banner from database, use it
        setBannerImage(user.profile.banner);
      } else {
        // No banner in backend, use default
        setBannerImage('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&h=400&fit=crop');
      }
    }
  }, [user?.profile, isViewingOtherProfile]);

  useEffect(() => {
    // Early return if no user and not viewing other profile
    if (!userId && !viewUsername) {
      return;
    }
    
    const fetchStories = async () => {
      // Try both _id and id formats
      let targetUserId = user?._id || user?.id;
      
      // If viewing another user's profile, fetch their user data first
      if (isViewingOtherProfile && viewUsername) {
        try {
          const response = await api.get(`/api/users/${viewUsername}`);
          const userData = response.data?.user || response.data;
          const isFollowingUser = response.data?.isFollowing || false;
          const isPendingUser = response.data?.isPending || false;
          
          if (userData?._id) {
            targetUserId = userData._id;
            setViewedUser(userData);
            
            // Set follow status from backend response
            setIsFollowing(isFollowingUser);
            setIsFollowPending(isPendingUser);
            
            // Also update stats from userData
            if (userData.profile) {
              setStats(prev => ({
                ...prev,
                followers: userData.profile.followers || 0,
                following: userData.profile.following || 0
              }));
            }
          } else if (response.data?._id) {
            targetUserId = response.data._id;
            setViewedUser(response.data);
            setIsFollowing(response.data?.isFollowing || false);
            setIsFollowPending(response.data?.isPending || false);
            
            // Update stats from response.data
            if (response.data.profile) {
              setStats(prev => ({
                ...prev,
                followers: response.data.profile.followers || 0,
                following: response.data.profile.following || 0
              }));
            }
          } else {
            console.warn('⚠️ Profile: User not found for username:', viewUsername);
            return; // User not found
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          return;
        }
      }
      
      if (!targetUserId) {
        console.warn('⚠️ Profile: No targetUserId, skipping story fetch');
        console.warn('⚠️ Profile: User object:', user);
        // Don't retry - let useEffect handle it when user becomes available
        setUserStories([]);
        return;
      }
      
      try {
        const response = await getUserStories(targetUserId);
        
        // Filter expired stories (24-hour expiration)
        const now = new Date();
        const storiesArray = response?.stories || response?.data?.stories || [];
        
        const validStories = storiesArray.filter(story => {
          if (!story) {
            console.warn('⚠️ Profile: Null story found in array');
            return false;
          }
          if (!story.expiresAt) {
            console.warn('⚠️ Profile: Story missing expiresAt:', story._id, story);
            return false;
          }
          const expiresAt = new Date(story.expiresAt);
          const isValid = expiresAt > now;
          return isValid;
        });
        
        // IMPORTANT: Only update state if stories actually changed to prevent unnecessary re-renders
        setUserStories(prevStories => {
          // Compare story IDs to avoid unnecessary updates
          const prevIds = (prevStories || []).map(s => s._id || s.id).filter(Boolean).sort().join(',');
          const newIds = validStories.map(s => s._id || s.id).filter(Boolean).sort().join(',');
          
          if (prevIds === newIds && (prevStories || []).length === validStories.length) {
            return prevStories; // Return previous state to prevent re-render
          }
          
          return validStories;
        });
      } catch (error) {
        console.error('❌ Error fetching user stories:', error);
        console.error('Error details:', error.response?.data || error.message);
        console.error('Error stack:', error.stack);
        setUserStories([]);
      } finally {
        // Loading state removed - not currently used
      }
    };

    // Initial fetch
    fetchStories();
    
    // Refresh stories every 5 minutes
    const interval = setInterval(fetchStories, 5 * 60 * 1000);
    
    // Listen for story creation events - optimized with debounce
    const handleStoryRefresh = () => {
      // Clear any pending refresh
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      
      // If already refreshing, skip
      if (isRefreshingRef.current) {
        console.log('🔄 Profile: Refresh already in progress, skipping...');
        return;
      }
      
      console.log('🔄 Profile: Stories refresh event received');
      
      // Debounce: wait 1000ms before refreshing (in case multiple events fire)
      refreshTimeoutRef.current = setTimeout(async () => {
        if (isRefreshingRef.current) return;
        
        isRefreshingRef.current = true;
        try {
          await fetchStories();
          console.log('✅ Profile: Stories refreshed successfully');
        } catch (error) {
          console.error('❌ Profile: Error refreshing stories:', error);
        } finally {
          isRefreshingRef.current = false;
        }
        refreshTimeoutRef.current = null;
      }, 1000); // Debounce to 1000ms to handle rapid events
    };
    
    window.addEventListener('stories:refresh', handleStoryRefresh);
    
    // Also expose fetchStories globally for manual testing
    if (typeof window !== 'undefined') {
      window.debugFetchProfileStories = fetchStories;
      window.debugProfileUserStories = () => {
        console.log('🔍 DEBUG: Current userStories state:', userStories);
        console.log('🔍 DEBUG: User ID:', user?._id);
        console.log('🔍 DEBUG: Will fetch stories...');
        fetchStories();
      };
    }
    
    return () => {
      console.log('🧹 Profile: Cleaning up useEffect, removing event listeners');
      clearInterval(interval);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      window.removeEventListener('stories:refresh', handleStoryRefresh);
    };
  }, [userId, isViewingOtherProfile, viewUsername]); // Use stabilized userId, removed user to prevent infinite loops

  // Check follow status when viewing other user's profile (refetch on refresh)
  useEffect(() => {
    const checkFollowStatus = async () => {
      // Don't check if we just did a follow action (let handleFollow handle it)
      if (justFollowedRef.current) {
        console.log('⏭️ Skipping checkFollowStatus - just followed/unfollowed');
        return;
      }

      if (!isViewingOtherProfile || !viewUsername) return;

      try {
        console.log('🔄 checkFollowStatus: Fetching profile...');
        // Refetch user profile to get latest follow status from backend
        const response = await api.get(`/api/users/${viewUsername}`);
        const userData = response.data?.user || response.data;
        const isFollowingUser = response.data?.isFollowing === true; // Strict check
        const isPendingUser = response.data?.isPending === true; // Strict check
        
        console.log('✅ checkFollowStatus response:', {
          isFollowingUser,
          isPendingUser,
          responseIsFollowing: response.data?.isFollowing,
          responseIsPending: response.data?.isPending
        });
        
        if (userData) {
          setViewedUser(userData);
          setIsFollowing(isFollowingUser);
          setIsFollowPending(isPendingUser);
          
          // Update stats
          if (userData.profile) {
            setStats(prev => ({
              ...prev,
              followers: userData.profile.followers || prev.followers,
              following: userData.profile.following || prev.following
            }));
          }
        }
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    };

    // Only check if we're viewing another user's profile
    if (isViewingOtherProfile && viewUsername) {
      checkFollowStatus();
    }
  }, [isViewingOtherProfile, viewUsername]); // Remove user dependency to avoid re-runs

  // Handle follow/unfollow
  const handleFollow = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Use viewUsername as fallback if viewedUser is temporarily null during refresh
    let userId = null;
    
    // First priority: Use viewedUser if available
    if (viewedUser) {
      userId = viewedUser._id || viewedUser.id;
      console.log('✅ Using viewedUser ID:', userId);
    } 
    // Second priority: Fetch user by viewUsername if viewedUser is null
    else if (viewUsername) {
      console.log('⚠️ viewedUser is null, fetching user data for:', viewUsername);
      try {
        const response = await api.get(`/api/users/${viewUsername}`);
        const userData = response.data?.user || response.data;
        if (userData?._id || userData?.id) {
          setViewedUser(userData);
          userId = userData._id || userData.id;
          console.log('✅ Fetched user ID from username:', userId);
        } else {
          console.error('❌ User data found but no ID:', userData);
        }
      } catch (error) {
        console.error('❌ Error fetching user data:', error);
        // Don't return yet - will try to use username as fallback
      }
    }
    
    // Third priority: If still no userId, try using viewUsername directly (if it's an ObjectId)
    if (!userId && viewUsername) {
      const objectIdPattern = /^[0-9a-fA-F]{24}$/;
      if (objectIdPattern.test(viewUsername)) {
        userId = viewUsername;
        console.log('✅ Using viewUsername as ObjectId:', userId);
      }
    }
    
    // Validate userId
    if (!userId) {
      console.error('❌ No user ID found:', { viewedUser, viewUsername, isViewingOtherProfile });
      // Better error message
      const errorMsg = viewUsername 
        ? `Unable to find user "${viewUsername}". Please check the username and try again.`
        : 'User information not available. Please refresh the page.';
      alert(errorMsg);
      return;
    }
    
    // Convert userId to string and validate ObjectId format
    userId = String(userId).trim();
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    if (!objectIdPattern.test(userId)) {
      console.error('❌ Invalid user ID format:', userId);
      // Try one more time to fetch by username
      if (viewUsername && !objectIdPattern.test(viewUsername)) {
        try {
          console.log('🔄 Final attempt: Fetching user by username:', viewUsername);
          const response = await api.get(`/api/users/${viewUsername}`);
          const userData = response.data?.user || response.data;
          if (userData?._id || userData?.id) {
            setViewedUser(userData);
            userId = String(userData._id || userData.id).trim();
            console.log('✅ Successfully fetched user ID:', userId);
          } else {
            throw new Error('User data not found in response');
          }
        } catch (error) {
          console.error('❌ Final fetch failed:', error);
          alert(`Unable to find user "${viewUsername}". Please check the username and try again.`);
          return;
        }
      } else {
        alert('Invalid user ID format. Please refresh the page.');
        return;
      }
    }
    
    console.log('✅ Final userId for follow/unfollow:', userId);

    if (followLoading) {
      console.log('⏳ Already processing follow/unfollow...');
      return;
    }

    const previousIsFollowing = isFollowing;

    try {
      setFollowLoading(true);
      
      console.log('🔘 Follow button clicked:', {
        userId: userId.toString(),
        userIdType: typeof userId,
        previousIsFollowing,
        viewedUsername: viewedUser.username,
        viewedUserId: viewedUser._id
      });
      
      // Call API - handle both follow and unfollow
      // Backend uses same POST endpoint for both follow and unfollow
      let response;
      console.log(previousIsFollowing ? '🔄 Unfollowing user:' : '🔄 Following user:', userId);
      // Use same POST endpoint - backend handles follow/unfollow based on current state
      response = await followUser(userId.toString());
      
      console.log('✅ API Response:', response);
      console.log('📊 Response data:', JSON.stringify(response, null, 2));
      
      // Update state based on response
      const newIsFollowing = response?.isFollowing === true;
      const newIsPending = response?.isPending === true;
      
      console.log('🔄 Updating state:', {
        newIsFollowing,
        newIsPending,
        previousIsFollowing,
        responseIsFollowing: response?.isFollowing,
        responseIsPending: response?.isPending
      });
      
      // Mark that we just did a follow action to prevent useEffect from overriding
      justFollowedRef.current = true;
      
      setIsFollowing(newIsFollowing);
      setIsFollowPending(newIsPending);
      
      // Update stats immediately - both followers (of viewed user) and following (of current user)
      if (viewedUser.profile) {
        setStats(prev => ({
          ...prev,
          followers: newIsFollowing 
            ? (prev.followers + 1) 
            : Math.max(0, prev.followers - 1)
        }));
      }
      
      // Update current user's own following count (if viewing own profile)
      if (!isViewingOtherProfile && user) {
        setStats(prev => ({
          ...prev,
          following: newIsFollowing 
            ? (prev.following + 1) 
            : Math.max(0, prev.following - 1)
        }));
      }
      
      // Update current user context immediately - this will trigger Following page refresh
      if (user && updateUser) {
        try {
          console.log('🔄 Fetching updated user context...');
          const verifyResponse = await api.get('/api/auth/verify');
          const updatedUser = verifyResponse.data?.user;
          if (updatedUser) {
            console.log('✅ Updating user context:', {
              oldFollowingCount: user.followedUsers?.length || 0,
              newFollowingCount: updatedUser.followedUsers?.length || 0,
              oldProfileFollowing: user.profile?.following || 0,
              newProfileFollowing: updatedUser.profile?.following || 0
            });
            updateUser(updatedUser);
            
            // Update banner from backend if viewing own profile
            if (!isViewingOtherProfile && updatedUser?.profile?.banner) {
              setBannerImage(updatedUser.profile.banner);
            }
            
            // Update own profile stats if viewing own profile
            if (!isViewingOtherProfile) {
              setStats(prev => ({
                ...prev,
                following: updatedUser.profile?.following || prev.following
              }));
            }
            console.log('✅ Updated user context with latest following list');
          }
        } catch (verifyError) {
          console.error('Error updating user context:', verifyError);
        }
      }
      
      // Dispatch event to refresh Following page
      console.log('📢 Dispatching follow:refresh event');
      window.dispatchEvent(new Event('follow:refresh'));
      
      // Dispatch multiple times with delays to ensure Following page updates
      setTimeout(() => window.dispatchEvent(new Event('follow:refresh')), 300);
      setTimeout(() => window.dispatchEvent(new Event('follow:refresh')), 600);
      setTimeout(() => window.dispatchEvent(new Event('follow:refresh')), 1000);
      
      // Refresh profile after a delay to ensure backend has saved
      setTimeout(async () => {
        try {
          console.log('🔄 Refreshing profile after follow/unfollow...');
          const profileResponse = await api.get(`/api/users/${viewUsername || userId}`);
          const userData = profileResponse.data?.user || profileResponse.data;
          const verifiedIsFollowing = profileResponse.data?.isFollowing === true;
          
          console.log('✅ Verified status:', verifiedIsFollowing);
          
          // Only update viewedUser if we have valid data - don't clear it on error
          if (userData && userData._id) {
            setViewedUser(userData);
            setIsFollowing(verifiedIsFollowing);
            
            // Update stats from backend (actual count)
            if (userData.profile) {
              setStats(prev => ({
                ...prev,
                followers: userData.profile.followers || prev.followers
              }));
            }
          } else {
            console.warn('⚠️ Profile refresh returned invalid data, keeping existing viewedUser');
            // Don't clear viewedUser - keep existing state
          }
          
          // Dispatch one more refresh event after backend confirms
          window.dispatchEvent(new Event('follow:refresh'));
        } catch (refreshError) {
          console.error('Error refreshing:', refreshError);
          // Don't clear viewedUser on error - keep existing state
          console.log('⚠️ Keeping existing viewedUser state after refresh error');
        } finally {
          // Re-enable useEffect checks after 3 seconds
          setTimeout(() => {
            justFollowedRef.current = false;
            console.log('✅ Re-enabled checkFollowStatus useEffect');
          }, 3000);
        }
      }, 800);
      
    } catch (error) {
      console.error('❌ Follow/Unfollow Error:', error);
      console.error('Error full details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      
      // Revert state to previous
      setIsFollowing(previousIsFollowing);
      setIsFollowPending(false);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to follow user. ';
      if (error.response?.status === 404) {
        errorMessage = 'User not found. Please refresh the page.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Please sign in to follow users.';
      } else if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'We could not find what you were looking for.';
      }
      
      // Show error but keep button visible
      alert(errorMessage);
    } finally {
      // Always re-enable button after error or success
      setFollowLoading(false);
      // Ensure button stays visible - don't hide it
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      // Store the file for upload
      setAvatarFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add banner handlers after handleAvatarChange
  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleBannerUpload(file);
    }
  };

  const handleBannerUpload = (file) => {
    if (file && file.type.startsWith('image/')) {
      // Store the file for upload
      setBannerFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please select a valid image file');
    }
  };

  const handleBannerDelete = () => {
    setBannerPreview(null);
    setBannerImage('');
    setBannerFile(null);
  };

  // Save profile function
  const saveProfile = async (profileData) => {
    setSavingProfile(true);
    try {
      // Check if avatar data is too large (base64 can be 33% larger than original)
      if (profileData.avatar && profileData.avatar.length > 3 * 1024 * 1024) { // ~3MB base64 string limit
        setToastMessage('Avatar image is too large. Please use an image smaller than 2MB.');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
        return;
      }
      
      // Check if banner data is too large
      if (profileData.banner && profileData.banner.length > 3 * 1024 * 1024) { // ~3MB base64 string limit
        setToastMessage('Banner image is too large. Please use an image smaller than 2MB.');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
        return;
      }
      
      // Check if backend server is reachable - skip check to allow offline save
      try {
        await api.get('/api/auth/verify', {
          timeout: 2000
        });
      } catch {
        // Silently continue - allow saving even if backend check fails
        console.log('Backend check failed, continuing with save...');
      }
      
      // Call updateProfile API with timeout
      console.log('💾 Saving profile data:', { 
        displayName: profileData.displayName, 
        bio: profileData.bio?.substring(0, 50),
        avatar: profileData.avatar ? `${(profileData.avatar.length / 1024).toFixed(2)}KB base64` : 'none',
        banner: profileData.banner ? `${(profileData.banner.length / 1024).toFixed(2)}KB base64` : 'none',
        bannerIncluded: 'banner' in profileData,
        website: profileData.website
      });
      
      // Store original state for rollback on error
      const originalBanner = bannerImage;
      const originalUser = user;
      
      // CRITICAL: Save to backend FIRST (synchronously) to ensure database persistence
      // This ensures banner is saved even if user closes project immediately
      const response = await updateProfile(profileData);
      console.log('Profile update response:', response);
      
      // Verify banner was saved in response
      if (response?.profile?.banner !== undefined) {
        console.log('✅ Banner saved to database:', {
          hasBanner: !!response.profile.banner,
          bannerLength: response.profile.banner ? response.profile.banner.length : 0
        });
      }
      
      // Update UI after successful database save
      if (profileData.banner !== undefined) {
        if (profileData.banner && profileData.banner.trim() !== '') {
          setBannerImage(profileData.banner);
        } else {
          // User deleted banner
          setBannerImage('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&h=400&fit=crop');
        }
      }
      
      // Update user context with backend response
      if (response?.profile) {
        const updatedUser = {
          ...user,
          profile: {
            ...user?.profile,
            ...response.profile
          }
        };
        updateUser(updatedUser);
        
        // Update banner from backend response if available
        if (response.profile.banner !== undefined) {
          if (response.profile.banner && response.profile.banner.trim() !== '') {
            setBannerImage(response.profile.banner);
          } else {
            setBannerImage('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&h=400&fit=crop');
          }
        }
      }
      
      // Clear files after successful save
      setAvatarFile(null);
      setBannerPreview(null);
      setBannerFile(null);
      
      // Close modal after successful save
      setShowEditModal(false);
      
      // Show success toast
      setToastMessage('Profile saved successfully!');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } catch (error) {
      // If backend error, save locally and show success
      if (error.message?.includes('Backend server not reachable') || error.message?.includes('Network Error')) {
        const savedProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
        localStorage.setItem('userProfile', JSON.stringify({ ...savedProfile, ...profileData }));
        updateUser({ ...user, username: profileData.username, profile: { ...user?.profile, ...profileData } });
        setToastMessage('Profile saved locally (Backend offline)');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        return;
      }
      console.error('Error saving profile:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code
      });
      
      let errorMessage = 'Failed to save profile. Please try again.';
      
      if (error.response?.status === 408 || error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Request timeout. Banner is too large. Please use a smaller image (max 2MB file size).';
      } else if (error.response?.status === 413) {
        errorMessage = 'Image is too large. Please use an image smaller than 2MB.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please login again.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || 'Invalid data. Please check your input.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.message?.includes('Network Error') || error.code === 'ECONNREFUSED') {
        errorMessage = 'Backend server is not running. Please start the server on port 5000.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show error toast
      setToastMessage(errorMessage);
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 5000); // Show error for 5 seconds
      
      throw error;
    } finally {
      setSavingProfile(false);
    }
  };

  const formatDurationLabel = useCallback((secondsLike) => {
    if (secondsLike === undefined || secondsLike === null) {
      return '0:00';
    }

    try {
      if (typeof secondsLike === 'string' && secondsLike.includes(':')) {
        const parts = secondsLike.split(':').map((part) => Number(part));
        if (parts && Array.isArray(parts) && parts.length > 0 && parts.every((part) => Number.isFinite(part))) {
          if (parts.length === 3 && parts[0] != null && parts[1] != null && parts[2] != null) {
            const [hours, minutes, seconds] = parts;
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;
            return formatDurationLabel(totalSeconds);
          }
          if (parts.length === 2 && parts[0] != null && parts[1] != null) {
            const [minutes, seconds] = parts;
            const totalSeconds = minutes * 60 + seconds;
            return formatDurationLabel(totalSeconds);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing duration:', error, 'secondsLike:', secondsLike);
      // Fallback to default formatting
    }

    const seconds = Number(secondsLike);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return '0:00';
    }
    const totalSeconds = Math.round(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const fetchVideos = useCallback(async () => {
    // If viewing another user's profile, we need user to be loaded first
    if (isViewingOtherProfile && !viewedUser) {
      console.log('⏳ Waiting for viewedUser to be loaded...');
      return;
    }
    
    if (!user && !isViewingOtherProfile) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      
      // If viewing another user's profile, fetch their videos
      let response;
      if (isViewingOtherProfile && viewedUser) {
        console.log('📹 Fetching videos for user:', viewedUser.username || viewUsername);
        const userId = viewedUser._id || viewedUser.id;
        if (userId) {
          try {
            const apiResponse = await getUserVideos(userId);
            console.log('📹 getUserVideos API response:', apiResponse);
            
            // Backend returns array directly or object with videos/data
            if (Array.isArray(apiResponse)) {
              response = { success: true, videos: apiResponse };
            } else if (apiResponse && Array.isArray(apiResponse.videos)) {
              response = { success: true, videos: apiResponse.videos };
            } else if (apiResponse && Array.isArray(apiResponse.data)) {
              response = { success: true, videos: apiResponse.data };
            } else if (apiResponse && apiResponse.success && Array.isArray(apiResponse.videos)) {
              response = apiResponse;
            } else {
              console.warn('⚠️ Unexpected response format from getUserVideos:', apiResponse);
              response = { success: true, videos: [] };
            }
            console.log('📹 Normalized response:', response);
          } catch (error) {
            console.error('❌ Error fetching user videos:', error);
            response = { success: true, videos: [] };
          }
        } else {
          console.warn('⚠️ No userId found for viewedUser');
          response = { success: true, videos: [] };
        }
      } else {
        // Fetch current user's videos
        response = await getMyVideos();
      }

      console.log('📹 Final response before processing:', response);
      
      if (response?.success && Array.isArray(response.videos)) {
        const formattedVideos = response.videos.map((video) => {
          const processedVideos = Array.isArray(video.processedVideos)
            ? video.processedVideos
                .map((variant) => {
                  const resolved = ensureAbsoluteUrl(variant.url || variant.path);
                  return resolved
                    ? {
                        quality: variant.quality || 'auto',
                        url: resolved
                      }
                    : null;
                })
                .filter(Boolean)
            : [];

          // Get video URL - prioritize processed videos, fallback to original URL
          let rawVideoUrl = '';
          if (processedVideos.length > 0 && processedVideos[0]?.url) {
            rawVideoUrl = processedVideos[0].url;
          } else if (video.url) {
            rawVideoUrl = video.url;
          } else if (video.videoUrl) {
            rawVideoUrl = video.videoUrl;
          }
          
          const resolvedVideoUrl = ensureAbsoluteUrl(rawVideoUrl);
          
          // If no valid URL and video is ready, skip this video
          // But allow processing videos to show even without URL
          const videoStatus = video.status || 'ready';
          if ((!resolvedVideoUrl || resolvedVideoUrl.trim() === '') && videoStatus === 'ready') {
            console.warn('Video has no valid URL and is ready, skipping:', video._id);
            return null;
          }
          
          // For processing videos without URL, use empty string
          const finalVideoUrl = resolvedVideoUrl || '';

          const possibleThumbnails = [
            video.thumbnail,
            video.previewImage,
            video.coverImage,
            video.metadata?.thumbnail,
            video.metadata?.thumbnailUrl,
            video.metadata?.coverImage,
            video.metadata?.previewImage,
            video.metadataSnapshot?.thumbnail,
            video.metadataSnapshot?.thumbnailUrl,
            video.metadataSnapshot?.coverImage,
            video.metadataSnapshot?.previewImage,
            processedVideos[0]?.url && processedVideos[0]?.url.replace(/\.mp4(\?.*)?$/i, '-thumbnail.jpg'),
            Array.isArray(video.processedVideos) && video.processedVideos[0]?.thumbnail
          ].filter((thumb) => typeof thumb === 'string' && thumb.trim().length > 0);

          let resolvedThumbnail = '';
          let hasImageThumbnail = false;
          if (possibleThumbnails.length > 0) {
            const selectedThumb = possibleThumbnails.find((thumb) => {
              const normalizedThumb = thumb.trim();
              return !/\.((mp4|mov|avi|mkv|webm)(\?.*)?|mp3|wav|aac)$/i.test(normalizedThumb);
            }) || (possibleThumbnails.length > 0 ? possibleThumbnails[0] : null);
            if (selectedThumb) {
              resolvedThumbnail = ensureAbsoluteUrl(selectedThumb);
            }
            hasImageThumbnail =
              typeof resolvedThumbnail === 'string' &&
              resolvedThumbnail.length > 0 &&
              !/\.((mp4|mov|avi|mkv|webm|mp3|wav|aac)(\?.*)?)$/i.test(resolvedThumbnail);
          }

          const rawDuration =
            video.duration ??
            video.metadata?.duration ??
            video.metadata?.video?.duration ??
            video.metadataSnapshot?.duration ??
            video.metadataSnapshot?.videoInfo?.duration ??
            video.metadataSnapshot?.durationSeconds ??
            video.metadataSnapshot?.metadata?.duration ??
            video.videoInfo?.duration ??
            video.metadata?.durationSeconds;
          const numericDuration = Number(rawDuration);

          return {
            id: video._id,
            thumbnail: hasImageThumbnail ? resolvedThumbnail : '',
            hasThumbnail: hasImageThumbnail,
            caption: video.description || '',
            views: video.views || 0,
            likes: video.likes || 0,
            comments: video.comments || 0,
            shares: video.shares || 0,
            createdAt: video.createdAt,
            uploadDate: formatDate(video.createdAt),
            visibility: video.isPrivate ? 'private' : 'public',
            url: finalVideoUrl, // This is the absolute URL (empty for processing videos)
            videoUrl: finalVideoUrl, // Also set videoUrl for compatibility
            processedVideos,
            status: video.status || 'ready',
            processingError: video.processingError || '',
            duration: formatDurationLabel(rawDuration),
            rawDurationSeconds: Number.isFinite(numericDuration) ? numericDuration : undefined,
            isPinned: Boolean(video.isPinned)
          };
        }).filter(video => video !== null); // Keep all videos (including processing ones without URL)

        // Deduplicate videos by ID to prevent duplicates
        const uniqueVideosMap = new Map();
        formattedVideos.forEach(video => {
          if (video && video.id) {
            // If video already exists, keep the one with 'ready' status or the newer one
            const existing = uniqueVideosMap.get(video.id);
            if (!existing) {
              uniqueVideosMap.set(video.id, video);
            } else {
              // Prefer ready status over processing
              if (video.status === 'ready' && existing.status !== 'ready') {
                uniqueVideosMap.set(video.id, video);
              } else if (video.status === existing.status) {
                // If same status, keep the one with newer createdAt
                const videoDate = new Date(video.createdAt || 0);
                const existingDate = new Date(existing.createdAt || 0);
                if (videoDate > existingDate) {
                  uniqueVideosMap.set(video.id, video);
                }
              }
            }
          }
        });
        const uniqueVideos = Array.from(uniqueVideosMap.values());

        setVideos(uniqueVideos);
        setPinnedVideo(uniqueVideos.find(video => video.isPinned) || null);

        const totalLikes = uniqueVideos.reduce((sum, v) => sum + v.likes, 0);
        setStats(prev => ({
          ...prev,
          likes: totalLikes
        }));
      } else {
        setVideos([]);
        setPinnedVideo(null);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      setVideos([]);
      setPinnedVideo(null);
    } finally {
      setLoading(false);
    }
  }, [user, formatDurationLabel, isViewingOtherProfile, viewedUser, viewUsername]);

  useEffect(() => {
    if (isViewingOtherProfile) {
      // If viewing another user, wait for viewedUser to be loaded
      if (viewedUser) {
        void fetchVideos();
      }
    } else if (user) {
      // If viewing own profile, fetch videos
      void fetchVideos();
    } else {
      // No user - don't leave in loading state
      setLoading(false);
    }
  }, [user, fetchVideos, isViewingOtherProfile, viewedUser]);

  useEffect(() => {
    const handleVideoUploaded = () => {
      void fetchVideos();
    };
    window.addEventListener('videoUploaded', handleVideoUploaded);
    return () => {
      window.removeEventListener('videoUploaded', handleVideoUploaded);
    };
  }, [fetchVideos]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setActiveVideoId(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      setActiveVideoId(null);
    };
  }, []);

  useEffect(() => {
    // Only poll if there are videos with processing status
    const processingVideos = videos.filter((video) => video.status && video.status !== 'ready' && video.status !== 'failed');
    if (processingVideos.length > 0) {
      const timer = setTimeout(() => {
        void fetchVideos();
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [videos, fetchVideos]);

  // Fetch liked videos
  useEffect(() => {
    const fetchLikedVideos = async () => {
      if (activeTab === 'liked' && user) {
        try {
          setLoadingLiked(true);
          // Mock liked videos data for now - replace with actual API call
          const mockLikedVideos = [
            {
              id: 'liked1',
              thumbnail: 'https://via.placeholder.com/300x400/E50914/FFFFFF?text=Liked+Video+1',
              caption: 'This is a liked video',
              views: 5000,
              likes: 250,
              comments: 50,
              shares: 30,
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
              uploadDate: '2 days ago',
              visibility: 'public',
              url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
            },
            {
              id: 'liked2',
              thumbnail: 'https://via.placeholder.com/300x400/C50812/FFFFFF?text=Liked+Video+2',
              caption: 'Another liked video',
              views: 8000,
              likes: 400,
              comments: 80,
              shares: 50,
              createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
              uploadDate: '5 days ago',
              visibility: 'public',
              url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
            }
          ];
          setLikedVideos(mockLikedVideos);
        } catch (error) {
          console.error('Error fetching liked videos:', error);
          setLikedVideos([]);
        } finally {
          setLoadingLiked(false);
        }
      }
    };

    fetchLikedVideos();
  }, [activeTab, user]);

  // Fetch reposted videos
  useEffect(() => {
    const fetchRepostedVideos = async () => {
      if (activeTab === 'reposts' && user) {
        try {
          setLoadingReposts(true);
          // Mock reposted videos data for now - replace with actual API call
          const mockRepostedVideos = [
            {
              id: 'repost1',
              thumbnail: 'https://via.placeholder.com/300x400/10B981/FFFFFF?text=Reposted+1',
              caption: 'This is a reposted video',
              views: 12000,
              likes: 600,
              comments: 120,
              shares: 80,
              createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
              uploadDate: '3 days ago',
              visibility: 'public',
              url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
              originalCreator: { username: '@originaluser', name: 'Original User' }
            },
            {
              id: 'repost2',
              thumbnail: 'https://via.placeholder.com/300x400/059669/FFFFFF?text=Reposted+2',
              caption: 'Another reposted video',
              views: 15000,
              likes: 750,
              comments: 150,
              shares: 100,
              createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
              uploadDate: '1 week ago',
              visibility: 'public',
              url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
              originalCreator: { username: '@anotheruser', name: 'Another User' }
            }
          ];
          setRepostedVideos(mockRepostedVideos);
        } catch (error) {
          console.error('Error fetching reposted videos:', error);
          setRepostedVideos([]);
        } finally {
          setLoadingReposts(false);
        }
      }
    };

    fetchRepostedVideos();
  }, [activeTab, user]);

  // Fetch drafts
  useEffect(() => {
    const fetchDrafts = async () => {
      if (activeTab === 'drafts' && user) {
        try {
          setLoadingDrafts(true);
          // Mock drafts data for now - replace with actual API call
          const mockDrafts = [
            {
              id: 'draft1',
              thumbnail: 'https://via.placeholder.com/300x400/222831/FFFFFF?text=Draft+1',
              caption: 'Draft video - work in progress',
              uploadDate: '1 week ago',
              visibility: 'private',
              url: null
            }
          ];
          setDrafts(mockDrafts);
        } catch (error) {
          console.error('Error fetching drafts:', error);
          setDrafts([]);
        } finally {
          setLoadingDrafts(false);
        }
      }
    };

    fetchDrafts();
  }, [activeTab, user]);

  // Fetch followers list
  useEffect(() => {
    const fetchFollowers = async () => {
      if (showFollowers && user) {
        try {
          // Mock followers data - replace with actual API call
          const mockFollowers = [
            { id: 'f1', username: 'follower1', avatar: 'https://ui-avatars.com/api/?name=follower1&background=E50914&color=fff', name: 'Follower One' },
            { id: 'f2', username: 'follower2', avatar: 'https://ui-avatars.com/api/?name=follower2&background=C50812&color=fff', name: 'Follower Two' },
            { id: 'f3', username: 'follower3', avatar: 'https://ui-avatars.com/api/?name=follower3&background=222831&color=fff', name: 'Follower Three' }
          ];
          setFollowersList(mockFollowers);
        } catch (error) {
          console.error('Error fetching followers:', error);
          setFollowersList([]);
        }
      }
    };

    fetchFollowers();
  }, [showFollowers, user]);

  // Fetch following list
  useEffect(() => {
    const fetchFollowing = async () => {
      if (showFollowing && user) {
        try {
          // Mock following data - replace with actual API call
          const mockFollowing = [
            { id: 'fo1', username: 'following1', avatar: 'https://ui-avatars.com/api/?name=following1&background=E50914&color=fff', name: 'Following One' },
            { id: 'fo2', username: 'following2', avatar: 'https://ui-avatars.com/api/?name=following2&background=C50812&color=fff', name: 'Following Two' }
          ];
          setFollowingList(mockFollowing);
        } catch (error) {
          console.error('Error fetching following:', error);
          setFollowingList([]);
        }
      }
    };

    fetchFollowing();
  }, [showFollowing, user]);

  // Helper function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // Helper function to sanitize error messages (hide technical details)
  const sanitizeErrorMessage = (errorMsg) => {
    if (!errorMsg || typeof errorMsg !== 'string') {
      return 'Processing failed. Please try again.';
    }
    
    // Hide technical Redis/queue errors
    if (errorMsg.includes('max retries per request') || 
        errorMsg.includes('maxRetriesPerRequest') ||
        errorMsg.includes('ECONNREFUSED') ||
        errorMsg.includes('Redis') ||
        errorMsg.includes('AggregateError')) {
      return 'Processing failed due to a temporary issue. Please try retrying.';
    }
    
    // Keep other errors but limit length
    return errorMsg.length > 100 ? errorMsg.substring(0, 100) + '...' : errorMsg;
  };

  // Handle video actions
  const handleVideoAction = async (videoId, action) => {
    try {
      switch(action) {
        case 'view': {
          const videoToView = videos.find(v => v.id === videoId);
          if (videoToView) {
            setSelectedVideo(videoToView);
          }
          break;
        }
        case 'retry':
          try {
            await retryVideoProcessing(videoId);
            setToastMessage('Video processing retry initiated. Please wait...');
            setShowToast(true);
            setTimeout(() => {
              setShowToast(false);
            }, 3000);
            // Refresh videos after a short delay
            setTimeout(() => {
              fetchVideos();
            }, 2000);
          } catch (error) {
            const errorMsg = error?.response?.data?.message || error?.message || 'Failed to retry processing';
            setToastMessage(errorMsg);
            setShowToast(true);
            setTimeout(() => {
              setShowToast(false);
            }, 5000);
          }
          break;
        case 'delete':
          try {
            await deleteVideo(videoId);
            const updatedVideos = videos.filter(v => v.id !== videoId);
            setVideos(updatedVideos);
            if (pinnedVideo?.id === videoId) {
              setPinnedVideo(updatedVideos.find(v => v.isPinned) || null);
            }
            // Show success toast instead of alert
            setToastMessage('Video deleted successfully!');
            setShowToast(true);
            setTimeout(() => {
              setShowToast(false);
            }, 3000);
            // Refresh videos list
            setTimeout(() => {
              fetchVideos();
            }, 500);
          } catch (error) {
            console.error('Error deleting video:', error);
              // Show user-friendly error message
              let errorMessage = 'Failed to delete video. Please try again.';
              
              if (error?.response?.data?.message) {
                errorMessage = error.response.data.message;
              } else if (error?.response?.status === 404) {
                errorMessage = 'Video not found. It may have already been deleted.';
              } else if (error?.response?.status === 401) {
                errorMessage = 'Please login again to delete videos.';
              } else if (error?.response?.status === 403) {
                errorMessage = 'You do not have permission to delete this video.';
              } else if (error?.message && typeof error.message === 'string') {
                // Remove localhost URLs and technical details from error messages
                errorMessage = error.message
                  .replace(/http:\/\/localhost:\d+/gi, 'server')
                  .replace(/https?:\/\/[^\s]+/gi, 'server')
                  .replace(/Network Error/gi, 'Connection error. Please check if backend server is running.')
                  .replace(/timeout/gi, 'Request timeout. Please try again.')
                  .replace(/ECONNREFUSED/gi, 'Cannot connect to server. Please check if backend is running.');
              }
              
              // Ensure error message doesn't contain localhost
              if (errorMessage.toLowerCase().includes('localhost')) {
                errorMessage = 'Connection error. Please check if backend server is running.';
              }
              
              setToastMessage(errorMessage);
              setShowToast(true);
              setTimeout(() => {
                setShowToast(false);
              }, 5000);
          }
          break;
        case 'promote':
          await promoteVideo(videoId);
          alert('Video promoted successfully!');
          break;
        case 'analytics': {
          const analytics = await getVideoAnalytics(videoId);
          const message =
            typeof analytics?.message === 'string'
              ? analytics.message
              : 'Analytics refreshed for your video.';
          setToastMessage(message);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
          break;
        }
        case 'pin': {
          await pinVideo(videoId);
          // Refresh videos to update pinned status
          const response = await getMyVideos();
          if (response.success && response.videos) {
            const formattedVideos = response.videos.map(video => ({
              id: video._id,
              thumbnail: video.thumbnail || video.url,
              caption: video.description,
              views: video.views || 0,
              likes: video.likes || 0,
              comments: video.comments || 0,
              shares: video.shares || 0,
              uploadDate: formatDate(video.createdAt),
              visibility: video.isPrivate ? 'private' : 'public',
              url: video.url,
              isPinned: video.isPinned
            }));
            setVideos(formattedVideos);
            setPinnedVideo(formattedVideos.find(video => video.isPinned) || null);
          }
          break;
        }
        case 'download': {
          try {
            await downloadVideo(videoId);
            alert('Video download started!');
          } catch {
            alert('Failed to download video');
          }
          break;
        }
        default:
          console.log(`Action ${action} clicked for video ${videoId}`);
      }
    } catch (error) {
      console.error('Error performing action:', error);
      alert('Error performing action. Please try again.');
    }
  };

  // Filter videos based on search
    // Sort videos based on sortOption
  const sortVideos = (videoList) => {
    const sorted = [...videoList];
    switch (sortOption) {
      case 'popular':
        return sorted.sort((a, b) => {
          // Sort by total engagement (likes + comments + shares + views)
          const engagementA = (a.likes || 0) + (a.comments || 0) + (a.shares || 0) + (a.views || 0);
          const engagementB = (b.likes || 0) + (b.comments || 0) + (b.shares || 0) + (b.views || 0);
          return engagementB - engagementA;
        });
      case 'oldest':
        // Assuming uploadDate is in a sortable format or timestamp
        return sorted.sort((a, b) => {
          // Sort by date ascending (oldest first)
          const dateA = new Date(a.createdAt || a.uploadDate || 0);
          const dateB = new Date(b.createdAt || b.uploadDate || 0);
          return dateA - dateB;
        });
      case 'latest':
      default:
        // Sort by date descending (newest first)
        return sorted.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.uploadDate || 0);
          const dateB = new Date(b.createdAt || b.uploadDate || 0);
          return dateB - dateA;
        });
    }
  };

  const safeQuery = searchQuery.toLowerCase();
  const filteredVideos = sortVideos(
    videos.filter(video =>
      (video.caption || '').toLowerCase().includes(safeQuery)
    )
  );

  const filteredLikedVideos = sortVideos(
    likedVideos.filter(video =>
      (video.caption || '').toLowerCase().includes(safeQuery)
    )
  );

  const filteredRepostedVideos = sortVideos(
    repostedVideos.filter(video =>
      (video.caption || '').toLowerCase().includes(safeQuery)
    )
  );

  const formatStat = (value) => Number(value ?? 0).toLocaleString();

  const ensureAbsoluteUrl = (input) => {
    try {
      if (!input) {
        return '';
      }
      if (typeof input !== 'string') {
        return String(input || '');
      }
      const trimmed = input.trim();
      if (!trimmed) {
        return '';
      }
      if (/^(https?:)?\/\//i.test(trimmed)) {
        if (/^\/\//.test(trimmed)) {
          const protocol = typeof window !== 'undefined' && window.location?.protocol ? window.location.protocol : 'http:';
          return `${protocol}${trimmed}`;
        }
        return trimmed;
      }
      if (/^(data:|blob:)/i.test(trimmed)) {
        return trimmed;
      }
      const base =
        API_URL ||
        (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '');
      if (!base || typeof base !== 'string') {
        return trimmed;
      }
      const normalizedBase = base.replace(/\/+$/, '');
      const normalizedPath = trimmed.replace(/^\/+/, '');
      return `${normalizedBase}/${normalizedPath}`;
    } catch (error) {
      console.error('Error in ensureAbsoluteUrl:', error, 'input:', input);
      return typeof input === 'string' ? input : '';
    }
  };

  return (
    <div className={`profile-overlay ${(hasAccountSettingsSubFeature || showMobileSettings) ? 'hide-profile-buttons' : ''}`}>
      {/* Toast Notification */}
      {showToast && (
        <div className="profile-toast">
          <div className="toast-content">
            <i className="fa-solid fa-check-circle"></i>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
      {/* Close Button REMOVED as per user request */}

      <div className="profile-modal settings-open">
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="profile-mobile-menu-overlay"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}
        
        {/* Account Settings Sidebar - Show ONLY on own profile */}
        {isMyProfile && (
          <AccountSettings 
            inline={!showMobileSettings}
            onClose={() => {
              if (showMobileSettings) {
                setShowMobileSettings(false);
              } else {
                onClose();
              }
            }}
            onOpenEditProfile={() => {
              setShowEditModal(true);
              setShowMobileSettings(false);
            }}
            onSubFeatureToggle={(hasSubFeature) => {
              setHasAccountSettingsSubFeature(hasSubFeature);
            }}
            avatarPreview={avatarPreview}
            displayNamePreview={usernameText || user?.username}
          />
        )}

        {/* Profile Content Wrapper */}
        <div className="profile-content-wrapper">
          {/* TikTok-Style Profile Header */}
          <div className="profile-header-new">
          {/* Buttons inside header so they scroll with content */}
          {/* Account Settings Button (Gear Icon) - Show ONLY on own profile, hide when viewing other user's profile */}
          {isMyProfile && !showEditModal && !showFollowers && !showFollowing && !selectedVideo && !hasAccountSettingsSubFeature && (
            <button 
              className="profile-account-settings-btn" 
              onClick={() => setShowMobileSettings(!showMobileSettings)}
              aria-label="Account Settings"
            >
              <i className="fa-solid fa-gear"></i>
            </button>
          )}
          
          <div className="cover-image-header">
            <div 
              className="cover-image"
              style={{
                backgroundImage: bannerPreview ? `url(${bannerPreview})` : (isViewingOtherProfile ? (viewedUser?.profile?.banner || 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)') : (bannerImage ? `url(${bannerImage})` : 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)')),
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
            </div>
            {isMyProfile && (
              <input
                ref={bannerFileInputRef}
                id="profile-banner-upload"
                name="banner"
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
                style={{ display: 'none' }}
              />
            )}
          </div>
          <div className="profile-info-section">
            <div className="avatar-container">
              {/* Story ring indicator - TikTok style colored ring around profile picture */}
              {(() => {
                const hasStories = userStories && Array.isArray(userStories) && userStories.length > 0;
                
                // Removed excessive debug logging - only log when stories change, not on every render
                
                return hasStories ? (
                <div 
                  className="profile-story-ring-wrapper"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (userStories.length > 0) {
                      setShowStoryViewer(true);
                    }
                  }}
                  title="View Story"
                >
                  <div className="profile-story-ring">
                    <img
                      src={avatarPreview || (isViewingOtherProfile ? viewedUser?.profile?.avatar : user?.profile?.avatar) || `https://ui-avatars.com/api/?name=${isViewingOtherProfile ? (viewedUser?.username || viewUsername) : user?.username}&background=E50914&color=fff`}
                      alt={isViewingOtherProfile ? (viewedUser?.username || viewUsername) : user?.username}
                      className="profile-avatar-new profile-avatar-with-ring"
                    />
                  </div>
                  {isMyProfile && (
                    <div className="camera-icon-overlay visible story-ring-camera-overlay" onClick={(e) => { e.stopPropagation(); handleAvatarClick(); }}>
                      <i className="fa-solid fa-camera"></i>
                    </div>
                  )}
                </div>
              ) : (
                <div className="avatar-wrapper-no-story" onClick={isMyProfile ? handleAvatarClick : undefined}>
                  <img
                    src={avatarPreview || (isViewingOtherProfile ? viewedUser?.profile?.avatar : user?.profile?.avatar) || `https://ui-avatars.com/api/?name=${isViewingOtherProfile ? (viewedUser?.username || viewUsername) : user?.username}&background=E50914&color=fff`}
                    alt={isViewingOtherProfile ? (viewedUser?.username || viewUsername) : user?.username}
                    className="profile-avatar-new"
                  />
                  {isMyProfile && (
                    <div className="camera-icon-overlay visible">
                      <i className="fa-solid fa-camera"></i>
                    </div>
                  )}
                </div>
              );
              })()}
            </div>
            {isMyProfile && (
              <input
                ref={fileInputRef}
                id="profile-avatar-upload"
                name="avatar"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            )}
            <div className="profile-header-right">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', flexWrap: 'wrap', width: '100%' }}>
                <h2 style={{ flex: '1', minWidth: 0 }}>{isViewingOtherProfile ? (viewedUser?.profile?.displayName || viewedUser?.username || viewUsername) : (user?.profile?.displayName || usernameText)}</h2>
                {(isViewingOtherProfile ? viewedUser?.profile?.isVerified : user?.profile?.isVerified) && (
                  <i className="fa-solid fa-check-circle" style={{ color: '#2563EB', fontSize: '20px' }}></i>
                )}
                {/* Follow and Message Buttons - Show only when viewing other user's profile */}
                {/* Always show buttons when viewing other profile - don't hide during refresh or after follow */}
                {/* Show buttons if viewing other profile OR if we have viewUsername (even if viewedUser is temporarily null) */}
                {(isViewingOtherProfile || viewUsername) && (
                  <div style={{ 
                    marginLeft: 'auto', 
                    display: 'flex', 
                    gap: '12px', 
                    alignItems: 'center',
                    flexShrink: 0,
                    visibility: 'visible', // Force visible
                    opacity: 1 // Force visible
                  }}>
                    {/* Message Button - Always visible when viewing other profile */}
                    <button
                      className="profile-message-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Navigate to messages with this user
                        const targetUsername = viewedUser?.username || viewUsername;
                        if (targetUsername) {
                          navigate(`/messages?user=${encodeURIComponent(targetUsername)}`);
                        } else {
                          alert('Unable to open messages');
                        }
                      }}
                      type="button"
                      style={{
                        padding: '8px 20px',
                        borderRadius: '20px',
                        border: 'none',
                        background: '#FF0050',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        minWidth: '100px',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(255, 0, 80, 0.3)',
                        zIndex: 10
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#FE2C55';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 0, 80, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#FF0050';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 0, 80, 0.3)';
                      }}
                      title="Send message"
                    >
                      <i className="fa-solid fa-envelope" style={{ color: '#FFFFFF' }}></i>
                      <span>Message</span>
                    </button>
                    
                    {/* Follow Button - Always show when viewing other profile, even if viewedUser is temporarily null */}
                    {/* Button should ALWAYS be visible - never hide it */}
                    <button
                      className={`profile-follow-btn ${isFollowing ? 'profile-follow-btn--following' : 'profile-follow-btn--follow'}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔘 Follow button onClick triggered');
                        handleFollow(e);
                      }}
                      disabled={followLoading}
                      type="button"
                      style={{
                        padding: '8px 20px',
                        borderRadius: '20px',
                        border: isFollowing ? '2px solid #FF0050' : 'none', // Red border when following - more visible
                        background: isFollowing 
                          ? '#FF0050' // SOLID RED when following - ALWAYS visible
                          : 'linear-gradient(135deg, #FF0050 0%, #FE2C55 50%, #25F4EE 100%)',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: followLoading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        display: 'flex', // ALWAYS visible
                        visibility: 'visible', // ALWAYS visible
                        opacity: followLoading ? 0.7 : 1, // Slightly transparent when loading, but still visible
                        alignItems: 'center',
                        gap: '6px',
                        minWidth: '100px',
                        justifyContent: 'center',
                        pointerEvents: followLoading ? 'none' : 'auto', // Disable clicks when loading, but keep visible
                        boxShadow: isFollowing 
                          ? '0 2px 8px rgba(255, 0, 80, 0.4)' // Red shadow when following
                          : '0 2px 8px rgba(255, 0, 80, 0.3)' // Shadow for visibility
                      }}
                      onMouseEnter={(e) => {
                        if (isFollowing && !followLoading) {
                          e.currentTarget.style.background = '#FE2C55'; // Darker red on hover
                          e.currentTarget.style.border = '2px solid #FE2C55';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isFollowing && !followLoading) {
                          e.currentTarget.style.background = '#FF0050'; // Keep solid red
                          e.currentTarget.style.border = '2px solid #FF0050';
                        }
                      }}
                    >
                      {followLoading ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin"></i>
                          <span>...</span>
                        </>
                      ) : isFollowPending ? (
                        <>
                          <i className="fa-solid fa-clock"></i>
                          <span>Pending</span>
                        </>
                      ) : isFollowing ? (
                        <>
                          <i className="fa-solid fa-check"></i>
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-plus"></i>
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
              <div>
                <p className="username-text">@{isViewingOtherProfile ? (viewedUser?.username || viewUsername || '') : usernameText}</p>
                <p className="bio-text">{isViewingOtherProfile ? (viewedUser?.profile?.bio || 'No bio yet') : bioText}</p>
              </div>
              {(isViewingOtherProfile ? viewedUser?.profile?.website : websiteLink) && (
                <a 
                  href={(isViewingOtherProfile ? viewedUser?.profile?.website : websiteLink).startsWith('http') ? (isViewingOtherProfile ? viewedUser?.profile?.website : websiteLink) : `https://${isViewingOtherProfile ? viewedUser?.profile?.website : websiteLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="website-link"
                  style={{ 
                    color: '#2563EB', 
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    marginTop: '10px',
                    fontSize: '14px'
                  }}
                >
                  <i className="fa-solid fa-link"></i>
                  {(() => {
                    const link = isViewingOtherProfile ? viewedUser?.profile?.website : websiteLink;
                    return link && typeof link === 'string' ? link.replace(/^https?:\/\//, '') : link;
                  })()}
                </a>
              )}
              

              <div className="stats-section">
                <div className="stat-item" style={{ cursor: 'pointer' }} onClick={() => setShowFollowers(true)}>
                  <span className="stat-number">{stats.followers}</span>
                  <span className="stat-label">Followers</span>
                </div>
                <div className="stat-item" style={{ cursor: 'pointer' }} onClick={() => setShowFollowing(true)}>
                  <span className="stat-number">{stats.following}</span>
                  <span className="stat-label">Following</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{stats.likes}</span>
                  <span className="stat-label">Likes</span>
                </div>
              </div>
            </div>
          </div>
        </div>

                  {/* Sticky Tabs */}
          <div className="profile-tabs-sticky">
            <div className="profile-tabs-left">
              <button
                className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`}
                onClick={() => setActiveTab('videos')}
              >
                <i className="fa-solid fa-video"></i> Videos
              </button>
              <button
                className={`tab-btn ${activeTab === 'reposts' ? 'active' : ''}`}
                onClick={() => setActiveTab('reposts')}
              >
                <i className="fa-solid fa-share-nodes"></i> Reposts
              </button>
                              <button
                  className={`tab-btn liked-tab-btn ${activeTab === 'liked' ? 'active' : ''}`}
                  onClick={() => setActiveTab('liked')}
                >
                  <i className="fa-solid fa-heart"></i> Liked
                </button>
            </div>
            {/* Sort Options */}
            <div className="profile-sort-controls">
              <button
                className={`sort-btn ${sortOption === 'latest' ? 'active' : ''}`}
                onClick={() => setSortOption('latest')}
              >
                Latest
              </button>
              <button
                className={`sort-btn ${sortOption === 'popular' ? 'active' : ''}`}
                onClick={() => setSortOption('popular')}
              >
                Popular
              </button>
              <button
                className={`sort-btn ${sortOption === 'oldest' ? 'active' : ''}`}
                onClick={() => setSortOption('oldest')}
              >
                Oldest
              </button>
            </div>
          </div>

        {/* Pinned Video Section */}
        {activeTab === 'videos' && pinnedVideo && (
          <div className="pinned-video-section">
            <h3>
              <i className="fa-solid fa-thumbtack"></i>
              Pinned Video
            </h3>
            <div
              className={`pinned-video-card ${pinnedVideo.status !== 'ready' ? 'is-disabled' : ''}`}
              onClick={() => {
                if (pinnedVideo.status !== 'ready') return;
                handleVideoAction(pinnedVideo.id, 'view');
              }}
            >
              {pinnedVideo.status && pinnedVideo.status !== 'ready' && (
                <div className={`video-status-badge ${pinnedVideo.status}`}>
                  {pinnedVideo.status === 'failed' ? (
                    <>
                      <i className="fa-solid fa-triangle-exclamation"></i>
                      <span>Processing failed</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>Processing...</span>
                    </>
                  )}
                </div>
              )}
              {pinnedVideo.hasThumbnail ? (
                <img 
                  src={pinnedVideo.thumbnail} 
                  alt="Pinned video"
                />
              ) : (
                <div className="thumbnail-fallback pinned">
                  <i className="fa-solid fa-photo-film"></i>
                  <span>No thumbnail</span>
                </div>
              )}
              <div>
                <p>{pinnedVideo.caption || 'Pinned Video'}</p>
                <div>
                  <span><i className="fa-solid fa-eye"></i> {formatStat(pinnedVideo.views)} views</span>
                  <span><i className="fa-solid fa-heart"></i> {formatStat(pinnedVideo.likes)} likes</span>
                </div>
                {pinnedVideo.status && pinnedVideo.status !== 'ready' && (
                  <span className={`processing-state ${pinnedVideo.status}`}>
                    {pinnedVideo.status === 'failed'
                      ? sanitizeErrorMessage(pinnedVideo.processingError)
                      : 'Processing...'}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Uploaded Videos Dashboard - TikTok Style */}
        {activeTab === 'videos' && (
          <div className="uploaded-videos-dashboard">
            {/* Top Bar with Search */}
            <div className="dashboard-top-bar">
              <h2 className="dashboard-title">Uploaded Videos</h2>
              <div className="search-filter-bar">
                <div className="search-input-wrapper">
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <input
                    id="profile-video-search"
                    name="videoSearch"
                    type="text"
                    placeholder="Search videos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="dashboard-search-input"
                  />
                </div>
                <button className="filter-btn">
                  <i className="fa-solid fa-filter"></i>
                  Filter
                </button>
              </div>
            </div>

                  {/* Videos Grid */}
                  {loading ? (
                    <div className="empty-state">
                      <div className="empty-icon">
                        <i className="fa-solid fa-spinner fa-spin"></i>
                      </div>
                      <h3>Loading videos...</h3>
                    </div>
                  ) : filteredVideos.length > 0 ? (
                    <div className="uploaded-videos-grid">
                      {filteredVideos.map((video) => (
                        <div key={video.id} className="uploaded-video-card">
                          {video.status && video.status !== 'ready' && (
                            <div className={`video-status-badge ${video.status}`}>
                              {video.status === 'failed' ? (
                                <>
                                  <i className="fa-solid fa-triangle-exclamation"></i>
                                  <span>Processing failed</span>
                                </>
                              ) : (
                                <>
                                  <i className="fa-solid fa-spinner fa-spin"></i>
                                  <span>Processing...</span>
                                </>
                              )}
                            </div>
                          )}
                          <div
                            className={`video-thumbnail-wrapper ${activeVideoId === video.id ? 'is-playing' : ''} ${video.status !== 'ready' ? 'is-disabled' : ''}`}
                            onClick={() => {
                              if (video.status !== 'ready') return;
                              // Open video in full modal with all details
                              setSelectedVideo(video);
                            }}
                          >
                      {/* Removed inline video player - videos now open in full modal */}
                      {video.hasThumbnail ? (
                        <img 
                          src={video.thumbnail} 
                          alt={video.caption} 
                          className="uploaded-video-thumbnail"
                        />
                      ) : (
                        <div className="thumbnail-fallback">
                          <i className="fa-solid fa-photo-film"></i>
                          <span>No thumbnail</span>
                        </div>
                      )}
                      {video.status === 'ready' ? (
                        <>
                          <div className="video-duration-badge">
                            {video.duration}
                          </div>
                          <button
                            type="button"
                            className="thumbnail-play-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (video.status === 'ready') {
                                // Open video in full modal with all details
                                setSelectedVideo(video);
                              }
                            }}
                            disabled={video.status !== 'ready'}
                          >
                            <i className="fa-solid fa-circle-play"></i>
                          </button>
                        </>
                      ) : (
                        <div className="processing-overlay">
                          {video.status === 'failed' ? (
                            <>
                              <i className="fa-solid fa-triangle-exclamation"></i>
                              <span>Processing failed</span>
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-spinner fa-spin"></i>
                              <span>Processing...</span>
                            </>
                          )}
                        </div>
                      )}
                      <div className="visibility-tag">
                        {video.visibility === 'public' && (
                          <span className="visibility-public">
                            <i className="fa-solid fa-globe"></i> Public
                          </span>
                        )}
                        {video.visibility === 'friends' && (
                          <span className="visibility-friends">
                            <i className="fa-solid fa-users"></i> Friends
                          </span>
                        )}
                        {video.visibility === 'private' && (
                          <span className="visibility-private">
                            <i className="fa-solid fa-lock"></i> Private
                          </span>
                        )}
                      </div>
                          </div>
                          
                          <div className="video-card-content">
                            {/* Title + Delete Button Row - SAME HORIZONTAL LINE */}
                            <div className="video-card-title-delete-row">
                              {/* Title - LEFT side */}
                              <h3 className="video-card-caption">{video.caption}</h3>
                              
                              {/* Delete Button - RIGHT side (same line as title) - NO ICON, JUST TEXT, SMALLER HEIGHT */}
                              {isMyProfile && (
                                <button 
                                  className="video-card-delete-button"
                                  onClick={() => handleVideoAction(video.id, 'delete')}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0',
                                    marginTop: '0',
                                    padding: '0.25rem 0.75rem', /* REDUCED PADDING - Smaller height */
                                    borderRadius: '0.375rem', /* Smaller radius */
                                    backgroundColor: '#FF0050',
                                    background: '#FF0050',
                                    backgroundImage: 'none',
                                    color: '#ffffff',
                                    border: 'none',
                                    marginLeft: 'auto',
                                    minHeight: '1.25rem', /* Reduced minimum height */
                                    lineHeight: '1.2' /* Tighter line height */
                                  }}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                            
                            {/* Stats/Icons Row - Below Title/Delete Row */}
                            <div className="video-card-stats">
                              <span className="stat">
                                <i className="fa-solid fa-eye"></i>
                                {formatStat(video.views)}
                              </span>
                              <span className="stat">
                                <i className="fa-solid fa-heart"></i>
                                {formatStat(video.likes)}
                              </span>
                              <span className="stat">
                                <i className="fa-solid fa-comment"></i>
                                {video.comments}
                              </span>
                            </div>
                            
                            {/* Time Text - Below Stats */}
                            <div className="video-card-meta">
                              <span className="upload-date">{video.uploadDate}</span>
                              {video.status && video.status !== 'ready' && (
                                <div className={`processing-state-wrapper ${video.status}`}>
                                  <span className={`processing-state ${video.status}`}>
                                    {video.status === 'failed' ? (
                                      <>
                                        <i className="fa-solid fa-triangle-exclamation"></i>
                                        {sanitizeErrorMessage(video.processingError)}
                                      </>
                                    ) : (
                                      <>
                                        <i className="fa-solid fa-spinner fa-spin"></i>
                                        Processing...
                                      </>
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h3>No videos uploaded yet</h3>
                <p>Start creating and sharing your content!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'liked' && (
          <div className="uploaded-videos-dashboard">
            {loadingLiked ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                </div>
                <h3>Loading liked videos...</h3>
              </div>
                        ) : filteredLikedVideos.length > 0 ? (
                <div className="uploaded-videos-grid">
                  {filteredLikedVideos.map(video => (
                  <div key={video.id} className="uploaded-video-card">
                    <div className="video-thumbnail-wrapper" onClick={() => handleVideoAction(video.id, 'view')}>
                      <img 
                        src={video.thumbnail} 
                        alt={video.caption} 
                        className="uploaded-video-thumbnail"
                      />
                      <div className="play-overlay">
                        <i className="fa-solid fa-play"></i>
                      </div>
                      <div className="video-duration-badge">
                        1:23
                      </div>
                    </div>
                    
                    <div className="video-card-content">
                      <h3 className="video-card-caption">{video.caption}</h3>
                      <div className="video-card-stats">
                        <span className="stat">
                          <i className="fa-solid fa-eye"></i>
                          {formatStat(video.views)}
                        </span>
                        <span className="stat">
                          <i className="fa-solid fa-heart"></i>
                          {formatStat(video.likes)}
                        </span>
                        <span className="stat">
                          <i className="fa-solid fa-comment"></i>
                          {video.comments}
                        </span>
                      </div>
                      <div className="video-card-meta">
                        <span className="upload-date">{video.uploadDate}</span>
                      </div>
                      
                      <div className="video-card-actions">
                        <button 
                          className="action-btn-primary"
                          onClick={() => handleVideoAction(video.id, 'view')}
                        >
                          <i className="fa-solid fa-eye"></i>
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
                              <div className="empty-state">
                  <div className="empty-icon">
                    <i className="fa-solid fa-heart"></i>
                  </div>
                  <h3>No liked videos yet</h3>
                  <p>Start liking videos to see them here!</p>
                </div>
              )}
            </div>
          )}

        {activeTab === 'drafts' && (
          <div className="uploaded-videos-dashboard">
            {loadingDrafts ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                </div>
                <h3>Loading drafts...</h3>
              </div>
            ) : drafts.length > 0 ? (
              <div className="uploaded-videos-grid">
                {drafts.map(draft => (
                  <div key={draft.id} className="uploaded-video-card">
                    <div className="video-thumbnail-wrapper" onClick={() => handleVideoAction(draft.id, 'view')}>
                      <img 
                        src={draft.thumbnail} 
                        alt={draft.caption} 
                        className="uploaded-video-thumbnail"
                      />
                      <div className="visibility-tag">
                        <span className="visibility-private">
                          <i className="fa-solid fa-file"></i> Draft
                        </span>
                      </div>
                      <div className="play-overlay">
                        <i className="fa-solid fa-play"></i>
                      </div>
                    </div>
                    
                    <div className="video-card-content">
                      <h3 className="video-card-caption">{draft.caption}</h3>
                      <div className="video-card-meta">
                        <span className="upload-date">Saved {draft.uploadDate}</span>
                      </div>
                      
                      <div className="video-card-actions">
                        <button 
                          className="action-btn-primary"
                          onClick={() => handleVideoAction(draft.id, 'edit')}
                        >
                          <i className="fa-solid fa-edit"></i>
                          Continue Editing
                        </button>
                        <button 
                          className="action-btn-secondary"
                          onClick={() => handleVideoAction(draft.id, 'delete')}
                        >
                          <i className="fa-solid fa-trash"></i>
                          Delete Draft
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <i className="fa-solid fa-file"></i>
                </div>
                <h3>No drafts saved</h3>
                <p>Start creating a video to save drafts!</p>
              </div>
            )}
          </div>
                  )}

          {/* Reposted Videos Tab */}
          {activeTab === 'reposts' && (
            <div className="uploaded-videos-dashboard">
              {loadingReposts ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  </div>
                  <h3>Loading reposted videos...</h3>
                </div>
              ) : filteredRepostedVideos.length > 0 ? (
                <div className="uploaded-videos-grid">
                  {filteredRepostedVideos.map(video => (
                    <div key={video.id} className="uploaded-video-card">
                      <div className="video-thumbnail-wrapper" onClick={() => handleVideoAction(video.id, 'view')}>
                        <img
                          src={video.thumbnail}
                          alt={video.caption}
                          className="uploaded-video-thumbnail"
                        />
                        <div className="play-overlay">
                          <i className="fa-solid fa-play"></i>
                        </div>
                        <div className="video-duration-badge">
                          1:23
                        </div>
                        <div className="visibility-tag">
                          <span className="visibility-repost">
                            <i className="fa-solid fa-share-nodes"></i> Repost
                          </span>
                        </div>
                      </div>
                      <div className="video-card-content">
                        <p className="video-card-caption">{video.caption}</p>
                        <div className="video-card-stats">
                          <span><i className="fa-solid fa-eye"></i> {formatStat(video.views)}</span>
                          <span><i className="fa-solid fa-heart"></i> {formatStat(video.likes)}</span>
                        </div>
                        {video.originalCreator && (
                          <div className="repost-creator-info">
                            <i className="fa-solid fa-share-nodes"></i>
                            <span>Reposted from {video.originalCreator.username}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">
                    <i className="fa-solid fa-share-nodes"></i>
                  </div>
                  <h3>No reposted videos yet</h3>
                  <p>Repost videos you love to share them with your followers!</p>
                </div>
              )}
            </div>
          )}

          {/* Scrollbar styling is handled in CSS */}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="edit-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="edit-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h2>Edit Profile</h2>
              <button className="modal-close-btn" onClick={() => setShowEditModal(false)}>
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <div className="edit-modal-body">
              <div className="edit-form-group">
                <label htmlFor="username-edit-modal-input">Username</label>
                <input
                  id="username-edit-modal-input"
                  type="text"
                  value={usernameText}
                  onChange={(e) => setUsernameText(e.target.value)}
                  placeholder="Enter username"
                  className="edit-input"
                />
              </div>

              <div className="edit-form-group">
                <label htmlFor="bio-textarea">Bio</label>
                <textarea
                  id="bio-textarea"
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                  placeholder="Tell us about yourself"
                  maxLength={150}
                  rows="4"
                  className="edit-textarea"
                />
                <span className="char-count">{bioText.length}/150</span>
              </div>

              <div className="edit-form-group">
                <label htmlFor="privacy-toggle">Privacy Setting</label>
                <div id="privacy-toggle" className="privacy-toggle">
                  <button
                    className={`privacy-btn ${!isPrivate ? 'active' : ''}`}
                    onClick={() => setIsPrivate(false)}
                  >
                    <i className="fa-solid fa-globe"></i> Public
                  </button>
                  <button
                    className={`privacy-btn ${isPrivate ? 'active' : ''}`}
                    onClick={() => setIsPrivate(true)}
                  >
                    <i className="fa-solid fa-lock"></i> Private
                  </button>
                </div>
                <p className="privacy-desc">
                  {isPrivate 
                    ? 'Only approved followers can see your videos' 
                    : 'Anyone can see your uploaded videos, liked videos, and followers count'}
                </p>
              </div>

              <div className="edit-form-group">
                <label htmlFor="website-link-edit-input">Website Link</label>
                <input
                  id="website-link-edit-input"
                  type="url"
                  value={websiteLink}
                  onChange={(e) => setWebsiteLink(e.target.value)}
                  placeholder="Enter website link"
                  className="edit-input"
                />
              </div>

              <div className="edit-form-group">
                <label htmlFor="banner-upload">Profile Banner</label>
                <div id="banner-upload" className="banner-upload-section">
                  <div className="banner-preview-container">
                    <div
                      className="banner-preview"
                      style={{
                        backgroundImage: bannerPreview ? `url(${bannerPreview})` : bannerImage ? `url(${bannerImage})` : 'linear-gradient(135deg, #2563EB 0%, #38BDF8 100%)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      {bannerPreview || bannerImage ? (
                        <button
                          className="banner-remove-btn"
                          onClick={handleBannerDelete}
                          title="Remove Banner"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="banner-actions">
                    <button
                      type="button"
                      className="banner-upload-btn"
                      onClick={() => bannerFileInputRef.current?.click()}
                    >
                      <i className="fa-solid fa-upload"></i>
                      {bannerPreview || bannerImage ? 'Change Banner' : 'Upload Banner'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="edit-modal-footer">
                <button className="cancel-profile-btn" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button 
                  className="save-profile-btn" 
                  disabled={savingProfile}
                  onClick={async () => {
                    try {
                      // Prepare profile data
                      const profileData = {
                        username: usernameText || user?.username,
                        displayName: usernameText || user?.username,
                        bio: bioText,
                        website: websiteLink
                      };
                      
                      // Include existing banner if no new file is being uploaded and banner wasn't deleted
                      // If bannerImage is empty string, it means user deleted it, so send empty to clear it
                      if (!bannerFile) {
                        if (bannerImage === '') {
                          // User deleted banner, send empty string to clear it
                          profileData.banner = '';
                          console.log('🗑️ Banner deleted by user, sending empty string');
                        } else if (bannerImage && !bannerImage.startsWith('https://images.unsplash.com')) {
                          // Existing banner from state (not default), preserve it
                          profileData.banner = bannerImage;
                          console.log('💾 Preserving existing banner from bannerImage state:', {
                            length: bannerImage.length,
                            preview: bannerImage.substring(0, 50) + '...'
                          });
                        } else {
                          // Check if user has a saved banner in database (even if state shows default)
                          // This handles the case where banner was saved but state wasn't updated
                          if (user?.profile?.banner && user.profile.banner !== '' && !user.profile.banner.startsWith('https://images.unsplash.com')) {
                            profileData.banner = user.profile.banner;
                            console.log('💾 Preserving existing banner from user context (database):', {
                              length: user.profile.banner.length,
                              preview: user.profile.banner.substring(0, 50) + '...'
                            });
                          } else {
                            // No banner in database and state shows default
                            // Don't include banner - backend will preserve existing if any
                            console.log('ℹ️ Banner not included (default or not in context), backend will preserve existing');
                          }
                        }
                      }

                      // Handle avatar upload (if changed)
                      if (avatarFile) {
                        // Check file size (max 2MB for base64 to avoid network issues)
                        if (avatarFile.size > 2 * 1024 * 1024) {
                          setToastMessage('Avatar image is too large. Please use an image smaller than 2MB.');
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 4000);
                          return;
                        }
                        
                        // Convert file to base64 for now (backend expects URL string)
                        // In production, you'd upload to cloud storage first
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          try {
                            // Check base64 string size (should be ~33% larger than file)
                            const base64String = reader.result;
                            if (base64String.length > 3 * 1024 * 1024) { // ~3MB base64 limit
                              setToastMessage('Image is too large. Please use a smaller image.');
                              setShowToast(true);
                              setTimeout(() => setShowToast(false), 4000);
                              return;
                            }
                            
                            profileData.avatar = base64String;
                            await saveProfile(profileData);
                          } catch (error) {
                            console.error('Error saving avatar:', error);
                            let errorMsg = 'Failed to save avatar. Please try again.';
                            if (error.message?.includes('Network Error')) {
                              errorMsg = 'Network error. Please check if backend server is running.';
                            }
                            setToastMessage(errorMsg);
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 4000);
                          }
                        };
                        reader.onerror = () => {
                          setToastMessage('Error reading avatar file. Please try again.');
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 4000);
                        };
                        reader.readAsDataURL(avatarFile);
                        return; // Will continue in reader.onloadend
                      }

                      // Handle banner (if changed)
                      if (bannerFile) {
                        // Check file size (max 2MB for base64 to avoid network issues)
                        if (bannerFile.size > 2 * 1024 * 1024) {
                          setToastMessage('Banner image is too large. Please use an image smaller than 2MB.');
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 4000);
                          return;
                        }
                        
                        // Convert file to base64
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          try {
                            // Check base64 string size (should be ~33% larger than file)
                            const base64String = reader.result;
                            if (base64String.length > 3 * 1024 * 1024) { // ~3MB base64 limit
                              setToastMessage('Banner image is too large. Please use a smaller image.');
                              setShowToast(true);
                              setTimeout(() => setShowToast(false), 4000);
                              return;
                            }
                            
                            profileData.banner = base64String;
                            console.log('📤 Banner file converted, calling saveProfile with banner:', {
                              hasBanner: !!profileData.banner,
                              bannerLength: profileData.banner.length,
                              bannerPreview: profileData.banner.substring(0, 50) + '...'
                            });
                            await saveProfile(profileData);
                          } catch (error) {
                            console.error('Error saving banner:', error);
                            let errorMsg = 'Failed to save banner. Please try again.';
                            if (error.message?.includes('Network Error')) {
                              errorMsg = 'Network error. Please check if backend server is running.';
                            }
                            setToastMessage(errorMsg);
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 4000);
                          }
                        };
                        reader.onerror = () => {
                          setToastMessage('Error reading banner file. Please try again.');
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 4000);
                        };
                        reader.readAsDataURL(bannerFile);
                        return; // Will continue in reader.onloadend
                      }

                      // If no files, save directly
                      console.log('💾 Saving profile without file uploads:', {
                        hasBannerInData: 'banner' in profileData,
                        bannerValue: profileData.banner ? 'exists' : 'none',
                        bannerLength: profileData.banner ? profileData.banner.length : 0
                      });
                      await saveProfile(profileData);
                    } catch (error) {
                      console.error('Error saving profile:', error);
                      alert('Failed to save profile. Please try again.');
                    }
                  }}
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Viewer Modal */}
      {selectedVideo && (
        <div className="video-viewer-modal" onClick={() => setSelectedVideo(null)}>
          <div className="video-viewer-content" onClick={(e) => e.stopPropagation()}>
            <button className="video-viewer-close" onClick={() => setSelectedVideo(null)}>
              <i className="fa-solid fa-times"></i>
            </button>
            <div className="video-viewer-container">
              {(() => {
                // Get the best available video URL (never use thumbnail for video playback)
                let videoSrc = null;
                
                // Priority 1: Check processedVideos array
                if (selectedVideo.processedVideos && Array.isArray(selectedVideo.processedVideos) && selectedVideo.processedVideos.length > 0) {
                  const processedVideo = selectedVideo.processedVideos.find(pv => pv.url && !pv.url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i));
                  if (processedVideo && processedVideo.url) {
                    videoSrc = processedVideo.url;
                  }
                }
                
                // Priority 2: Check url field
                if (!videoSrc && selectedVideo.url) {
                  videoSrc = selectedVideo.url;
                }
                
                // Priority 3: Check videoUrl field
                if (!videoSrc && selectedVideo.videoUrl) {
                  videoSrc = selectedVideo.videoUrl;
                }
                
                // Ensure absolute URL and verify it's a video file
                let finalVideoSrc = null;
                if (videoSrc) {
                  const resolved = ensureAbsoluteUrl(videoSrc);
                  // Only use if it's not an image file
                  if (resolved && !resolved.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
                    finalVideoSrc = resolved;
                  }
                }
                
                console.log('Video Modal - selectedVideo:', selectedVideo);
                console.log('Video Modal - videoSrc:', videoSrc);
                console.log('Video Modal - finalVideoSrc:', finalVideoSrc);
                
                if (!finalVideoSrc || finalVideoSrc.trim() === '') {
                  let errorMessage = 'This video cannot be loaded.';
                  if (selectedVideo.status === 'processing') {
                    errorMessage = 'Video is still processing. Please wait and try again later.';
                  } else if (selectedVideo.status === 'failed') {
                    errorMessage = 'Video processing failed. Please try uploading again.';
                  } else if (selectedVideo.processingError) {
                    errorMessage = `Video error: ${selectedVideo.processingError}`;
                  }
                  
                  return (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      height: '100%', 
                      color: '#fff',
                      padding: '20px',
                      textAlign: 'center'
                    }}>
                      <i className="fa-solid fa-exclamation-triangle" style={{ fontSize: '48px', marginBottom: '16px', color: '#FF0050' }}></i>
                      <h3>Video Not Available</h3>
                      <p>{errorMessage}</p>
                      {selectedVideo.status && (
                        <p style={{ marginTop: '8px', fontSize: '14px', opacity: 0.7 }}>
                          Status: {selectedVideo.status}
                        </p>
                      )}
                      {selectedVideo.thumbnail && (
                        <img 
                          src={selectedVideo.thumbnail} 
                          alt="Video thumbnail" 
                          style={{ 
                            maxWidth: '200px', 
                            maxHeight: '200px', 
                            marginTop: '20px',
                            borderRadius: '8px',
                            opacity: 0.5
                          }} 
                        />
                      )}
                    </div>
                  );
                }
                
                return (
                  <video 
                    src={finalVideoSrc}
                    controls
                    autoPlay
                    playsInline
                    className="video-viewer-player"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      background: '#000000',
                      display: 'block'
                    }}
                    onError={(e) => {
                      const videoEl = e.target;
                      const error = videoEl.error;
                      let errorMsg = 'Unknown error';
                      
                      if (error) {
                        switch(error.code) {
                          case error.MEDIA_ERR_ABORTED:
                            errorMsg = 'Video playback was aborted';
                            break;
                          case error.MEDIA_ERR_NETWORK:
                            errorMsg = 'Network error while loading video';
                            break;
                          case error.MEDIA_ERR_DECODE:
                            errorMsg = 'Video decoding error';
                            break;
                          case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                            errorMsg = 'Video format not supported or file not found';
                            break;
                          default:
                            errorMsg = `Error code: ${error.code}`;
                        }
                      }
                      
                      console.error('Video playback error:', errorMsg);
                      console.error('Video element error:', error);
                      console.error('Video URL attempted:', finalVideoSrc);
                      console.error('Selected video object:', selectedVideo);
                    }}
                    onLoadedData={() => {
                      console.log('Video loaded successfully:', finalVideoSrc);
                    }}
                    onLoadStart={() => {
                      console.log('Video load started:', finalVideoSrc);
                    }}
                    onCanPlay={() => {
                      console.log('Video can start playing:', finalVideoSrc);
                    }}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Followers Modal */}
      {showFollowers && (
        <div className="followers-modal-overlay" onClick={() => setShowFollowers(false)}>
          <div className="followers-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="followers-modal-header">
              <button className="followers-modal-close" onClick={() => setShowFollowers(false)}>
                <i className="fa-solid fa-times"></i>
              </button>
              <h2>Followers</h2>
              <div className="followers-count">{followersList.length}</div>
            </div>
            <div className="followers-modal-body">
              {followersList.length > 0 ? (
                <div className="followers-list">
                  {followersList.map(follower => (
                    <div key={follower.id} className="follower-item">
                      <div className="follower-avatar">
                        <img src={follower.avatar} alt={follower.username} />
                      </div>
                      <div className="follower-info">
                        <h4>{follower.name}</h4>
                        <p>@{follower.username}</p>
                      </div>
                      <button className="follow-action-btn">
                        <i className="fa-solid fa-user-plus"></i>
                        Follow
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fa-solid fa-users"></i>
                  <p>No followers yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowing && (
        <div className="followers-modal-overlay" onClick={() => setShowFollowing(false)}>
          <div className="followers-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="followers-modal-header">
              <button className="followers-modal-close" onClick={() => setShowFollowing(false)}>
                <i className="fa-solid fa-times"></i>
              </button>
              <h2>Following</h2>
              <div className="followers-count">{followingList.length}</div>
            </div>
            <div className="followers-modal-body">
              {followingList.length > 0 ? (
                <div className="followers-list">
                  {followingList.map(following => (
                    <div key={following.id} className="follower-item">
                      <div className="follower-avatar">
                        <img src={following.avatar} alt={following.username} />
                      </div>
                      <div className="follower-info">
                        <h4>{following.name}</h4>
                        <p>@{following.username}</p>
                      </div>
                      <button className="unfollow-action-btn">
                        <i className="fa-solid fa-user-minus"></i>
                        Unfollow
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fa-solid fa-user-plus"></i>
                  <p>Not following anyone yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Story Viewer Modal - Popup format (not swipe) */}
      {showStoryViewer && userStories.length > 0 && (
        <StoryViewer
          storiesByUser={[{
            user: user,
            stories: userStories
          }]}
          startIndex={0}
          onClose={() => setShowStoryViewer(false)}
        />
      )}
    </div>
  );
};

export default Profile;
