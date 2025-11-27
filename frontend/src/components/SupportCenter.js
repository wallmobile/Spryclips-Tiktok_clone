import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSupportResources } from '../api/more';
import './MorePages.css';

const SupportCenter = ({ onClose = () => {} }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [support, setSupport] = useState(null);

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
        const data = await fetchSupportResources();
        if (!active) return;
        setSupport(data);
        setErrorMessage('');
      } catch (error) {
        console.error('Failed to load support resources', error);
        if (!active) return;
        setErrorMessage('We could not load support resources.');
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

  const handleClose = () => {
    onClose();
    navigate('/profile');
  };

  return (
    <div className="more-page">
      <div className="more-page__container">
        <header className="more-page__header">
          <h1>
            <i className="fa-solid fa-headset"></i>
            Creator Support
          </h1>
          <button className="more-page__close" type="button" onClick={handleClose} aria-label="Close Support Center">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </header>

        <div className="more-page__toolbar">
          <div className="more-page__toolbar-info">
            <span className="more-page__badge">
              <i className="fa-solid fa-clock-rotate-left"></i>
              Average reply time under 12 hours
            </span>
            {loading ? (
              <span className="more-page__toolbar-sync more-page__toolbar-sync--live">
                <i className="fa-solid fa-spinner fa-spin"></i>
                Connecting you with support…
              </span>
            ) : (
              <span className="more-page__toolbar-sync">Latest updates from the support team</span>
            )}
          </div>
          <div className="more-page__toolbar-actions">
            <button
              className="more-page__button more-page__button--primary"
              type="button"
              onClick={() => navigate('/creator-academy')}
            >
              <i className="fa-solid fa-graduation-cap"></i>
              Visit Creator Academy
            </button>
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
                  fetchSupportResources()
                    .then((data) => {
                      setSupport(data);
                      setErrorMessage('');
                    })
                    .catch((error) => {
                      console.error('Retry support fetch failed', error);
                      setErrorMessage('Support service still unavailable. Try again later.');
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

        <main className="more-page__content">
          {loading ? (
            <div className="more-page__empty" role="status">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <p>Loading help resources…</p>
            </div>
          ) : !support ? (
            <div className="more-page__empty">
              <i className="fa-solid fa-headset"></i>
              <p>No support content is available yet.</p>
            </div>
          ) : (
            <>
              <div className="more-page__grid more-page__grid--two">
                <div className="more-page__card">
                  <h2>Contact options</h2>
                  <div className="more-page__list">
                    {support.contactChannels?.map((channel) => (
                      <div key={channel.id} className="more-page__list-item">
                        <h3>{channel.title}</h3>
                        <p>{channel.availability}</p>
                        <p className="more-page__stat-label">
                          Avg response time: {Math.round(channel.averageResponseMinutes / 60)} hrs
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="more-page__card">
                  <h2>Latest updates</h2>
                  <div className="more-page__timeline">
                    {support.recentUpdates?.map((update) => (
                      <div key={update.id} className="more-page__timeline-item">
                        <h3>{update.title}</h3>
                        <p>{update.detail}</p>
                        <p className="more-page__stat-label">
                          {new Date(update.publishedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="more-page__card">
                <h2>Popular help topics</h2>
                <div className="more-page__faq">
                  {support.helpTopics?.map((topic) => (
                    <div key={topic.id} className="more-page__faq-item">
                      <h4>{topic.title}</h4>
                      <p>{topic.articles.join(' • ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default SupportCenter;













