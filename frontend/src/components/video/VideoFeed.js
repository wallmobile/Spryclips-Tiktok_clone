import React, { useState, useEffect } from 'react';
import './VideoFeed.css';
import VideoPlayer from './VideoPlayer';
import { videos } from '../../data/sampleData';

const VideoFeed = () => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [liked, setLiked] = useState(new Set());
  const [followed, setFollowed] = useState(new Set());
  const [isMuted, setIsMuted] = useState(true); // Global mute state - persists across videos
  const [volume, setVolume] = useState(50); // Global volume state

  useEffect(() => {
    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      setCurrentVideoIndex((prev) => {
        const newIndex = prev + delta;
        if (newIndex < 0) return 0;
        if (newIndex >= videos.length) return videos.length - 1;
        return newIndex;
      });
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    window.scrollTo({
      top: currentVideoIndex * window.innerHeight,
      behavior: 'smooth'
    });
  }, [currentVideoIndex]);

  const toggleLike = (videoId) => {
    setLiked(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  const toggleFollow = (channel) => {
    setFollowed(prev => {
      const newSet = new Set(prev);
      if (newSet.has(channel)) {
        newSet.delete(channel);
      } else {
        newSet.add(channel);
      }
      return newSet;
    });
  };

  const formatCount = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Check out this video!',
        text: videos[currentVideoIndex].description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleDislike = (videoId) => {
    // Remove video from feed or mark as not interested
    console.log('Not interested in video:', videoId);
    // You can implement logic to hide this video or filter it out
  };

  const handleReport = (videoId) => {
    // Handle report action
    console.log('Report video:', videoId);
    alert('Thank you for reporting. We will review this content.');
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  return (
    <div className="video-feed">
      {videos.map((video, index) => (
        <div className="video-container" key={video.id}>
          <VideoPlayer
            video={video}
            isActive={index === currentVideoIndex}
            isLiked={liked.has(video.id)}
            isFollowing={followed.has(video.channel)}
            onLike={() => toggleLike(video.id)}
            onFollow={() => toggleFollow(video.channel)}
            onShare={handleShare}
            formatCount={formatCount}
            onDislike={() => handleDislike(video.id)}
            onReport={() => handleReport(video.id)}
            isMuted={isMuted}
            volume={volume}
            onMuteToggle={handleMuteToggle}
            onVolumeChange={handleVolumeChange}
          />
        </div>
      ))}
    </div>
  );
};

export default VideoFeed;












