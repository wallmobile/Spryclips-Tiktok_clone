import React, { useState, useEffect } from 'react';
import './ScrollNavigationButtons.css';

const ScrollNavigationButtons = () => {
  const [showUp, setShowUp] = useState(false);
  const [showDown, setShowDown] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    const feedContainer = document.querySelector('.for-you-feed');
    if (!feedContainer) return;

    const handleScroll = () => {
      const scrollTop = feedContainer.scrollTop;
      const scrollHeight = feedContainer.scrollHeight;
      const clientHeight = feedContainer.clientHeight;
      const maxScroll = scrollHeight - clientHeight;

      setIsAtTop(scrollTop <= 10);
      setIsAtBottom(scrollTop >= maxScroll - 10);
      setShowUp(scrollTop > 100);
      setShowDown(scrollTop < maxScroll - 100);
    };

    feedContainer.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state

    return () => {
      feedContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollUp = () => {
    const feedContainer = document.querySelector('.for-you-feed');
    if (!feedContainer) return;

    const cardHeight = window.innerHeight - 60;
    const currentScroll = feedContainer.scrollTop;
    const newScroll = Math.max(0, currentScroll - cardHeight);

    feedContainer.scrollTo({
      top: newScroll,
      behavior: 'smooth'
    });
  };

  const scrollDown = () => {
    const feedContainer = document.querySelector('.for-you-feed');
    if (!feedContainer) return;

    const cardHeight = window.innerHeight - 60;
    const currentScroll = feedContainer.scrollTop;
    const scrollHeight = feedContainer.scrollHeight;
    const clientHeight = feedContainer.clientHeight;
    const maxScroll = scrollHeight - clientHeight;
    const newScroll = Math.min(maxScroll, currentScroll + cardHeight);

    feedContainer.scrollTo({
      top: newScroll,
      behavior: 'smooth'
    });
  };

  if (!showUp && !showDown) return null;

  return (
    <div className="scroll-navigation-buttons">
      {showUp && (
        <button
          className="scroll-nav-btn scroll-up-btn"
          onClick={scrollUp}
          disabled={isAtTop}
          title="Scroll up"
        >
          <i className="fa-solid fa-chevron-up"></i>
        </button>
      )}
      {showDown && (
        <button
          className="scroll-nav-btn scroll-down-btn"
          onClick={scrollDown}
          disabled={isAtBottom}
          title="Scroll down"
        >
          <i className="fa-solid fa-chevron-down"></i>
        </button>
      )}
    </div>
  );
};

export default ScrollNavigationButtons;

