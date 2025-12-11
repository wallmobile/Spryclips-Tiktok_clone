import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { viewStory, reactToStory, replyToStory } from '../../api/stories';
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
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [reactions, setReactions] = useState({});
  const [storyDetails, setStoryDetails] = useState(null);
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
    if (!currentStory || !user) return;
    try {
      await reactToStory(currentStory._id || currentStory.id, emoji);
      setReactions(prev => ({
        ...prev,
        [currentStory._id || currentStory.id]: emoji
      }));
    } catch (error) {
      console.error('Error reacting to story:', error);
    }
  };

  // Handle reply
  const handleReply = async (e) => {
    e.preventDefault();
    if (!currentStory || !user || !replyMessage.trim()) return;
    try {
      await replyToStory(currentStory._id || currentStory.id, replyMessage.trim());
      setReplyMessage('');
      setShowReplyInput(false);
      // Refresh story details to get updated replies
      const storyId = currentStory._id || currentStory.id;
      try {
        const response = await api.get(`/api/stories/${storyId}`);
        if (response.data?.story) {
          setStoryDetails(response.data.story);
        }
      } catch (fetchError) {
        console.error('Error fetching story details:', fetchError);
      }
    } catch (error) {
      console.error('Error replying to story:', error);
      alert('Failed to send reply. Please try again.');
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
    markAsViewed(currentStory._id || currentStory.id);
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
            {/* Show views count if story owner */}
            {user && displayStory.user && (user._id === displayStory.user || user._id === displayStory.user._id) && (
              <div className="story-viewer__views-count">
                <i className="fa-solid fa-eye"></i> {displayStory.views || 0} views
              </div>
            )}
          </div>
        </div>
        <button className="story-viewer__close" onClick={onClose}>
          <i className="fa-solid fa-times"></i>
        </button>
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
            }}
          >
            {currentStory.text}
          </div>
        )}
      </div>

      {/* Navigation areas */}
      <div className="story-viewer__nav-left" onClick={(e) => { e.stopPropagation(); previousStory(); }}></div>
      <div className="story-viewer__nav-right" onClick={(e) => { e.stopPropagation(); nextStory(); }}></div>

      {/* Actions */}
      <div className="story-viewer__actions">
        <button
          className="story-viewer__action-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleReaction('❤️');
          }}
          title="Like"
        >
          <i className="fa-solid fa-heart"></i>
        </button>
        <button
          className="story-viewer__action-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowReplyInput(!showReplyInput);
          }}
          title="Reply"
        >
          <i className="fa-solid fa-comment"></i>
        </button>
        <button
          className="story-viewer__action-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (navigator.share) {
              navigator.share({
                title: `${storyUser.username}'s story`,
                text: 'Check out this story!',
                url: window.location.href,
              }).catch(console.error);
            }
          }}
          title="Share"
        >
          <i className="fa-solid fa-share"></i>
        </button>
      </div>

      {/* Reply input */}
      {showReplyInput && (
        <div className="story-viewer__reply-container" onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleReply}>
            <input
              type="text"
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Send a message..."
              className="story-viewer__reply-input"
              autoFocus
            />
            <button type="submit" className="story-viewer__reply-send">
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </form>
          {/* Show reactions and replies count */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            marginTop: '8px',
            fontSize: '0.85rem',
            color: '#fff',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)'
          }}>
            {displayStory.reactions && displayStory.reactions.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <i className="fa-solid fa-heart" style={{ color: '#FF0050' }}></i>
                <span>{displayStory.reactions.length}</span>
              </div>
            )}
            {displayStory.replies && displayStory.replies.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <i className="fa-solid fa-comments" style={{ color: '#25F4EE' }}></i>
                <span>{displayStory.replies.length} {displayStory.replies.length === 1 ? 'reply' : 'replies'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryViewer;

