import React, { useState, useEffect, useRef } from 'react';
import { getFollowingStories, getUserStories } from '../../api/stories';
import { useAuth } from '../../context/AuthContext';
import './StoriesBar.css';

const StoriesBar = ({ onStoryClick }) => {
  const { user } = useAuth();
  const [storiesByUser, setStoriesByUser] = useState([]);
  const [myStories, setMyStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const fetchStories = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch both following stories and current user's stories
        const [followingResponse, myStoriesResponse] = await Promise.all([
          getFollowingStories().catch(err => {
            console.error('Error fetching following stories:', err);
            return { storiesByUser: [] };
          }),
          getUserStories(user._id).catch(err => {
            console.error('Error fetching my stories:', err);
            console.error('Error details:', err.response?.data || err.message);
            return { stories: [], success: false };
          })
        ]);
        
        console.log('📊 Following stories response:', followingResponse);
        console.log('📊 My stories response:', myStoriesResponse);
        
        // Filter out expired stories on client side (24-hour expiration)
        const now = new Date();
        
        // Filter following stories
        const filteredFollowingStories = followingResponse.storiesByUser.map(userStory => ({
          ...userStory,
          stories: userStory.stories.filter(story => {
            const expiresAt = new Date(story.expiresAt);
            return expiresAt > now;
          })
        })).filter(userStory => userStory.stories.length > 0);

        // Filter current user's stories
        console.log('📚 My stories response:', myStoriesResponse);
        const myStoriesArray = myStoriesResponse?.stories || myStoriesResponse?.data?.stories || [];
        console.log('📚 My stories count:', myStoriesArray.length);
        console.log('📚 My stories array:', myStoriesArray);
        
        const filteredMyStories = myStoriesArray.filter(story => {
          if (!story || !story.expiresAt) {
            console.warn('⚠️ Story missing expiresAt:', story);
            return false;
          }
          const expiresAt = new Date(story.expiresAt);
          const isValid = expiresAt > now;
          if (!isValid) {
            console.log('⏰ Story expired:', story._id, 'expiresAt:', expiresAt, 'now:', now);
          }
          return isValid;
        });
        
        console.log('✅ Filtered my stories count:', filteredMyStories.length);

        // Set current user's stories separately
        setMyStories(filteredMyStories);
        
        // Combine: current user's story first, then following stories
        const allStories = [];
        
        // Add current user's story at the beginning if they have any
        // Always show own story even if not viewed yet
        if (filteredMyStories.length > 0) {
          allStories.push({
            user: {
              _id: user._id,
              id: user._id,
              username: user.username,
              profile: user.profile
            },
            stories: filteredMyStories.map(story => ({
              ...story,
              // Ensure hasViewed is explicitly set
              hasViewed: story.hasViewed !== undefined ? story.hasViewed : false
            })),
            isOwn: true // Mark as own story
          });
        }
        
        // Add following users' stories
        allStories.push(...filteredFollowingStories);

        setStoriesByUser(allStories);
        setError(null);
      } catch (err) {
        console.error('Error fetching stories:', err);
        setError('Failed to load stories');
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
    
    // Refresh stories every 5 minutes
    const interval = setInterval(fetchStories, 5 * 60 * 1000);
    
    // Listen for story creation events
    const handleRefresh = () => {
      console.log('🔄 Stories refresh event received, fetching stories...');
      fetchStories();
    };
    window.addEventListener('stories:refresh', handleRefresh);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('stories:refresh', handleRefresh);
    };
  }, [user]);

  const handleStoryClick = (userStories, startIndex = 0) => {
    if (onStoryClick) {
      onStoryClick(userStories, startIndex);
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="stories-bar" style={{ display: 'block', visibility: 'visible' }}>
        <div className="stories-bar__container">
          <div className="stories-bar__loading">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <span>Loading stories...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Stories error:', error);
  }

  const hasStories = storiesByUser && storiesByUser.length > 0;

  // Always render stories bar if user is logged in
  return (
    <div 
      className="stories-bar" 
      ref={scrollContainerRef}
      style={{ 
        display: 'block', 
        visibility: 'visible',
        position: 'relative',
        zIndex: 100
      }}
    >
      <div className="stories-bar__container">
        {hasStories && storiesByUser.map((userStory) => {
          const { user: storyUser, stories, isOwn } = userStory;
          
          // Ensure stories array exists and is valid - but don't hide if empty, show anyway
          if (!stories || !Array.isArray(stories)) {
            console.warn('⚠️ Invalid stories array for user:', storyUser?.username);
            return null;
          }
          
          // Always show story item even if stories array is empty (might be loading)
          const hasUnviewed = stories.length > 0 && stories.some(story => story && !story.hasViewed);
          const firstStory = stories[0];
          const isMyStory = isOwn || (storyUser?._id || storyUser?.id) === user?._id;
          
          // Check if user has viewed their own story
          // For own stories, check if any story has been viewed
          // Default to false if no stories or not viewed
          const hasViewedOwnStory = isMyStory && stories.length > 0 && stories.some(story => {
            if (!story) return false;
            // Check if story has hasViewed property or if it's in viewedBy array
            return story.hasViewed === true || 
                   (story.viewedBy && Array.isArray(story.viewedBy) && 
                    story.viewedBy.some(view => {
                      const viewUserId = view?.user?._id || view?.user?.id || view?.user;
                      return viewUserId && viewUserId.toString() === user?._id?.toString();
                    }));
          });
          
          const avatar = storyUser?.profile?.avatar || 
            `https://ui-avatars.com/api/?name=${storyUser?.username || 'User'}&background=25F4EE&color=fff`;

          return (
            <div
              key={storyUser?._id || storyUser?.id || `story-${Math.random()}`}
              className={`stories-bar__item ${hasUnviewed && !isMyStory ? 'stories-bar__item--unviewed' : ''} ${isMyStory ? 'stories-bar__item--own' : ''} ${isMyStory && !hasViewedOwnStory ? 'stories-bar__item--unviewed-own' : ''}`}
              onClick={() => handleStoryClick(userStory)}
              style={{ 
                display: 'flex !important', 
                visibility: 'visible !important', 
                opacity: '1 !important',
                pointerEvents: 'auto'
              }}
            >
              <div className="stories-bar__avatar-wrapper">
                {isMyStory && !hasViewedOwnStory ? (
                  // Hide DP until user views their story - show placeholder
                  <div className="stories-bar__avatar-placeholder">
                    <i className="fa-solid fa-user"></i>
                  </div>
                ) : (
                  <img
                    src={avatar}
                    alt={storyUser?.username || 'User'}
                    className="stories-bar__avatar"
                    style={{ display: 'block', visibility: 'visible', opacity: 1 }}
                    onError={(e) => {
                      // Fallback if image fails to load - show placeholder
                      console.warn('⚠️ Avatar image failed to load:', avatar);
                      e.target.style.display = 'none';
                      const placeholder = e.target.parentElement.querySelector('.stories-bar__avatar-placeholder');
                      if (placeholder) {
                        placeholder.style.display = 'flex';
                      }
                    }}
                  />
                )}
                {hasUnviewed && !isMyStory && <div className="stories-bar__unviewed-indicator"></div>}
              </div>
              <div className="stories-bar__username">
                {isMyStory ? 'Your Story' : (storyUser?.username || 'User')}
              </div>
              {stories.length > 1 && (
                <div className="stories-bar__count">{stories.length}</div>
              )}
            </div>
          );
        })}
        {!hasStories && !loading && (
          <div className="stories-bar__empty-message">
            <p>No stories available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoriesBar;

