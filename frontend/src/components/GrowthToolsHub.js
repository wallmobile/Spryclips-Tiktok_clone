import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchGrowthInsights } from '../api/more';
import './MorePages.css';

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
      return (
        <div className="more-page__grid more-page__grid--three">
          {analyticsCards.map((card) => (
            <div key={card.id} className="more-page__card">
              <h2>{card.title}</h2>
              <p>{card.content}</p>
              <p className="more-page__stat-label">{card.footer}</p>
            </div>
          ))}
        </div>
      );
    }

    if (activeSection === 'insights') {
      return (
        <div className="more-page__list">
          {growthData.insights?.map((item) => (
            <div key={item.id} className="more-page__list-item">
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      );
    }

    if (activeSection === 'suggestions') {
      return (
        <div className="more-page__list">
          {growthData.suggestions?.map((suggestion) => (
            <div key={suggestion.id} className="more-page__list-item">
              <h3>{suggestion.title}</h3>
              <p>{suggestion.description}</p>
              <button
                type="button"
                className="more-page__button more-page__button--primary"
                onClick={() => navigate('/creator-academy')}
              >
                <i className="fa-solid fa-arrow-up-right-from-square"></i>
                View playbook
              </button>
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

