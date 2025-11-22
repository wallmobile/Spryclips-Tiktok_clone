import React, { useState, useRef, useEffect } from 'react';
import './ReactPicker.css';

const REACTION_TYPES = [
  { id: 'like', emoji: '❤️', label: 'Like' },
  { id: 'love', emoji: '😍', label: 'Love' },
  { id: 'laugh', emoji: '😂', label: 'Laugh' },
  { id: 'wow', emoji: '😮', label: 'Wow' },
  { id: 'sad', emoji: '😢', label: 'Sad' },
  { id: 'angry', emoji: '😡', label: 'Angry' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
];

const ReactPicker = ({ onReaction, currentReaction, position = 'bottom' }) => {
  const [selectedReaction, setSelectedReaction] = useState(currentReaction || null);
  const pickerRef = useRef(null);

  useEffect(() => {
    setSelectedReaction(currentReaction || null);
  }, [currentReaction]);

  const handleReactionClick = (reaction) => {
    const newReaction = selectedReaction?.id === reaction.id ? null : reaction;
    setSelectedReaction(newReaction);
    if (onReaction) {
      onReaction(newReaction);
    }
  };

  return (
    <div 
      ref={pickerRef}
      className={`react-picker ${position}`}
    >
      <div className="react-picker-container">
        {REACTION_TYPES.map((reaction) => (
          <button
            key={reaction.id}
            className={`react-option ${selectedReaction?.id === reaction.id ? 'active' : ''}`}
            onClick={() => handleReactionClick(reaction)}
            title={reaction.label}
            aria-label={reaction.label}
          >
            <span className="react-emoji">{reaction.emoji}</span>
            {selectedReaction?.id === reaction.id && (
              <span className="react-check">
                <i className="fa-solid fa-check"></i>
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ReactPicker;
