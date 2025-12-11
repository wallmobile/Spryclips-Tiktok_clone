import React, { useEffect, useMemo, useState } from 'react';
import {
  getHashtagDetails,
  getHashtagVideos,
  getTrendingChallenges,
} from '../../api/hashtags';
import './HashtagPage.css';

const HashtagPage = ({ hashtag, onClose }) => {
  const [hashtagVideos, setHashtagVideos] = useState([]);
  const [hashtagInfo, setHashtagInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('videos'); // 'videos' or 'challenge'
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hashtag) return;

    const loadDetails = async () => {
      setLoadingDetails(true);
      setError(null);
      try {
        const response = await getHashtagDetails(hashtag);
        const info = response?.hashtag || response;
        if (info) {
          setHashtagInfo({
            name: info.name || info.tag || hashtag,
            videoCount: info.videoCount ?? info.videos ?? 0,
            totalViews: info.viewCount ?? info.views ?? 0,
            totalLikes: info.likeCount ?? info.likes ?? 0,
            challenge: info.challenge || null,
          });
        } else {
          setHashtagInfo({
            name: hashtag,
            videoCount: 0,
            totalViews: 0,
            totalLikes: 0,
            challenge: null,
          });
        }
      } catch (err) {
        console.error('Error loading hashtag details:', err);
        setError('Unable to load hashtag details.');
        setHashtagInfo({
          name: hashtag,
          videoCount: 0,
          totalViews: 0,
          totalLikes: 0,
          challenge: null,
        });
      } finally {
        setLoadingDetails(false);
      }
    };

    const loadVideos = async () => {
      setLoadingVideos(true);
      try {
        const response = await getHashtagVideos(hashtag, { limit: 24, sort: 'trending' });
        const list = Array.isArray(response?.videos)
          ? response.videos
          : Array.isArray(response)
            ? response
            : response?.data || [];
        setHashtagVideos(list.map(normalizeVideo).filter(Boolean));
      } catch (err) {
        console.error('Error loading hashtag videos:', err);
        setHashtagVideos([]);
      } finally {
        setLoadingVideos(false);
      }
    };

    loadDetails();
    loadVideos();
  }, [hashtag]);

  useEffect(() => {
    const loadChallenge = async () => {
      if (!hashtagInfo || hashtagInfo.challenge || activeTab !== 'challenge') return;
      setLoadingChallenge(true);
      try {
        const response = await getTrendingChallenges(50);
        const challenges = Array.isArray(response?.challenges)
          ? response.challenges
          : Array.isArray(response)
            ? response
            : [];
        const match = challenges.find((challenge) => {
          const normalized = (challenge.primaryHashtag || challenge.hashtag || '').replace(/^#/, '').toLowerCase();
          return normalized === hashtag.toLowerCase();
        });
        if (match) {
          setHashtagInfo((prev) => ({
            ...(prev || { name: hashtag }),
            challenge: {
              name: match.name,
              description: match.description,
              participants: match.participants ?? match.participantCount ?? 0,
              totalViews: match.viewCount ?? match.views ?? 0,
            },
          }));
        }
      } catch (err) {
        console.error('Error loading hashtag challenge:', err);
      } finally {
        setLoadingChallenge(false);
      }
    };

    loadChallenge();
  }, [activeTab, hashtag, hashtagInfo]);

  const normalizeVideo = (video) => {
    if (!video) return null;
    const stats = video.stats || {};
    return {
      id: video._id || video.id,
      src: video.transcoded?.url || video.url || video.playbackUrl || '',
      thumbnail:
        video.thumbnail ||
        video.coverImage ||
        video.previewUrl ||
        video?.assets?.thumbnail ||
        '',
      profileImg:
        video.creator?.profile?.avatar ||
        video.owner?.profile?.avatar ||
        video.avatar ||
        'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png',
      username: video.creator?.username || video.owner?.username || video.username || 'creator',
      description: video.description || video.caption || '',
      likes: stats.likes ?? video.likes ?? 0,
      comments: stats.comments ?? video.comments ?? 0,
    };
  };

  const formatCount = (count) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const currentHashtagInfo = useMemo(() => {
    if (loadingDetails && !hashtagInfo) return null;
    return (
      hashtagInfo || {
        name: hashtag,
        videoCount: 0,
        totalViews: 0,
        totalLikes: 0,
        challenge: null,
      }
    );
  }, [hashtagInfo, loadingDetails, hashtag]);

  return (
    <div className="hashtag-page-overlay" onClick={onClose}>
      <div className="hashtag-page-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="hashtag-page-header">
          <button className="hashtag-page-close-btn" onClick={onClose}>
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h2>#{hashtag}</h2>
          <div className="hashtag-header-placeholder"></div>
        </div>

        {/* Hashtag Info */}
        <div className="hashtag-info-section">
          {loadingDetails && !currentHashtagInfo ? (
            <div className="hashtag-loading">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <p>Loading hashtag stats...</p>
            </div>
          ) : (
            <div className="hashtag-stats">
              <div className="stat-item">
                <span className="stat-number">{formatCount(currentHashtagInfo.videoCount)}</span>
                <span className="stat-label">Videos</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{formatCount(currentHashtagInfo.totalViews)}</span>
                <span className="stat-label">Views</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{formatCount(currentHashtagInfo.totalLikes)}</span>
                <span className="stat-label">Likes</span>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="hashtag-tabs">
          <button
            className={`hashtag-tab ${activeTab === 'videos' ? 'active' : ''}`}
            onClick={() => setActiveTab('videos')}
          >
            <i className="fa-solid fa-video"></i>
            <span>Videos</span>
          </button>
          <button
            className={`hashtag-tab ${activeTab === 'challenge' ? 'active' : ''}`}
            onClick={() => setActiveTab('challenge')}
          >
            <i className="fa-solid fa-trophy"></i>
            <span>Challenge</span>
          </button>
        </div>

        {/* Content */}
        <div className="hashtag-content">
          {activeTab === 'videos' ? (
            <div className="hashtag-videos-grid">
              {loadingVideos ? (
                <div className="hashtag-loading">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <p>Loading videos...</p>
                </div>
              ) : hashtagVideos.length > 0 ? (
                hashtagVideos.map((video) => (
                  <div key={video.id} className="hashtag-video-card">
                    <div className="hashtag-video-thumbnail">
                      {video.thumbnail ? (
                        <img src={video.thumbnail} alt={video.username} />
                      ) : video.src ? (
                        <video
                          src={video.src}
                          muted
                          playsInline
                          onMouseEnter={(e) => e.target.play()}
                          onMouseLeave={(e) => {
                            e.target.pause();
                            e.target.currentTime = 0;
                          }}
                        />
                      ) : (
                        <div className="hashtag-video-placeholder">
                          <i className="fa-solid fa-video"></i>
                        </div>
                      )}
                      <div className="hashtag-video-overlay">
                        <div className="hashtag-engagement">
                          <span><i className="fa-solid fa-heart"></i> {formatCount(video.likes || 0)}</span>
                          <span><i className="fa-solid fa-comment"></i> {formatCount(video.comments || 0)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="hashtag-video-info">
                      <div className="hashtag-video-creator">
                        <img src={video.profileImg} alt={video.username} />
                        <span>@{video.username}</span>
                      </div>
                      <p className="hashtag-video-description">{video.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-hashtag">
                  <i className="fa-solid fa-hashtag"></i>
                  <p>No videos found for #{hashtag}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="hashtag-challenge-section">
              {loadingChallenge && !currentHashtagInfo?.challenge ? (
                <div className="hashtag-loading">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <p>Checking for challenges...</p>
                </div>
              ) : currentHashtagInfo?.challenge ? (
                <div className="challenge-card">
                  <div className="challenge-header">
                    <h3>{currentHashtagInfo.challenge.name}</h3>
                    <span className="challenge-badge">Active</span>
                  </div>
                  <p className="challenge-description">{currentHashtagInfo.challenge.description}</p>
                  <div className="challenge-stats">
                    <span>{formatCount(currentHashtagInfo.challenge.participants)} participants</span>
                    <span>{formatCount(currentHashtagInfo.challenge.totalViews)} total views</span>
                  </div>
                  <button className="join-challenge-btn">
                    <i className="fa-solid fa-plus"></i>
                    Join Challenge
                  </button>
                </div>
              ) : (
                <div className="no-challenge">
                  <i className="fa-solid fa-trophy"></i>
                  <p>No active challenge for this hashtag</p>
                  <button className="create-challenge-btn">
                    Create Challenge
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HashtagPage;
