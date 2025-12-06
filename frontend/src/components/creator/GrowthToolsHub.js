import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchGrowthInsights } from '../../api/more';
import '../common/MorePages.css';

const SECTION_LABELS = {
  analytics: 'Analytics',
  insights: 'Insights',
  suggestions: 'Suggestions'
};

const BUSINESS_SECTION_LABELS = {
  'business-suite': 'Business Suite',
  'ad-manager': 'Ad Manager',
  'promo-codes': 'Promotional Codes',
  'partnerships': 'Brand Partnerships',
  'analytics': 'Business Analytics'
};

const GrowthToolsHub = ({ onClose = () => {} }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [growthData, setGrowthData] = useState(null);

  const activeSection = searchParams.get('section') || 'analytics';
  const isBusinessSection = activeSection.startsWith('business-') || 
                             activeSection === 'ad-manager' || 
                             activeSection === 'promo-codes' || 
                             activeSection === 'partnerships' ||
                             (activeSection === 'analytics' && searchParams.get('type') === 'business');

  useEffect(() => {
    window.dispatchEvent(new Event('sidebar:close'));
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.classList.add('page-open');
    }
    return () => {
      if (sidebar) {
        sidebar.classList.remove('page-open');
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchGrowthInsights();
        if (!active) return;
        setGrowthData(data);
        setErrorMessage('');
      } catch (error) {
        console.error('Failed to load growth insights', error);
        if (!active) return;
        setErrorMessage('We could not fetch growth insights right now.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const analyticsCards = useMemo(() => {
    if (!growthData?.analytics) {
      return [];
    }
    const { followerGain, averageViewDurationSeconds, hashtagsPerforming } = growthData.analytics;
    return [
      {
        id: 'followers',
        title: 'New followers',
        content: `${followerGain.weekly} this week • ${followerGain.monthly} this month`,
        footer: `Growth rate ${followerGain.growthRate}%`
      },
      {
        id: 'watch-time',
        title: 'Average view duration',
        content: `${averageViewDurationSeconds}s per view`,
        footer: 'Aim for 35+ seconds to boost retention'
      },
      {
        id: 'hashtags',
        title: 'Top hashtags',
        content: hashtagsPerforming.join(', '),
        footer: 'Use one trending + one branded hashtag'
      }
    ];
  }, [growthData]);

  const handleClose = () => {
    onClose();
    // Navigate back to More page
    navigate('/more');
  };

  const setSection = (section) => {
    setSearchParams({ section });
  };

  const renderBusinessSection = () => {
    if (activeSection === 'business-suite') {
      return (
        <div className="more-page__grid more-page__grid--two">
          <div className="more-page__card">
            <h2>Business Dashboard</h2>
            <p>Complete overview of your business performance, content management, and audience insights.</p>
            <p className="more-page__stat-label">Manage all aspects of your business in one place</p>
          </div>
          <div className="more-page__card">
            <h2>Content Management</h2>
            <p>Schedule posts, manage drafts, and track content performance across all your videos.</p>
            <p className="more-page__stat-label">Optimize your content strategy</p>
          </div>
        </div>
      );
    }

    if (activeSection === 'ad-manager') {
      return (
        <div className="more-page__grid more-page__grid--two">
          <div className="more-page__card">
            <h2>Create Campaign</h2>
            <p>Set up targeted advertising campaigns to reach your ideal audience and boost engagement.</p>
            <p className="more-page__stat-label">Start a new campaign</p>
          </div>
          <div className="more-page__card">
            <h2>Campaign Performance</h2>
            <p>Track impressions, clicks, conversions, and ROI for all your active campaigns.</p>
            <p className="more-page__stat-label">Monitor and optimize performance</p>
          </div>
        </div>
      );
    }

    if (activeSection === 'promo-codes') {
      return (
        <div className="more-page__list">
          <div className="more-page__list-item">
            <h3>Create Promotional Code</h3>
            <p>Generate discount codes for your products or services. Track usage and redemption rates.</p>
            <button
              type="button"
              className="more-page__button more-page__button--primary"
              onClick={() => navigate('/more/shop')}
            >
              <i className="fa-solid fa-plus"></i>
              Create Code
            </button>
          </div>
          <div className="more-page__list-item">
            <h3>Active Codes</h3>
            <p>Manage existing promotional codes, view analytics, and deactivate codes when needed.</p>
          </div>
        </div>
      );
    }

    if (activeSection === 'partnerships') {
      return (
        <div className="more-page__list">
          <div className="more-page__list-item">
            <h3>Brand Collaborations</h3>
            <p>Connect with brands, manage partnership proposals, and track collaboration performance.</p>
            <button
              type="button"
              className="more-page__button more-page__button--primary"
              onClick={() => navigate('/more')}
            >
              <i className="fa-solid fa-handshake"></i>
              Explore Partnerships
            </button>
          </div>
          <div className="more-page__list-item">
            <h3>Active Partnerships</h3>
            <p>View and manage your current brand partnerships and collaborations.</p>
          </div>
        </div>
      );
    }

    if (activeSection === 'analytics' && isBusinessSection) {
      return (
        <div className="more-page__grid more-page__grid--three">
          <div className="more-page__card">
            <h2>Business Reach</h2>
            <p>Track total reach, impressions, and audience growth for your business account.</p>
            <p className="more-page__stat-label">Monitor business metrics</p>
          </div>
          <div className="more-page__card">
            <h2>Conversion Tracking</h2>
            <p>Measure conversions, click-through rates, and ROI from your business content.</p>
            <p className="more-page__stat-label">Optimize conversion rates</p>
          </div>
          <div className="more-page__card">
            <h2>Audience Demographics</h2>
            <p>Understand your business audience demographics and preferences.</p>
            <p className="more-page__stat-label">Target the right audience</p>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderSection = () => {
    if (isBusinessSection) {
      return renderBusinessSection();
    }

    if (loading) {
      return (
        <div className="more-page__empty" role="status">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <p>Loading growth recommendations…</p>
        </div>
      );
    }

    if (!growthData) {
      return (
        <div className="more-page__empty">
          <i className="fa-solid fa-chart-simple"></i>
          <p>No growth data yet. Publish consistently to unlock insights.</p>
        </div>
      );
    }

    if (activeSection === 'analytics') {
      const { analytics } = growthData;
      return (
        <>
          <div className="more-page__grid more-page__grid--three">
            {analyticsCards.map((card) => (
              <div key={card.id} className="more-page__card">
                <h2>{card.title}</h2>
                <p>{card.content}</p>
                <p className="more-page__stat-label">{card.footer}</p>
              </div>
            ))}
          </div>

          {/* Additional Analytics Cards */}
          <div className="more-page__grid more-page__grid--two" style={{ marginTop: '1.5rem' }}>
            <div className="more-page__card">
              <h2>Total Performance</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Total Views</span>
                  <strong style={{ fontSize: '1.25rem', color: '#FF0050' }}>
                    {analytics?.totalViews?.toLocaleString() || '0'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Total Likes</span>
                  <strong style={{ fontSize: '1.25rem', color: '#FF0050' }}>
                    {analytics?.totalLikes?.toLocaleString() || '0'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Total Comments</span>
                  <strong style={{ fontSize: '1.25rem', color: '#FF0050' }}>
                    {analytics?.totalComments?.toLocaleString() || '0'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Total Shares</span>
                  <strong style={{ fontSize: '1.25rem', color: '#FF0050' }}>
                    {analytics?.totalShares?.toLocaleString() || '0'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                  <span>Videos Published</span>
                  <strong style={{ fontSize: '1.25rem', color: '#FF0050' }}>
                    {analytics?.videoCount || '0'}
                  </strong>
                </div>
              </div>
            </div>

            <div className="more-page__card">
              <h2>Top Performing Videos</h2>
              {analytics?.topVideos && analytics.topVideos.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                  {analytics.topVideos.slice(0, 5).map((video, index) => (
                    <div key={video.id} style={{ padding: '0.75rem', background: 'rgba(255, 0, 80, 0.05)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                        <strong style={{ fontSize: '0.9rem' }}>#{index + 1} {video.title}</strong>
                        <span style={{ fontSize: '0.85rem', color: '#666' }}>{video.engagementRate}% engagement</span>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#666' }}>
                        <span>👁️ {video.views.toLocaleString()}</span>
                        <span>❤️ {video.likes.toLocaleString()}</span>
                        <span>💬 {video.comments.toLocaleString()}</span>
                        <span>📤 {video.shares.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ marginTop: '1rem', color: '#666' }}>No videos yet. Start creating to see your top performers!</p>
              )}
            </div>
          </div>
        </>
      );
    }

    if (activeSection === 'insights') {
      const insights = growthData.insights || [];
      const audienceData = growthData.audienceInsights || {
        topCountries: [],
        ageGroups: [],
        activeHours: [],
        contentPreferences: []
      };

      return (
        <>
          {/* Audience Insights Cards */}
          <div className="more-page__grid more-page__grid--two" style={{ marginBottom: '1.5rem' }}>
            <div className="more-page__card">
              <h2>🌍 Top Countries</h2>
              {audienceData.topCountries && audienceData.topCountries.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                  {audienceData.topCountries.map((country, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{country.flag} {country.country}</span>
                      <strong style={{ color: '#FF0050' }}>{country.percentage}%</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ marginTop: '1rem', color: '#666' }}>No audience data available yet.</p>
              )}
            </div>

            <div className="more-page__card">
              <h2>👥 Age Groups</h2>
              {audienceData.ageGroups && audienceData.ageGroups.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                  {audienceData.ageGroups.map((age, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{age.range} years</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '60%' }}>
                        <div style={{ flex: 1, height: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${age.percentage}%`, height: '100%', background: '#FF0050', borderRadius: '4px' }}></div>
                        </div>
                        <strong style={{ color: '#FF0050', minWidth: '40px', textAlign: 'right' }}>{age.percentage}%</strong>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ marginTop: '1rem', color: '#666' }}>No age data available yet.</p>
              )}
            </div>
          </div>

          <div className="more-page__grid more-page__grid--two" style={{ marginBottom: '1.5rem' }}>
            <div className="more-page__card">
              <h2>⏰ Active Hours</h2>
              {audienceData.activeHours && audienceData.activeHours.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                  {audienceData.activeHours.map((hour, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{hour.label}</strong>
                        <span style={{ fontSize: '0.85rem', color: '#666', marginLeft: '0.5rem' }}>{hour.hour}</span>
                      </div>
                      <strong style={{ color: '#FF0050' }}>{hour.percentage}%</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ marginTop: '1rem', color: '#666' }}>No active time data available yet.</p>
              )}
            </div>

            <div className="more-page__card">
              <h2>🎯 Content Preferences</h2>
              {audienceData.contentPreferences && audienceData.contentPreferences.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                  {audienceData.contentPreferences.map((pref, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{pref.type}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '60%' }}>
                        <div style={{ flex: 1, height: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pref.percentage}%`, height: '100%', background: '#FF0050', borderRadius: '4px' }}></div>
                        </div>
                        <strong style={{ color: '#FF0050', minWidth: '40px', textAlign: 'right' }}>{pref.percentage}%</strong>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ marginTop: '1rem', color: '#666' }}>No preference data available yet.</p>
              )}
            </div>
          </div>

          {/* Insights List */}
          <div className="more-page__card">
            <h2>💡 Key Insights</h2>
            <div className="more-page__list" style={{ marginTop: '1rem' }}>
              {insights.map((item) => (
                <div key={item.id} className="more-page__list-item">
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      );
    }

    if (activeSection === 'suggestions') {
      const suggestions = growthData.suggestions || [];
      const priorityColors = {
        high: '#FF0050',
        medium: '#FF6B9D',
        low: '#FFB3D1'
      };

      return (
        <div className="more-page__list">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="more-page__list-item" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                <div style={{ 
                  minWidth: '4px', 
                  width: '4px', 
                  height: '100%', 
                  background: priorityColors[suggestion.priority] || '#FF0050',
                  borderRadius: '2px',
                  position: 'absolute',
                  left: 0,
                  top: 0
                }}></div>
                <div style={{ flex: 1, marginLeft: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0 }}>{suggestion.title}</h3>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      padding: '0.25rem 0.5rem', 
                      background: priorityColors[suggestion.priority] || '#FF0050',
                      color: 'white',
                      borderRadius: '12px',
                      textTransform: 'uppercase',
                      fontWeight: '600'
                    }}>
                      {suggestion.priority}
                    </span>
                    {suggestion.category && (
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.25rem 0.5rem', 
                        background: 'rgba(0,0,0,0.05)',
                        borderRadius: '12px',
                        color: '#666'
                      }}>
                        {suggestion.category}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, color: '#666', lineHeight: '1.6' }}>{suggestion.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="more-page">
      <div className="more-page__container">
        <header className="more-page__header">
          <h1>
            <i className={isBusinessSection ? 'fa-solid fa-briefcase' : 'fa-solid fa-chart-simple'}></i>
            {isBusinessSection ? BUSINESS_SECTION_LABELS[activeSection] || 'Business Tools' : 'Growth Tools'}
          </h1>
          <button className="more-page__close" type="button" onClick={handleClose} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </header>

        <div className="more-page__toolbar">
          <div className="more-page__toolbar-info">
            <span className="more-page__badge">
              <i className={isBusinessSection ? 'fa-solid fa-briefcase' : 'fa-solid fa-rocket'}></i>
              {isBusinessSection ? 'Manage your business' : 'Grow and retain your audience'}
            </span>
            {!isBusinessSection && (loading ? (
              <span className="more-page__toolbar-sync more-page__toolbar-sync--live">
                <i className="fa-solid fa-spinner fa-spin"></i>
                Fetching insights…
              </span>
            ) : (
              <span className="more-page__toolbar-sync">Updated in the last 24 hours</span>
            ))}
          </div>
          {!isBusinessSection && (
            <div className="more-page__toolbar-actions">
              <div className="more-page__tabs">
                {Object.entries(SECTION_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`more-page__tab ${activeSection === key ? 'more-page__tab--active' : ''}`}
                    onClick={() => setSection(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="more-page__banner more-page__banner--warning" role="status">
            <div className="more-page__banner-content">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{errorMessage}</span>
            </div>
            <div className="more-page__banner-actions">
              <button
                className="more-page__button more-page__button--ghost"
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setLoading(true);
                  fetchGrowthInsights()
                    .then((data) => {
                      setGrowthData(data);
                      setErrorMessage('');
                    })
                    .catch((error) => {
                      console.error('Retry growth insights failed', error);
                      setErrorMessage('Growth insights service still unavailable. Try later.');
                    })
                    .finally(() => setLoading(false));
                }}
              >
                <i className="fa-solid fa-rotate"></i>
                Retry
              </button>
            </div>
          </div>
        )}

        <main className="more-page__content">{renderSection()}</main>
      </div>
    </div>
  );
};

export default GrowthToolsHub;

