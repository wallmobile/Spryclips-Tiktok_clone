import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getAllAcademyContent,
  searchAcademyContent,
  getAllLearningPaths,
  getMyAcademyProgress,
  getMyEnrolledPaths,
  markContentCompleted,
  enrollInLearningPath,
} from '../api/creator-academy';
import './CreatorAcademy.css';

const DEFAULT_PARAMS = { limit: 20 };

const CreatorAcademy = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [content, setContent] = useState([]);
  const [learningPaths, setLearningPaths] = useState([]);
  const [enrolledPaths, setEnrolledPaths] = useState([]);
  const [progress, setProgress] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchLoading, setSearchLoading] = useState(false);

  const loadAcademyData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [contentRes, pathsRes, progressRes, enrolledRes] = await Promise.all([
        getAllAcademyContent(DEFAULT_PARAMS),
        getAllLearningPaths(),
        getMyAcademyProgress(),
        getMyEnrolledPaths(),
      ]);

      setContent(contentRes?.content || []);
      setLearningPaths(Array.isArray(pathsRes) ? pathsRes : []);
      setProgress(progressRes || {});
      setEnrolledPaths(Array.isArray(enrolledRes) ? enrolledRes : []);
    } catch (err) {
      console.error('Failed to load academy content:', err);
      setError(err?.response?.data?.message || 'Unable to load Creator Academy right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAcademyData();
  }, [loadAcademyData]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const categoryOptions = useMemo(() => {
    const categories = new Set(content.map((item) => item.category).filter(Boolean));
    return ['all', ...Array.from(categories)];
  }, [content]);

  const filteredContent = useMemo(() => {
    let items = content;
    if (filter !== 'all') {
      items = items.filter((item) => item.category === filter);
    }
    return items;
  }, [content, filter]);

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!searchTerm.trim()) {
      loadAcademyData();
      return;
    }
    setSearchLoading(true);
    setError(null);
    try {
      const response = await searchAcademyContent(searchTerm.trim(), DEFAULT_PARAMS);
      setContent(response?.content || []);
    } catch (err) {
      console.error('Search failed:', err);
      setError(err?.response?.data?.message || 'Unable to search Creator Academy right now.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleResetSearch = () => {
    setSearchTerm('');
    loadAcademyData();
  };

  const handleMarkCompleted = async (lessonId) => {
    try {
      await markContentCompleted(lessonId);
      setProgress((prev) => ({
        ...prev,
        completed: [...(prev.completed || []), lessonId],
      }));
      alert('Marked as completed! Great job.');
    } catch (err) {
      console.error('Failed to mark lesson as completed:', err);
      alert(err?.response?.data?.message || 'Unable to mark this lesson as completed right now.');
    }
  };

  const handleEnrollPath = async (pathId) => {
    try {
      await enrollInLearningPath(pathId);
      setEnrolledPaths((prev) =>
        prev.some((p) => p._id === pathId)
          ? prev
          : [...prev, learningPaths.find((path) => path._id === pathId)].filter(Boolean)
      );
      alert('Enrolled successfully! You can track your progress in the academy dashboard.');
    } catch (err) {
      console.error('Failed to enroll in learning path:', err);
      alert(err?.response?.data?.message || 'Unable to enroll in this learning path right now.');
    }
  };

  return (
    <div className="creator-academy-overlay" onClick={onClose} role="presentation">
      <div
        className="creator-academy-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="creator-academy-title"
        data-testid="creator-academy-modal"
      >
        <div className="academy-header">
          <button className="academy-close-btn" onClick={onClose} aria-label="Close creator academy dialog">
            <i className="fa-solid fa-times"></i>
          </button>
          <h2 id="creator-academy-title">Creator Academy</h2>
          <div className="academy-header-placeholder" aria-hidden="true"></div>
        </div>

        <div className="academy-tools-bar">
          <form className="academy-search-form" onSubmit={handleSearch}>
            <i className="fa-solid fa-search" aria-hidden="true"></i>
            <input
              type="text"
              placeholder="Search lessons, workshops, or masterclasses..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search creator academy content"
            />
            {searchTerm && (
              <button type="button" onClick={handleResetSearch} aria-label="Clear search">
                <i className="fa-solid fa-times"></i>
              </button>
            )}
          </form>

          <div className="academy-filters">
            <label>Category:</label>
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All' : option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="academy-content">
          {loading ? (
            <div className="academy-loading" data-testid="academy-loading" role="status" aria-live="polite">
              <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
              <p>Loading modules...</p>
            </div>
          ) : error ? (
            <div className="academy-error" role="alert">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
              <p>{error}</p>
              <button className="academy-refresh-btn" onClick={loadAcademyData}>
                <i className="fa-solid fa-rotate" aria-hidden="true"></i>
                Retry
              </button>
            </div>
          ) : (
            <>
              <section className="academy-section">
                <div className="section-heading">
                  <h3>Learning Paths</h3>
                  {searchLoading && (
                    <span className="loading-indicator" role="status" aria-live="polite">
                      <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                      Searching...
                    </span>
                  )}
                </div>
                <div className="paths-grid">
                  {learningPaths.length === 0 ? (
                    <div className="empty-state">No learning paths published yet.</div>
                  ) : (
                    learningPaths.map((path) => {
                      const enrolled = enrolledPaths.some((item) => item?._id === path._id);
                      return (
                        <div key={path._id} className="path-card">
                          <div className="path-meta">
                            <span className="path-level">{path.level || 'All Levels'}</span>
                            <span className="path-course-count">{path.courses?.length || 0} lessons</span>
                          </div>
                          <h4>{path.title}</h4>
                          <p>{path.description}</p>
                          <div className="path-actions">
                            <button
                              className={`path-enroll-btn ${enrolled ? 'enrolled' : ''}`}
                              onClick={() => handleEnrollPath(path._id)}
                              disabled={enrolled}
                            >
                              {enrolled ? 'Enrolled' : 'Enroll Now'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="academy-section">
                <div className="section-heading">
                  <h3>Lessons & Workshops</h3>
                  <span className="section-count">{filteredContent.length} lessons</span>
                </div>

                {filteredContent.length === 0 ? (
                  <div className="empty-state">No lessons match the selected filters.</div>
                ) : (
                  <div className="lessons-grid">
                    {filteredContent.map((lesson) => {
                      const completed = progress?.completed?.includes(lesson._id);
                      return (
                        <div key={lesson._id} className="lesson-card">
                          <div className="lesson-header">
                            <span className="lesson-type">{lesson.type || 'Lesson'}</span>
                            {lesson.duration && (
                              <span className="lesson-duration">
                                <i className="fa-solid fa-clock"></i>
                                {lesson.duration} min
                              </span>
                            )}
                          </div>
                          <h4>{lesson.title}</h4>
                          <p>{lesson.summary || lesson.description}</p>
                          <div className="lesson-tags">
                            {lesson.category && <span>#{lesson.category}</span>}
                            {lesson.difficulty && <span>{lesson.difficulty}</span>}
                          </div>
                          <div className="lesson-actions">
                            <button
                              className={`lesson-complete-btn ${completed ? 'completed' : ''}`}
                              onClick={() => handleMarkCompleted(lesson._id)}
                              disabled={completed}
                            >
                              {completed ? (
                                <>
                                  <i className="fa-solid fa-check"></i>
                                  Completed
                                </>
                              ) : (
                                <>
                                  <i className="fa-solid fa-circle-play"></i>
                                  Mark Complete
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatorAcademy;

