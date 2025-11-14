import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchGrowthInsights } from '../api/more';
import './MorePages.css';

const SECTION_LABELS = {
  analytics: 'Analytics',
  insights: 'Insights',
  suggestions: 'Suggestions'
};

const GrowthToolsHub = ({ onClose = () => {} }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [growthData, setGrowthData] = useState(null);

  const activeSection = searchParams.get('section') || 'analytics';

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

  const renderSection = () => {
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
            <i className="fa-solid fa-chart-simple"></i>
            Growth Tools
          </h1>
          <button className="more-page__close" type="button" onClick={handleClose} aria-label="Close Growth Tools">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </header>

        <div className="more-page__toolbar">
          <div className="more-page__toolbar-info">
            <span className="more-page__badge">
              <i className="fa-solid fa-rocket"></i>
              Grow and retain your audience
            </span>
            {loading ? (
              <span className="more-page__toolbar-sync more-page__toolbar-sync--live">
                <i className="fa-solid fa-spinner fa-spin"></i>
                Fetching insights…
              </span>
            ) : (
              <span className="more-page__toolbar-sync">Updated in the last 24 hours</span>
            )}
          </div>
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

