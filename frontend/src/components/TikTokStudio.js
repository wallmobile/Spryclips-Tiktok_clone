import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStudioSummary } from '../api/more';
import './MorePages.css';

const TikTokStudio = ({ onClose = () => {} }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [summary, setSummary] = useState(null);

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
        const data = await fetchStudioSummary();
        if (!active) return;
        setSummary(data);
        setErrorMessage('');
      } catch (error) {
        console.error('Failed to load studio summary', error);
        if (!active) return;
        setErrorMessage('We could not fetch your studio performance right now.');
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

  const trendTotals = useMemo(() => {
    if (!summary?.performanceTrend) return { totalViews: 0, avgEngagement: 0 };
    const views = summary.performanceTrend.reduce((acc, day) => acc + (day.views || 0), 0);
    const engagement =
      summary.performanceTrend.length > 0
        ? summary.performanceTrend.reduce((acc, day) => acc + (day.engagementRate || 0), 0) /
          summary.performanceTrend.length
        : 0;
    return {
      totalViews: views,
      avgEngagement: Number.parseFloat(engagement.toFixed(1))
    };
  }, [summary]);

  const handleClose = () => {
    onClose();
    navigate('/profile');
  };

  return (
    <div className="more-page">
      <div className="more-page__container">
        <header className="more-page__header">
          <h1>
            <i className="fa-solid fa-chart-line"></i>
            Creator Studio
          </h1>
          <button className="more-page__close" type="button" onClick={handleClose} aria-label="Close Creator Studio">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </header>

        <div className="more-page__toolbar">
          <div className="more-page__toolbar-info">
            <span className="more-page__badge">
              <i className="fa-solid fa-calendar-week"></i>
              {trendTotals.totalViews.toLocaleString()} weekly views
            </span>
            <span className="more-page__badge">
              Avg engagement {trendTotals.avgEngagement}%
            </span>
            {loading ? (
              <span className="more-page__toolbar-sync more-page__toolbar-sync--live">
                <i className="fa-solid fa-spinner fa-spin"></i>
                Syncing studio insights…
              </span>
            ) : (
              <span className="more-page__toolbar-sync">Updated moments ago</span>
            )}
          </div>
          <div className="more-page__toolbar-actions">
            <button
              className="more-page__button more-page__button--ghost"
              type="button"
              onClick={() => navigate('/live')}
            >
              <i className="fa-solid fa-video"></i>
              Schedule live
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
                  fetchStudioSummary()
                    .then((data) => {
                      setSummary(data);
                      setErrorMessage('');
                    })
                    .catch((error) => {
                      console.error('Failed to refetch studio summary', error);
                      setErrorMessage('We still cannot reach the studio service. Try again shortly.');
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
              <p>Loading Creator Studio insights…</p>
            </div>
          ) : !summary ? (
            <div className="more-page__empty">
              <i className="fa-solid fa-box-open"></i>
              <p>No analytics available yet. Start posting to see performance insights.</p>
            </div>
          ) : (
            <>
              <div className="more-page__grid more-page__grid--three">
                <div className="more-page__card">
                  <h2>Channel overview</h2>
                  <div className="more-page__stat">
                    <span className="more-page__stat-label">Lifetime views</span>
                    <span className="more-page__stat-value">
                      {summary.overview?.totalViews?.toLocaleString() ?? '0'}
                    </span>
                  </div>
                  <div className="more-page__stat">
                    <span className="more-page__stat-label">Followers</span>
                    <span className="more-page__stat-value">
                      {summary.overview?.totalFollowers?.toLocaleString() ?? '0'}
                    </span>
                  </div>
                  <div className="more-page__stat">
                    <span className="more-page__stat-label">Estimated earnings</span>
                    <span className="more-page__stat-value">
                      ${summary.overview?.estimatedEarnings?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="more-page__card">
                  <h2>Live performance</h2>
                  <p>
                    You have hosted{' '}
                    <strong>{summary.overview?.liveSessionsHosted ?? 0}</strong> live sessions. Your audience spends an
                    average of{' '}
                    <strong>
                      {summary.overview?.totalWatchTimeMinutes
                        ? Math.round(summary.overview.totalWatchTimeMinutes / 60)
                        : 0}
                    </strong>{' '}
                    hours watching your live content.
                  </p>
                  <div className="more-page__timeline">
                    {summary.streamSchedule?.slice(0, 3).map((session) => (
                      <div key={session.id} className="more-page__timeline-item">
                        <h4>{session.title}</h4>
                        <p>
                          {new Date(session.scheduledFor).toLocaleString(undefined, {
                            weekday: 'short',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}{' '}
                          • {session.status === 'upcoming' ? 'Upcoming' : 'Completed'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="more-page__card">
                  <h2>Next best actions</h2>
                  <div className="more-page__list">
                    {summary.actionableInsights?.map((item) => (
                      <div key={item.id} className="more-page__list-item">
                        <span className="more-page__badge" data-priority={item.priority}>
                          <i className="fa-solid fa-lightbulb"></i>
                          {item.priority === 'high' ? 'High impact' : 'Insight'}
                        </span>
                        <h3>{item.title}</h3>
                        <p>{item.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="more-page__card">
                <h2>Top performing videos</h2>
                <div className="more-page__cards-row">
                  {summary.topVideos?.map((video) => (
                    <div key={video.id} className="more-page__list-item">
                      <h3>{video.title}</h3>
                      <div className="more-page__tag-list">
                        <span className="more-page__tag">
                          <i className="fa-solid fa-eye"></i>{' '}
                          {video.views.toLocaleString()} views
                        </span>
                        <span className="more-page__tag">
                          <i className="fa-solid fa-heart"></i>{' '}
                          {video.likes.toLocaleString()} likes
                        </span>
                        <span className="more-page__tag">
                          <i className="fa-solid fa-comment"></i>{' '}
                          {video.comments.toLocaleString()} comments
                        </span>
                        <span className="more-page__tag">
                          <i className="fa-solid fa-retweet"></i>{' '}
                          {video.shares.toLocaleString()} shares
                        </span>
                      </div>
                      <p>Completion rate: {video.completionRate}%</p>
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

export default TikTokStudio;

