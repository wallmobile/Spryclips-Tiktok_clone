import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatorMonetization from './CreatorMonetization';
import CreatorAnalytics from './CreatorAnalytics';
import EffectsMarketplace from './EffectsMarketplace';
import { getCreatorAnalytics, getCreatorAnalyticsSummary } from '../../api/analytics';
import './CreatorTools.css';

const CreatorTools = ({ onClose }) => {
  const navigate = useNavigate();
  const [showMonetization, setShowMonetization] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showEffects, setShowEffects] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [overview, setOverview] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let active = true;

    const loadStats = async () => {
      setLoadingStats(true);
      setStatsError(null);
      try {
        const [overviewRes, summaryRes] = await Promise.all([
          getCreatorAnalytics(),
          getCreatorAnalyticsSummary(),
        ]);
        if (!active) return;
        setOverview(overviewRes?.overview || null);
        setSummary(summaryRes?.summary || null);
      } catch (err) {
        console.error('Failed to load creator stats:', err);
        if (!active) return;
        
        // Handle timeout errors gracefully - don't show error if it's a timeout
        if (err?.code === 'ECONNABORTED' || err?.response?.status === 408 || err?.message?.includes('timeout')) {
          setStatsError('Analytics data is taking longer than expected. Please try again.');
        } else {
          setStatsError(err?.response?.data?.message || 'Unable to load creator stats right now.');
        }
      } finally {
        if (active) {
          setLoadingStats(false);
        }
      }
    };

    loadStats();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const creatorStats = useMemo(() => {
    if (!overview && !summary) {
      return {
        totalViews: 0,
        totalLikes: 0,
        followers: 0,
        videosPosted: 0,
        earnings: 0,
        totalComments: 0,
        totalShares: 0,
        avgEngagementRate: 0,
        watchTime: 0,
      };
    }

    return {
      totalViews: overview?.totalViews || 0,
      totalLikes: overview?.totalLikes || 0,
      followers: summary?.profile?.followers || 0,
      videosPosted: summary?.profile?.totalVideos || overview?.totalVideos || 0,
      earnings: overview?.estimatedEarnings || 0,
      totalComments: overview?.totalComments || 0,
      totalShares: overview?.totalShares || 0,
      avgEngagementRate: overview?.averageEngagementRate || 0,
      watchTime: overview?.totalWatchTime || 0,
    };
  }, [overview, summary]);

  const creatorSections = [
    {
      id: 'studio',
      title: 'TikTok Studio',
      description: 'Manage your content, analytics, and audience insights',
      icon: 'fa-solid fa-video',
      color: 'gradient-primary',
      stats: `${creatorStats.videosPosted} Videos`,
      featured: true
    },
    {
      id: 'promote',
      title: 'Promote Videos',
      description: 'Boost your content reach with targeted promotion',
      icon: 'fa-solid fa-bullhorn',
      color: 'gradient-secondary',
      stats: 'Boost Performance'
    },
    {
      id: 'insights',
      title: 'Video Insights',
      description: 'Deep analytics and performance metrics',
      icon: 'fa-solid fa-chart-line',
      color: 'gradient-tertiary',
      stats: `${(creatorStats.totalViews / 1000000).toFixed(1)}M Views`
    },
    {
      id: 'live',
      title: 'Live Center',
      description: 'Start live streams and manage live content',
      icon: 'fa-solid fa-broadcast-tower',
      color: 'gradient-quaternary',
      stats: 'Go Live Now'
    },
    {
      id: 'fund',
      title: 'Creator Fund',
      description: 'Monetize your content and track earnings',
      icon: 'fa-solid fa-dollar-sign',
      color: 'gradient-quinary',
      stats: `$${creatorStats.earnings.toFixed(2)}`
    },
    {
      id: 'effects',
      title: 'Effect House',
      description: 'Create and publish custom AR effects',
      icon: 'fa-solid fa-magic-wand-sparkles',
      color: 'gradient-primary',
      stats: 'Create Effects'
    }
  ];

  const quickActions = [
    { id: 'upload', title: 'Upload Video', icon: 'fa-solid fa-plus', action: 'upload' },
    { id: 'schedule', title: 'Schedule Post', icon: 'fa-solid fa-calendar', action: 'schedule' },
    { id: 'drafts', title: 'View Drafts', icon: 'fa-solid fa-file-lines', action: 'drafts' },
    { id: 'analytics', title: 'Quick Analytics', icon: 'fa-solid fa-chart-simple', action: 'analytics' }
  ];

  const handleSectionClick = (sectionId) => {
    switch (sectionId) {
      case 'studio':
        onClose();
        navigate('/more/studio', { state: { from: 'creator-tools' } });
        break;
      case 'promote':
        // Navigate to upload page with promote mode
        onClose();
        navigate('/upload?mode=promote', { state: { from: 'creator-tools' } });
        break;
      case 'insights':
        setShowAnalytics(true);
        break;
      case 'live':
        onClose();
        navigate('/live', { state: { from: 'creator-tools' } });
        break;
      case 'fund':
        setShowMonetization(true);
        break;
      case 'effects':
        setShowEffects(true);
        break;
      default:
        break;
    }
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case 'upload':
        onClose();
        navigate('/upload', { state: { from: 'creator-tools' } });
        break;
      case 'schedule':
        // Navigate to upload page with schedule mode
        onClose();
        navigate('/upload?mode=schedule', { state: { from: 'creator-tools' } });
        break;
      case 'drafts':
        // Navigate to upload page with drafts view
        onClose();
        navigate('/upload?view=drafts', { state: { from: 'creator-tools' } });
        break;
      case 'analytics':
        setShowAnalytics(true);
        break;
      default:
        break;
    }
  };

  return (
    <div className="creator-tools-overlay" onClick={onClose} role="presentation">
      <div
        className="creator-tools-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="creator-tools-title"
      >
        {/* Header */}
        <div className="creator-tools-header">
          <button className="creator-tools-close-btn" onClick={onClose} aria-label="Close creator tools dialog">
            <i className="fa-solid fa-x" aria-hidden="true"></i>
          </button>
          <h2 id="creator-tools-title">Creator Tools</h2>
          <div className="creator-tools-header-placeholder" aria-hidden="true"></div>
        </div>

        {/* Full Page Scrollable Content */}
        <div className="creator-tools-content">
          {/* Creator Stats Overview */}
          <div className="creator-stats-overview">
            {loadingStats ? (
              <div className="stats-card stats-loading" role="status" aria-live="polite">
                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                <span>Loading creator stats...</span>
              </div>
            ) : statsError ? (
              <div className="stats-card stats-error" role="alert">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                <span>{statsError}</span>
              </div>
            ) : (
              <div className="stats-card">
                <div className="stat-item">
                  <span className="stat-number">{(creatorStats.totalViews / 1000000).toFixed(1)}M</span>
                  <span className="stat-label">Total Views</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{(creatorStats.totalLikes / 1000).toFixed(1)}K</span>
                  <span className="stat-label">Total Likes</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{(creatorStats.followers / 1000).toFixed(1)}K</span>
                  <span className="stat-label">Followers</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">
                    {creatorStats.earnings ? `$${creatorStats.earnings.toFixed(0)}` : '$0'}
                  </span>
                  <span className="stat-label">Earnings (est.)</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="quick-actions-section">
            <h3>Quick Actions</h3>
            <div className="quick-actions-grid">
              {quickActions.map(action => (
                <button
                  key={action.id}
                  className="quick-action-btn"
                  onClick={() => handleQuickAction(action.action)}
                  aria-label={action.title}
                >
                  <i className={action.icon} aria-hidden="true"></i>
                  <span>{action.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Creator Tools Grid */}
          <div className="creator-tools-grid">
            {creatorSections.map(section => (
              <button
                key={section.id}
                className={`creator-tool-card ${section.color} ${section.featured ? 'featured' : ''}`}                                                          
                onClick={() => handleSectionClick(section.id)}
                type="button"
                aria-label={`Open ${section.title}`}
              >
                <div className="tool-card-header">
                  <div className="tool-icon">
                    <i className={section.icon} aria-hidden="true"></i>
                  </div>
                  <div className="tool-stats">
                    {section.stats}
                  </div>
                </div>
                <div className="tool-card-content">
                  <h4>{section.title}</h4>
                  <p>{section.description}</p>
                </div>
                <div className="tool-card-footer">
                  <span className="open-tool">
                    Open <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                  </span>
                </div>
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Creator Monetization Modal */}
      {showMonetization && (
        <CreatorMonetization 
          onClose={() => {
            setShowMonetization(false);
            // Keep CreatorTools open when closing Monetization
          }} 
        />
      )}

      {/* Creator Analytics Modal */}
      {showAnalytics && (
        <CreatorAnalytics 
          onClose={() => {
            setShowAnalytics(false);
            // Keep CreatorTools open when closing Analytics
          }} 
        />
      )}


      {/* Effects Marketplace Modal */}
      {showEffects && (
        <EffectsMarketplace 
          onClose={() => {
            setShowEffects(false);
            // Keep CreatorTools open when closing Effects
          }} 
        />
      )}
    </div>
  );
};

export default CreatorTools;














