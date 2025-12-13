import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { viewStory, reactToStory, deleteStory, getStoryDetails } from '../../api/stories';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/axios';
import './StoryViewer.css';

const STORY_DURATION = 5000; // 5 seconds per story

const StoryViewer = ({ storiesByUser, startIndex = 0, onClose }) => {
  const { user } = useAuth();
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reactions, setReactions] = useState({});
  const [storyDetails, setStoryDetails] = useState(null);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [viewersList, setViewersList] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const progressIntervalRef = useRef(null);
  const storyTimeoutRef = useRef(null);
  const videoRef = useRef(null);
  const imageRef = useRef(null);

  // Ensure storiesByUser is an array and memoize valid stories
  const validStoriesArray = useMemo(() => {
    if (!storiesByUser) return [];
    
    const storiesArray = Array.isArray(storiesByUser) ? storiesByUser : [storiesByUser].filter(Boolean);
    
    // Filter out expired stories (24-hour expiration check)
    return storiesArray.map(userStory => {
      if (!userStory || !userStory.stories || !Array.isArray(userStory.stories)) {
        return { ...userStory, stories: [] };
      }
      
      return {
        ...userStory,
        stories: userStory.stories.filter(story => {
          if (!story || !story.expiresAt) return false;
          const expiresAt = new Date(story.expiresAt);
          const now = new Date();
          return expiresAt > now;
        })
      };
    }).filter(userStory => userStory.stories && userStory.stories.length > 0);
  }, [storiesByUser]);

  // Reset indices when stories change
  useEffect(() => {
    if (validStoriesArray.length > 0) {
      setCurrentUserIndex(0);
      setCurrentStoryIndex(startIndex);
      setProgress(0);
    }
  }, [validStoriesArray.length, startIndex]);

  const currentUserStories = validStoriesArray[currentUserIndex];
  const currentStory = currentUserStories?.stories?.[currentStoryIndex];

  // Check if story is expired (24 hours)
  const isStoryExpired = (story) => {
    if (!story || !story.expiresAt) return true;
    const expiresAt = new Date(story.expiresAt);
    const now = new Date();
    return expiresAt <= now;
  };

  // Mark story as viewed and fetch story details
  const markAsViewed = useCallback(async (storyId) => {
    if (!user || !storyId) return;
    try {
      await viewStory(storyId);
      // Fetch updated story details to get views and replies
      try {
        const response = await api.get(`/api/stories/${storyId}`);
        if (response.data?.story) {
          setStoryDetails(response.data.story);
        }
      } catch (fetchError) {
        console.error('Error fetching story details:', fetchError);
      }
    } catch (error) {
      console.error('Error marking story as viewed:', error);
    }
  }, [user]);

  // Fetch viewers list
  const fetchViewers = useCallback(async (storyId) => {
    try {
      const response = await getStoryDetails(storyId);
      if (response?.story?.viewedBy) {
        const viewers = response.story.viewedBy.map(view => ({
          user: view.user,
          viewedAt: view.viewedAt
        }));
        setViewersList(viewers);
        setShowViewersModal(true);
      }
    } catch (error) {
      console.error('Error fetching viewers:', error);
      alert('Failed to load viewers');
    }
  }, []);

  // Handle delete story - Direct delete without confirmation
  const handleDeleteStory = useCallback(async (storyId) => {
    if (!storyId) {
      console.error('❌ No story ID provided for deletion');
      return;
    }

    console.log('🗑️ Deleting story:', storyId);
    setIsDeleting(true);
    
    try {
      const response = await deleteStory(storyId);
      console.log('✅ Story deleted successfully:', response);
      
      // Trigger refresh to update stories list
      window.dispatchEvent(new Event('stories:refresh'));
      
      // Move to next story or close if no more stories
      const currentStories = validStoriesArray[currentUserIndex]?.stories || [];
      const remainingStories = currentStories.filter(s => {
        const sId = s._id || s.id;
        return sId && sId.toString() !== storyId.toString();
      });
      
      if (remainingStories.length === 0) {
        // No more stories for this user, try next user or close
        if (currentUserIndex < validStoriesArray.length - 1) {
          setCurrentUserIndex(currentUserIndex + 1);
          setCurrentStoryIndex(0);
        } else {
          onClose();
        }
      } else {
        // Move to next story or adjust index
        if (currentStoryIndex >= remainingStories.length) {
          setCurrentStoryIndex(remainingStories.length - 1);
        }
        // Refresh the current story view
        setProgress(0);
      }
    } catch (error) {
      console.error('❌ Error deleting story:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // Silent error handling - no popup, just refresh
      // Story might already be deleted or there was a network issue
      console.log('ℹ️ Error occurred, refreshing stories...');
      window.dispatchEvent(new Event('stories:refresh'));
      
      // Move to next story or close
      const currentStories = validStoriesArray[currentUserIndex]?.stories || [];
      const remainingStories = currentStories.filter(s => {
        const sId = s._id || s.id;
        return sId && sId.toString() !== storyId.toString();
      });
      
      if (remainingStories.length === 0) {
        if (currentUserIndex < validStoriesArray.length - 1) {
          setCurrentUserIndex(currentUserIndex + 1);
          setCurrentStoryIndex(0);
        } else {
          onClose();
        }
      } else {
        if (currentStoryIndex >= remainingStories.length) {
          setCurrentStoryIndex(remainingStories.length - 1);
        }
      }
    } finally {
      setIsDeleting(false);
    }
  }, [validStoriesArray, currentUserIndex, currentStoryIndex, onClose]);

  // Start progress animation
  const startProgress = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    if (storyTimeoutRef.current) {
      clearTimeout(storyTimeoutRef.current);
    }

    if (isPaused || !currentStory || isStoryExpired(currentStory)) {
      return;
    }

    setProgress(0);
    const startTime = Date.now();
    const duration = currentStory.type === 'video' && videoRef.current?.duration 
      ? videoRef.current.duration * 1000 
      : STORY_DURATION;

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);
    }, 50);

    storyTimeoutRef.current = setTimeout(() => {
      nextStory();
    }, duration);
  }, [isPaused, currentStory]);

  // Next story
  const nextStory = useCallback(() => {
    if (!validStoriesArray || validStoriesArray.length === 0) {
      onClose();
      return;
    }

    if (!currentUserStories || !currentUserStories.stories) {
      onClose();
      return;
    }

    // Mark current story as viewed
    if (currentStory) {
      markAsViewed(currentStory._id || currentStory.id);
    }

    // Move to next story in current user's stories
    if (currentStoryIndex < currentUserStories.stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setProgress(0);
    } else {
      // Move to next user
      if (currentUserIndex < validStoriesArray.length - 1) {
        setCurrentUserIndex(currentUserIndex + 1);
        setCurrentStoryIndex(0);
        setProgress(0);
      } else {
        // All stories viewed, close viewer
        onClose();
      }
    }
  }, [currentUserStories, currentStoryIndex, currentUserIndex, validStoriesArray, currentStory, markAsViewed, onClose]);

  // Previous story
  const previousStory = useCallback(() => {
    if (!validStoriesArray || validStoriesArray.length === 0) return;
    if (!currentUserStories || !currentUserStories.stories) return;

    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setProgress(0);
    } else {
      // Move to previous user's last story
      if (currentUserIndex > 0) {
        const prevUserStories = validStoriesArray[currentUserIndex - 1];
        if (prevUserStories && prevUserStories.stories && prevUserStories.stories.length > 0) {
          setCurrentUserIndex(currentUserIndex - 1);
          setCurrentStoryIndex(prevUserStories.stories.length - 1);
          setProgress(0);
        }
      }
    }
  }, [currentStoryIndex, currentUserIndex, validStoriesArray, currentUserStories]);

  // Handle reaction
  const handleReaction = async (emoji = '❤️') => {
    if (!currentStory || !user) {
      console.warn('⚠️ Cannot react: missing story or user');
      return;
    }
    
    const storyId = currentStory._id || currentStory.id;
    console.log('❤️ Reacting to story:', { storyId, emoji });
    
    try {
      const response = await reactToStory(storyId, emoji);
      console.log('✅ Reaction successful:', response);
      
      // Update reactions state
      setReactions(prev => ({
        ...prev,
        [storyId]: emoji
      }));
      
      // Update story details if available
      if (response?.story) {
        setStoryDetails(response.story);
      } else {
        // Refresh story details to get updated reactions
        try {
          const detailsResponse = await api.get(`/api/stories/${storyId}`);
          if (detailsResponse.data?.story) {
            setStoryDetails(detailsResponse.data.story);
          }
        } catch (fetchError) {
          console.error('⚠️ Error fetching updated story details:', fetchError);
        }
      }
    } catch (error) {
      console.error('❌ Error reacting to story:', error);
      console.error('Error details:', error.response?.data || error.message);
      alert(`Failed to react: ${error.response?.data?.message || error.message || 'Please try again.'}`);
    }
  };


  // Pause/Resume
  const togglePause = () => {
    setIsPaused(!isPaused);
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  // Handle video loaded
  const handleVideoLoaded = () => {
    if (videoRef.current && !isPaused) {
      videoRef.current.play().catch(console.error);
    }
  };

  // Effect to start progress when story changes
  useEffect(() => {
    if (!currentStory) {
      // No story available, try to move to next or close
      if (validStoriesArray.length > 0) {
        nextStory();
      } else {
        onClose();
      }
      return;
    }

    if (isStoryExpired(currentStory)) {
      // Skip expired story
      nextStory();
      return;
    }

    // Mark as viewed and start progress
    const storyId = currentStory._id || currentStory.id;
    markAsViewed(storyId);
    
    // If it's user's own story, trigger refresh to show DP
    if (user && currentUserStories?.user && 
        (user._id === currentUserStories.user._id || user._id === currentUserStories.user.id)) {
      // Dispatch event to refresh stories bar
      setTimeout(() => {
        window.dispatchEvent(new Event('stories:refresh'));
      }, 500);
    }
    
    startProgress();

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (storyTimeoutRef.current) {
        clearTimeout(storyTimeoutRef.current);
      }
    };
  }, [currentStory, startProgress, nextStory, markAsViewed, validStoriesArray.length, onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        nextStory();
      } else if (e.key === 'ArrowLeft') {
        previousStory();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [nextStory, previousStory, onClose]);

  if (!validStoriesArray || validStoriesArray.length === 0 || !currentStory) {
    return null;
  }

  if (isStoryExpired(currentStory)) {
    // Skip to next story if current is expired
    nextStory();
    return null;
  }

  const storyUser = currentUserStories.user;
  const avatar = storyUser?.profile?.avatar || 
    `https://ui-avatars.com/api/?name=${storyUser?.username || 'User'}&background=ff0050&color=fff`;
  const isVideo = currentStory.type === 'video';
  const mediaUrl = currentStory.mediaUrl;
  
  // Use storyDetails if available (has updated views/replies), otherwise use currentStory
  const displayStory = storyDetails || currentStory;

  return (
    <div className="story-viewer" onClick={togglePause}>
      <div className="story-viewer__overlay"></div>
      
      {/* Progress bars */}
      <div className="story-viewer__progress-container">
        {currentUserStories.stories.map((story, index) => (
          <div key={story._id || story.id} className="story-viewer__progress-bar">
            <div
              className={`story-viewer__progress-fill ${
                index < currentStoryIndex ? 'story-viewer__progress-fill--completed' : ''
              } ${index === currentStoryIndex ? 'story-viewer__progress-fill--active' : ''}`}
              style={{
                width: index === currentStoryIndex ? `${progress}%` : index < currentStoryIndex ? '100%' : '0%',
                transition: index === currentStoryIndex && !isPaused ? 'width 0.1s linear' : 'none'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="story-viewer__header">
        <div className="story-viewer__user-info">
          <img src={avatar} alt={storyUser.username} className="story-viewer__avatar" />
          <div>
            <div className="story-viewer__username">{storyUser.username}</div>
            <div className="story-viewer__time">
              {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            {/* Show views count if story owner - clickable to see viewers */}
            {user && displayStory.user && (user._id === displayStory.user || user._id === displayStory.user._id) && (
              <div 
                className="story-viewer__views-count"
                onClick={(e) => {
                  e.stopPropagation();
                  fetchViewers(currentStory._id || currentStory.id);
                }}
                style={{ cursor: 'pointer', userSelect: 'none' }}
                title="Click to see who viewed"
              >
                <i className="fa-solid fa-eye"></i> {displayStory.views || 0} views
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Delete button for own stories */}
          {user && displayStory.user && (user._id === displayStory.user || user._id === displayStory.user._id) && (
            <button 
              className="story-viewer__delete"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteStory(currentStory._id || currentStory.id);
              }}
              disabled={isDeleting}
              title="Delete story"
              style={{
                background: 'rgba(255, 0, 0, 0.7)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                color: '#fff',
                fontSize: '16px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isDeleting) e.target.style.background = 'rgba(255, 0, 0, 0.9)';
              }}
              onMouseLeave={(e) => {
                if (!isDeleting) e.target.style.background = 'rgba(255, 0, 0, 0.7)';
              }}
            >
              {isDeleting ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                <i className="fa-solid fa-trash"></i>
              )}
            </button>
          )}
          <button className="story-viewer__close" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
        </div>
      </div>

      {/* Media */}
      <div className="story-viewer__media-container">
        {isVideo ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            className="story-viewer__media"
            autoPlay
            playsInline
            muted={false}
            onLoadedData={handleVideoLoaded}
            onEnded={nextStory}
            loop={false}
          />
        ) : (
          <img
            ref={imageRef}
            src={mediaUrl}
            alt="Story"
            className="story-viewer__media"
          />
        )}
        
        {/* Text overlay */}
        {currentStory.text && (
          <div
            className="story-viewer__text-overlay"
            style={{
              color: currentStory.textColor || '#FFFFFF',
              background: currentStory.textBackground || 'transparent',
              left: `${currentStory.textPositionX || 50}%`,
              top: `${currentStory.textPositionY || 50}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {currentStory.text}
          </div>
        )}
      </div>

      {/* Navigation areas */}
      <div className="story-viewer__nav-left" onClick={(e) => { e.stopPropagation(); previousStory(); }}></div>
      <div className="story-viewer__nav-right" onClick={(e) => { e.stopPropagation(); nextStory(); }}></div>

      {/* Actions - Only show in StoryViewer */}
      <div className="story-viewer__actions">
        <button
          className="story-viewer__action-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleReaction('❤️');
          }}
          title="Like"
          style={{
            background: displayStory?.reactions?.some(r => 
              (r.user?._id || r.user?.id || r.user) === user?._id
            ) ? 'rgba(255, 0, 80, 0.3)' : 'transparent'
          }}
        >
          <i 
            className="fa-solid fa-heart" 
            style={{
              color: displayStory?.reactions?.some(r => 
                (r.user?._id || r.user?.id || r.user) === user?._id
              ) ? '#FF0050' : '#fff'
            }}
          ></i>
          {displayStory?.reactions && displayStory.reactions.length > 0 && (
            <span style={{ marginLeft: '4px', fontSize: '0.85rem' }}>
              {displayStory.reactions.length}
            </span>
          )}
        </button>
      </div>


      {/* Viewers Modal */}
      {showViewersModal && (
        <div 
          className="story-viewer__viewers-modal"
          onClick={(e) => {
            if (e.target.classList.contains('story-viewer__viewers-modal')) {
              setShowViewersModal(false);
            }
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
        >
          <div 
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '20px',
              maxWidth: '400px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-eye"></i> Viewers ({viewersList.length})
              </h3>
              <button
                onClick={() => setShowViewersModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#666',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#f0f0f0'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            
            {viewersList.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>No viewers yet</p>
            ) : (
              <div>
                {viewersList.map((view, index) => {
                  const viewer = view.user;
                  const avatar = viewer?.profile?.avatar || 
                    `https://ui-avatars.com/api/?name=${viewer?.username || 'User'}&background=ff0050&color=fff`;
                  return (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        borderBottom: index < viewersList.length - 1 ? '1px solid #eee' : 'none',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#f9f9f9'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      <img
                        src={avatar}
                        alt={viewer?.username}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>
                          {viewer?.username || 'Unknown User'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {new Date(view.viewedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryViewer;

