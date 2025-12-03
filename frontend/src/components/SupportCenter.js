import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSupportResources } from '../api/more';
import './MorePages.css';

const SupportCenter = ({ onClose = () => {} }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [support, setSupport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportIssueType, setReportIssueType] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

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
    // Navigate back to More page
    navigate('/more');
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
              onClick={() => setShowReportModal(true)}
            >
              <i className="fa-solid fa-flag"></i>
              Report Issue
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
                      <div 
                        key={channel.id} 
                        className="more-page__list-item"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          if (channel.id === 'report-issue') {
                            alert('Report Issue: Please describe your problem (account issues, monetization, video problems) and our team will help you.');
                          } else {
                            alert(`${channel.title}: ${channel.description || channel.availability}`);
                          }
                        }}
                      >
                        <h3>{channel.title}</h3>
                        <p>{channel.description || channel.availability}</p>
                        {channel.averageResponseMinutes > 0 && (
                          <p className="more-page__stat-label">
                            Avg response time: {Math.round(channel.averageResponseMinutes / 60)} hrs
                          </p>
                        )}
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
                    <div 
                      key={topic.id} 
                      className="more-page__faq-item"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        alert(`${topic.title}\n\nAvailable articles:\n${topic.articles.map((a, i) => `${i + 1}. ${a}`).join('\n')}`);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        {topic.icon && <i className={`fa-solid ${topic.icon}`} style={{ color: '#FF0050' }}></i>}
                        <h4 style={{ margin: 0 }}>{topic.title}</h4>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {topic.articles.map((article, index) => (
                          <span 
                            key={index}
                            className="more-page__tag"
                            style={{
                              padding: '0.25rem 0.75rem',
                              background: 'rgba(255, 0, 80, 0.1)',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              color: '#FF0050',
                              wordBreak: 'break-word',
                              maxWidth: '100%'
                            }}
                          >
                            {article}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Guides Section */}
              {support.quickGuides && support.quickGuides.length > 0 && (
                <div className="more-page__card">
                  <h2>Step-by-step guides</h2>
                  <div className="more-page__list">
                    {support.quickGuides.map((guide) => (
                      <div key={guide.id} className="more-page__list-item">
                        <h3>{guide.title}</h3>
                        <ol style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                          {guide.steps.map((step, index) => (
                            <li key={index} style={{ marginBottom: '0.5rem', color: '#666' }}>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Report Issue Modal */}
      {showReportModal && (
        <div 
          className="more-page__modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowReportModal(false);
            }
          }}
        >
          <div className="more-page__modal" onClick={(e) => e.stopPropagation()}>
            <div className="more-page__modal-header">
              <h2>Report an Issue</h2>
              <button
                className="more-page__modal-close"
                type="button"
                onClick={() => {
                  setShowReportModal(false);
                  setReportIssueType('');
                  setReportDescription('');
                }}
                aria-label="Close"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="more-page__modal-content">
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#0F172A' }}>
                  What issue are you facing?
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { id: 'account', label: 'Account Issues', icon: 'fa-user-shield' },
                    { id: 'monetization', label: 'Monetization Problems', icon: 'fa-dollar-sign' },
                    { id: 'video', label: 'Video Problems', icon: 'fa-video' }
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      className={`more-page__button ${reportIssueType === type.id ? 'more-page__button--primary' : 'more-page__button--ghost'}`}
                      onClick={() => setReportIssueType(type.id)}
                      style={{ 
                        textAlign: 'left', 
                        justifyContent: 'flex-start',
                        width: '100%'
                      }}
                    >
                      <i className={`fa-solid ${type.icon}`} style={{ marginRight: '0.5rem' }}></i>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#0F172A' }}>
                  Please describe your issue:
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Describe your issue in detail. Include any error messages, steps to reproduce, or relevant information..."
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '0.75rem',
                    border: '1px solid #E0F2FE',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  className="more-page__button more-page__button--ghost"
                  type="button"
                  onClick={() => {
                    setShowReportModal(false);
                    setReportIssueType('');
                    setReportDescription('');
                  }}
                  disabled={reportSubmitting}
                >
                  Cancel
                </button>
                <button
                  className="more-page__button more-page__button--primary"
                  type="button"
                  onClick={async () => {
                    if (!reportIssueType || !reportDescription.trim()) {
                      alert('Please select an issue type and provide a description.');
                      return;
                    }

                    setReportSubmitting(true);
                    try {
                      // Simulate API call - in real app, this would call backend
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      
                      alert(`Thank you for reporting!\n\nIssue Type: ${reportIssueType}\n\nYour issue has been logged. Our support team will contact you within 12 hours.`);
                      
                      setShowReportModal(false);
                      setReportIssueType('');
                      setReportDescription('');
                    } catch (error) {
                      console.error('Failed to submit report:', error);
                      alert('Failed to submit report. Please try again.');
                    } finally {
                      setReportSubmitting(false);
                    }
                  }}
                  disabled={reportSubmitting || !reportIssueType || !reportDescription.trim()}
                >
                  {reportSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane"></i>
                      Submit Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportCenter;













