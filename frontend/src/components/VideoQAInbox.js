import React, { useEffect, useMemo, useState } from 'react';
import './VideoQAInbox.css';
import useOverlayPage from '../hooks/useOverlayPage';

const STORAGE_KEY = 'tiktok_video_qa_v1';

const SAMPLE_QUESTIONS = [
  {
    _id: 'sample-1',
    question: 'What camera do you use to record this video?',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    askedBy: { username: 'videofan99' },
    isPinned: true,
    answer: 'I filmed this on my phone using the rear camera with HDR enabled.',
    answeredAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    answeredBy: { username: 'creator' },
  },
  {
    _id: 'sample-2',
    question: 'Can you share the recipe/steps you followed?',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    askedBy: { username: 'curiouschef' },
    isPinned: false,
  },
  {
    _id: 'sample-3',
    question: 'How long does it take to learn this routine?',
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    askedBy: { username: 'learner' },
    isPinned: false,
  },
];

const createSampleForVideo = (id) =>
  SAMPLE_QUESTIONS.map((item, index) => ({
    ...item,
    _id: `${id}-${index}`,
  }));

const readStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch (error) {
    console.warn('Failed to read QA storage', error);
    return {};
  }
};

const writeStorage = (data) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to persist QA storage', error);
  }
};

const VideoQAInbox = ({ onClose = () => {}, mode = 'overlay' }) => {
  const isOverlay = mode === 'overlay';
  const [videoId, setVideoId] = useState('');
  const [qaData, setQaData] = useState(() => readStorage());
  const [answeringQuestionId, setAnsweringQuestionId] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [status, setStatus] = useState('');

  const normalizedVideoId = useMemo(() => videoId.trim(), [videoId]);

  const questions = useMemo(() => {
    if (!normalizedVideoId) return [];
    return qaData[normalizedVideoId] ?? [];
  }, [qaData, normalizedVideoId]);

  useEffect(() => {
    if (!normalizedVideoId) return;
    if (qaData[normalizedVideoId]) return;

    const sample = createSampleForVideo(normalizedVideoId);
    const next = { ...qaData, [normalizedVideoId]: sample };
    setQaData(next);
    writeStorage(next);
    setStatus('Loaded starter questions to get you going.');
  }, [normalizedVideoId, qaData]);

  useOverlayPage(onClose, { bodyClass: 'qa-page-open', enabled: isOverlay });

  const updateVideoQuestions = (updater) => {
    if (!normalizedVideoId) return;
    setQaData((prev) => {
      const current = prev[normalizedVideoId] ?? [];
      const nextQuestions = updater(current);
      const nextData = { ...prev, [normalizedVideoId]: nextQuestions };
      writeStorage(nextData);
      return nextData;
    });
  };

  const handleSubmitAnswer = (questionId) => {
    if (!normalizedVideoId || !answerText.trim()) return;
    updateVideoQuestions((current) =>
      current.map((item) =>
        item._id === questionId
          ? {
              ...item,
              answer: answerText.trim(),
              answeredAt: new Date().toISOString(),
              answeredBy: { username: 'you' },
            }
          : item
      )
    );
    setAnswerText('');
    setAnsweringQuestionId(null);
    setStatus('Answer published. Viewers will see it immediately.');
  };

  const handlePinToggle = (questionId) => {
    if (!normalizedVideoId) return;
    updateVideoQuestions((current) =>
      current.map((item) =>
        item._id === questionId
          ? { ...item, isPinned: !item.isPinned }
          : item
      )
    );
  };

  const handleRemoveQuestion = (questionId) => {
    updateVideoQuestions((current) => current.filter((item) => item._id !== questionId));
    setStatus('Question removed from the inbox.');
  };

  const content = (
    <div
      className={`qa-container ${!isOverlay ? 'qa-container--page' : ''}`}
      onClick={(e) => {
        if (isOverlay) {
          e.stopPropagation();
        }
      }}
    >
      <div className="qa-header">
        {isOverlay && (
          <button className="qa-close" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-times"></i>
          </button>
        )}
        <h2>Video Q&A</h2>
      </div>

      <div className="qa-input">
        <label htmlFor="qa-video-id">Video ID</label>
        <input
          id="qa-video-id"
          type="text"
          placeholder="Enter your video ID"
          value={videoId}
          onChange={(e) => setVideoId(e.target.value)}
        />
        <p className="qa-help">Find your video ID on the video detail page URL.</p>
      </div>

      {status && <p className="qa-status">{status}</p>}

      <div className="qa-list">
        {questions.length === 0 && (
          <p className="qa-empty">No questions yet. Share your video to receive questions from viewers.</p>
        )}

        {questions.map((item) => (
          <div key={item._id} className={`qa-card ${item.isPinned ? 'pinned' : ''}`}>
            <div className="qa-card-header">
              <div>
                <h3>{item.question}</h3>
                <p className="qa-meta">
                  Asked by @{item.askedBy?.username || 'viewer'} · {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
              <button className="qa-pin" onClick={() => handlePinToggle(item._id)} aria-label="Toggle pin">
                <i className={`fa-solid ${item.isPinned ? 'fa-thumbtack' : 'fa-thumbtack-slash'}`}></i>
              </button>
              <button className="qa-remove" onClick={() => handleRemoveQuestion(item._id)} aria-label="Remove question">
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>

            {item.answer ? (
              <div className="qa-answer">
                <p>{item.answer}</p>
                <p className="qa-meta">
                  Answered {new Date(item.answeredAt).toLocaleString()} by @{item.answeredBy?.username || 'you'}
                </p>
              </div>
            ) : answeringQuestionId === item._id ? (
              <div className="qa-answer-form">
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Type your answer"
                  rows={3}
                />
                <div className="qa-answer-actions">
                  <button onClick={() => setAnsweringQuestionId(null)}>Cancel</button>
                  <button onClick={() => handleSubmitAnswer(item._id)} disabled={!answerText.trim()}>
                    Submit answer
                  </button>
                </div>
              </div>
            ) : (
              <button className="qa-answer-btn" onClick={() => setAnsweringQuestionId(item._id)}>
                Answer question
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (isOverlay) {
    return (
      <div className="qa-overlay" onClick={onClose}>
        {content}
      </div>
    );
  }

  return <div className="qa-page">{content}</div>;
};

export default VideoQAInbox;
