import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchEffectsToolbox } from '../api/more';
import './MorePages.css';

const EffectsLab = ({ onClose = () => {} }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [toolbox, setToolbox] = useState(null);
  const [activeDifficulty, setActiveDifficulty] = useState('all');

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
        const data = await fetchEffectsToolbox();
        if (!active) return;
        setToolbox(data);
        setErrorMessage('');
      } catch (error) {
        console.error('Failed to load effects toolbox', error);
        if (!active) return;
        setErrorMessage('We could not load the effects toolkit. Please try again.');
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

  const filteredToolkits = useMemo(() => {
    if (!toolbox?.toolkits) return [];
    if (activeDifficulty === 'all') return toolbox.toolkits;
    return toolbox.toolkits.filter((tool) => tool.difficulty.toLowerCase() === activeDifficulty);
  }, [toolbox, activeDifficulty]);

  const handleClose = () => {
    onClose();
    navigate('/profile');
  };

  const difficultyFilters = [
    { id: 'all', label: 'All levels' },
    { id: 'beginner', label: 'Beginner' },
    { id: 'intermediate', label: 'Intermediate' }
  ];

  return (
    <div className="more-page">
      <div className="more-page__container">
        <header className="more-page__header">
          <h1>
            <i className="fa-solid fa-wand-magic-sparkles"></i>
            Effect Builder
          </h1>
          <button className="more-page__close" type="button" onClick={handleClose} aria-label="Close Effect Builder">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </header>

        <div className="more-page__toolbar">
          <div className="more-page__toolbar-info">
            <span className="more-page__badge">
              <i className="fa-solid fa-bolt"></i>
              Build and publish AR effects
            </span>
            {loading ? (
              <span className="more-page__toolbar-sync more-page__toolbar-sync--live">
                <i className="fa-solid fa-spinner fa-spin"></i>
                Preparing toolkit…
              </span>
            ) : (
              <span className="more-page__toolbar-sync">
                {toolbox?.templates?.length ?? 0} templates ready to remix
              </span>
            )}
          </div>
          <div className="more-page__toolbar-actions">
            <div className="more-page__tabs">
              {difficultyFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={`more-page__tab ${activeDifficulty === filter.id ? 'more-page__tab--active' : ''}`}
                  onClick={() => setActiveDifficulty(filter.id)}
                >
                  {filter.label}
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
                  fetchEffectsToolbox()
                    .then((data) => {
                      setToolbox(data);
                      setErrorMessage('');
                    })
                    .catch((error) => {
                      console.error('Retry failed', error);
                      setErrorMessage('Toolkit service is still unavailable. Try later.');
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
              <p>Loading creation toolkit…</p>
            </div>
          ) : !toolbox ? (
            <div className="more-page__empty">
              <i className="fa-solid fa-wand-magic"></i>
              <p>No effects available yet. Check back soon as new templates go live.</p>
            </div>
          ) : (
            <>
              <div className="more-page__card">
                <h2>Featured templates</h2>
                <div className="more-page__cards-row">
                  {toolbox.templates?.map((template) => (
                    <div key={template.id} className="more-page__list-item">
                      <span className="more-page__badge">
                        <i className="fa-solid fa-sparkles"></i> {template.category}
                      </span>
                      <h3>{template.name}</h3>
                      <p>
                        {template.usageCount.toLocaleString()} creators have published with this look. Last updated{' '}
                        {new Date(template.lastUpdated).toLocaleDateString()}.
                      </p>
                      <div className="more-page__tag-list">
                        <span className="more-page__tag">
                          <i className="fa-solid fa-layer-group"></i> {template.complexity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="more-page__card">
                <div className="more-page__section-title">Learning paths</div>
                {filteredToolkits.length === 0 ? (
                  <div className="more-page__empty">
                    <i className="fa-solid fa-graduation-cap"></i>
                    <p>No resources match this level yet.</p>
                  </div>
                ) : (
                  <div className="more-page__list">
                    {filteredToolkits.map((tool) => (
                      <div key={tool.id} className="more-page__list-item">
                        <h3>{tool.title}</h3>
                        <p>
                          {tool.durationMinutes} min • {tool.difficulty}
                        </p>
                        <button
                          type="button"
                          className="more-page__button more-page__button--primary"
                          onClick={() => navigate('/creator-academy')}
                        >
                          Start lesson
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="more-page__card">
                <h2>Publishing recommendations</h2>
                <div className="more-page__list">
                  {toolbox.recommendations?.map((tip, index) => (
                    <div key={index} className="more-page__faq-item">
                      <h4>Tip {index + 1}</h4>
                      <p>{tip}</p>
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

export default EffectsLab;

