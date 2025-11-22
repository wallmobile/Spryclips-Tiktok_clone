import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';
import { useVideoStore } from '../store/videoStore';
import './VolumeControl.css';

interface VolumeControlProps {
  videoRef: React.RefObject<HTMLVideoElement> | React.MutableRefObject<HTMLVideoElement | null>;
  className?: string;
  isActive?: boolean;
}

const VolumeControl = React.memo(function VolumeControl({ 
  videoRef, 
  className = '', 
  isActive = false 
}: VolumeControlProps) {
  const { globalMute, globalVolume, lastVolume, setGlobalMute, setGlobalVolume, setLastVolume } = useVideoStore();
  const [showSlider, setShowSlider] = useState(false); // Hide slider by default, show on volume change (TikTok style)
  const [isDragging, setIsDragging] = useState(false);
  const [localVolume, setLocalVolume] = useState(globalVolume); // Local state for smooth dragging
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      if (volumeDebounceRef.current) {
        clearTimeout(volumeDebounceRef.current);
      }
    };
  }, []);

  // Show slider and auto-hide after delay (TikTok style)
  const showSliderWithAutoHide = useCallback(() => {
    // Clear existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    
    // Show slider
    setShowSlider(true);
    
    // Auto-hide after 2.5 seconds (TikTok style)
    hideTimeoutRef.current = setTimeout(() => {
      if (!isDragging) {
        setShowSlider(false);
      }
    }, 2500);
  }, [isDragging]);

  // Handle mute toggle
  const handleMuteToggle = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    if (globalMute) {
      // Unmute: restore lastVolume (min 0.2)
      const restoreVol = Math.max(0.2, lastVolume);
      const restoreVolPercent = Math.round(restoreVol * 100);
      setGlobalMute(false);
      setGlobalVolume(restoreVolPercent);
      setLastVolume(restoreVol);
      
      // CRITICAL: Update ALL videos immediately to prevent any audio overlap
      const allVideos = document.querySelectorAll('video');
      allVideos.forEach((video) => {
        // Only unmute active video, keep others muted
        if (isActive && video === videoRef.current) {
          video.muted = false;
          video.volume = restoreVol;
        } else {
          // Keep inactive videos muted
          video.muted = true;
          video.volume = 0;
        }
      });
    } else {
      // Mute: store current volume and set to 0
      const currentVol = (isActive && videoRef.current) ? videoRef.current.volume : (globalVolume / 100);
      if (currentVol > 0) {
        setLastVolume(currentVol);
      }
      setGlobalMute(true);
      setGlobalVolume(0);
      
      // CRITICAL: Mute ALL videos immediately (including inactive ones)
      const allVideos = document.querySelectorAll('video');
      allVideos.forEach((video) => {
        video.muted = true;
        video.volume = 0;
      });
    }
    
    // Show slider when mute/unmute (TikTok style)
    showSliderWithAutoHide();
  }, [isActive, videoRef, globalMute, globalVolume, lastVolume, setGlobalMute, setGlobalVolume, setLastVolume, showSliderWithAutoHide]);

  // Handle volume button click - toggle mute (TikTok style)
  const handleVolumeButtonClick = useCallback((e: React.MouseEvent) => {
    handleMuteToggle(e);
  }, [handleMuteToggle]);

  // Optimized debounced volume update (reduced debounce for better performance)
  const updateVolume = useCallback((newVolume: number, updateVideo = true) => {
    // Clear existing debounce
    if (volumeDebounceRef.current) {
      clearTimeout(volumeDebounceRef.current);
    }

    volumeDebounceRef.current = setTimeout(() => {
      const volumeValue = newVolume / 100; // Convert to 0-1
      
      // Update store (0-100 scale)
      setGlobalVolume(newVolume);
      
      // Update video element if active (only when needed)
      if (updateVideo && isActive && videoRef.current) {
        const video = videoRef.current;
        if (volumeValue > 0) {
          // If volume > 0, unmute
          if (globalMute) {
            setGlobalMute(false);
          }
          if (video.muted !== false || video.volume !== volumeValue) {
            video.muted = false;
            video.volume = volumeValue;
          }
          // Update lastVolume if not muted
          if (!globalMute) {
            setLastVolume(volumeValue);
          }
        } else {
          // Volume = 0 means muted
          if (!video.muted || video.volume !== 0) {
            video.muted = true;
            video.volume = 0;
          }
        }
      }

      // If volume > 0 and was muted, unmute
      if (volumeValue > 0 && globalMute) {
        setGlobalMute(false);
      }
    }, 30); // Reduced to 30ms for better responsiveness
  }, [isActive, videoRef, globalMute, setGlobalMute, setGlobalVolume, setLastVolume]);

  // Sync local volume with global volume
  useEffect(() => {
    if (!isDragging) {
      setLocalVolume(globalMute ? 0 : globalVolume);
    }
  }, [globalVolume, globalMute, isDragging]);

  // Handle slider input (for immediate visual feedback during drag) - TikTok style
  const handleSliderInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value) || 0;
    setLocalVolume(newVolume); // Update local state immediately for smooth UI
    
    // Show slider when volume changes (TikTok style)
    showSliderWithAutoHide();
    
    // Update video volume in real-time during drag (smooth TikTok-like experience)
    if (isActive && videoRef.current) {
      const volumeValue = newVolume / 100;
      if (newVolume > 0) {
        // If volume > 0, unmute
        if (globalMute) {
          setGlobalMute(false);
        }
        videoRef.current.muted = false;
        videoRef.current.volume = volumeValue;
        setLastVolume(volumeValue);
      } else {
        // Volume = 0 means muted
        videoRef.current.muted = true;
        videoRef.current.volume = 0;
      }
    }
    
    // Update global volume immediately for smooth feedback
    setGlobalVolume(newVolume);
  }, [isActive, globalMute, videoRef, setGlobalMute, setGlobalVolume, setLastVolume, showSliderWithAutoHide]);

  // Handle slider change (when drag ends)
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value) || 0;
    setLocalVolume(newVolume);
    // Update global state after drag ends
    updateVolume(newVolume, true);
  }, [updateVolume]);

  // Handle slider drag start
  const handleSliderMouseDown = useCallback(() => {
    setIsDragging(true);
    showSliderWithAutoHide(); // Show slider when dragging starts
  }, [showSliderWithAutoHide]);

  // Handle global mouse up to ensure drag ends properly
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (sliderRef.current) {
          const finalVolume = parseInt(sliderRef.current.value) || 0;
          updateVolume(finalVolume, true);
        }
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, updateVolume]);

  // Handle slider drag end
  const handleSliderMouseUp = useCallback(() => {
    setIsDragging(false);
    // Sync local volume to global after drag ends
    if (sliderRef.current) {
      const finalVolume = parseInt(sliderRef.current.value) || 0;
      updateVolume(finalVolume, true);
    }
  }, [updateVolume]);

  // Handle volume increase
  const handleVolumeIncrease = useCallback(() => {
    const currentVol = globalMute ? 0 : globalVolume;
    const newVol = Math.min(100, currentVol + 10); // Increase by 10%
    updateVolume(newVol, true);
    setLocalVolume(newVol);
  }, [globalMute, globalVolume, updateVolume]);

  // Handle volume decrease
  const handleVolumeDecrease = useCallback(() => {
    const currentVol = globalMute ? 0 : globalVolume;
    const newVol = Math.max(0, currentVol - 10); // Decrease by 10%
    updateVolume(newVol, true);
    setLocalVolume(newVol);
  }, [globalMute, globalVolume, updateVolume]);

  // Global keyboard shortcuts for volume control
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Volume up (Arrow Up or =)
      if (e.key === 'ArrowUp' || (e.key === '=' && !e.shiftKey)) {
        e.preventDefault();
        handleVolumeIncrease();
      }
      // Volume down (Arrow Down or -)
      else if (e.key === 'ArrowDown' || e.key === '-') {
        e.preventDefault();
        handleVolumeDecrease();
      }
      // Mute toggle (M key)
      else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleMuteToggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleVolumeIncrease, handleVolumeDecrease, handleMuteToggle]);

  // Keyboard support for icon button
  const handleIconKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleMuteToggle();
    }
  }, [handleMuteToggle]);

  // Keyboard support for slider
  const handleSliderKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const currentVol = globalMute ? 0 : globalVolume;
    let newVol = currentVol;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      newVol = Math.max(0, currentVol - 5);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      newVol = Math.min(100, currentVol + 5);
    }

    if (newVol !== currentVol) {
      updateVolume(newVol, true);
      // Update the input value directly for immediate feedback
      e.currentTarget.value = newVol.toString();
    }
  }, [globalMute, globalVolume, updateVolume]);

  // Get current display volume (use local volume during drag for smooth animation)
  const displayVolume = useMemo(() => {
    return isDragging ? localVolume : (globalMute ? 0 : globalVolume);
  }, [isDragging, localVolume, globalMute, globalVolume]);

  // Get icon based on volume level for better visual feedback (memoized)
  const Icon = useMemo(() => {
    if (globalMute || displayVolume === 0) return VolumeX;
    if (displayVolume < 33) return Volume1;
    if (displayVolume < 66) return Volume2;
    return Volume2;
  }, [globalMute, displayVolume]);
  
  const iconSize = 20;

  return (
    <div
      ref={containerRef}
      className={`volume-control ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Icon Button - Click to toggle slider (TikTok style) */}
      <button
        className={`volume-icon-btn ${showSlider ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          handleVolumeButtonClick(e);
        }}
        onKeyDown={handleIconKeyDown}
        aria-label={globalMute ? 'Unmute' : 'Mute'}
        aria-pressed={showSlider || globalMute}
        title={globalMute ? `Unmute (Volume: ${Math.round(lastVolume * 100)}%)` : `Mute (Volume: ${globalVolume}%)`}
      >
        <Icon size={iconSize} strokeWidth={2} />
      </button>

      {/* Slider Container - Shows on click (TikTok style) */}
      <div
        className={`volume-slider-container ${showSlider ? 'visible' : ''} ${isDragging ? 'dragging' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        {/* Volume percentage display - shows on right side */}
        {showSlider && (
          <div className="volume-percentage-display">
            {displayVolume}%
          </div>
        )}
        
        <input
          ref={sliderRef}
          type="range"
          className={`volume-slider ${isDragging ? 'dragging' : ''}`}
          style={{ '--volume-percent': `${displayVolume}%` } as React.CSSProperties}
          min="0"
          max="100"
          step="1"
          value={displayVolume}
          onChange={handleSliderChange}
          onInput={handleSliderInput}
          onMouseDown={(e) => {
            e.stopPropagation();
            handleSliderMouseDown();
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            handleSliderMouseUp();
          }}
          onMouseMove={(e) => {
            // Real-time drag update - TikTok style (optimized)
            if (isDragging && e.buttons === 1) {
              const slider = e.currentTarget;
              const rect = slider.getBoundingClientRect();
              const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              const newVolume = Math.round(percent * 100);
              
              // Only update if changed (performance optimization)
              if (newVolume !== localVolume) {
                setLocalVolume(newVolume);
                
                // Show slider during drag (TikTok style)
                showSliderWithAutoHide();
                
                // Update video volume in real-time during drag (throttled)
                if (isActive && videoRef.current) {
                  const video = videoRef.current;
                  const volumeValue = newVolume / 100;
                  if (newVolume > 0) {
                    if (globalMute) {
                      setGlobalMute(false);
                    }
                    if (video.muted !== false || Math.abs(video.volume - volumeValue) > 0.01) {
                      video.muted = false;
                      video.volume = volumeValue;
                    }
                    setLastVolume(volumeValue);
                  } else {
                    if (!video.muted || video.volume !== 0) {
                      video.muted = true;
                      video.volume = 0;
                    }
                  }
                }
                setGlobalVolume(newVolume);
              }
            }
          }}
          onMouseLeave={() => {
            // End drag if mouse leaves while dragging
            if (isDragging) {
              handleSliderMouseUp();
            }
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            handleSliderMouseDown();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            handleSliderMouseUp();
          }}
          onTouchMove={(e) => {
            // Real-time touch drag update (optimized)
            if (isDragging && sliderRef.current) {
              e.stopPropagation();
              const touch = e.touches[0];
              const slider = sliderRef.current;
              const rect = slider.getBoundingClientRect();
              const percent = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
              const newVolume = Math.round(percent * 100);
              
              // Only update if changed (performance optimization)
              if (newVolume !== localVolume) {
                setLocalVolume(newVolume);
                
                // Update video volume in real-time (only when needed)
                if (isActive && videoRef.current) {
                  const video = videoRef.current;
                  const volumeValue = newVolume / 100;
                  if (newVolume > 0) {
                    if (globalMute) {
                      setGlobalMute(false);
                    }
                    if (video.muted !== false || Math.abs(video.volume - volumeValue) > 0.01) {
                      video.muted = false;
                      video.volume = volumeValue;
                    }
                    setLastVolume(volumeValue);
                  } else {
                    if (!video.muted || video.volume !== 0) {
                      video.muted = true;
                      video.volume = 0;
                    }
                  }
                }
                setGlobalVolume(newVolume);
              }
            }
          }}
          onKeyDown={handleSliderKeyDown}
          onClick={(e) => {
            e.stopPropagation();
            // Allow clicking on track to change volume - TikTok style
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const newVolume = Math.round(Math.max(0, Math.min(100, percent * 100)));
            setLocalVolume(newVolume);
            showSliderWithAutoHide(); // Show slider when clicking on track
            handleSliderChange({
              target: { value: newVolume.toString() }
            } as React.ChangeEvent<HTMLInputElement>);
          }}
          aria-label="Volume"
          aria-valuenow={displayVolume}
          aria-valuemin={0}
          aria-valuemax={100}
        />
        
        {/* Visual volume level indicator bar */}
        <div 
          className="volume-level-indicator"
          style={{ width: `${displayVolume}%` } as React.CSSProperties}
        />
      </div>
    </div>
  );
});

export default VolumeControl;













