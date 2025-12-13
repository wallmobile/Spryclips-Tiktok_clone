import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { createStory } from '../../api/stories';
import { useAuth } from '../../context/AuthContext';
import './StoryCreator.css';

const StoryCreator = ({ onClose, onStoryCreated }) => {
  const { user } = useAuth();
  const [step, setStep] = useState('select'); // 'select', 'capture', 'edit'
  const [mediaType, setMediaType] = useState(null); // 'image' or 'video'
  const [mediaFile, setMediaFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [text, setText] = useState('');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textBackground, setTextBackground] = useState('transparent');
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 }); // Position in percentage
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const textOverlayRef = useRef(null);
  const previewWrapperRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(null); // Store aspect ratio
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const previewImageRef = useRef(null);
  const previewVideoRef = useRef(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Handle global mouse events for dragging
  useEffect(() => {
    if (!isDragging) {
      return;
    }

    console.log('🖱️ Setting up drag event listeners, isDragging:', isDragging);

    const handleMouseMove = (e) => {
      if (!isDragging) {
        console.log('🖱️ Drag ended, ignoring mousemove');
        return;
      }

      if (!previewWrapperRef.current) {
        console.warn('⚠️ previewWrapperRef.current is null');
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      const rect = previewWrapperRef.current.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) {
        console.warn('⚠️ Invalid rect:', rect);
        return;
      }
      
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      
      console.log('🖱️ Dragging text to:', { x, y, clientX: e.clientX, clientY: e.clientY });
      setTextPosition(prev => {
        // Only update if position actually changed
        if (Math.abs(prev.x - x) > 0.1 || Math.abs(prev.y - y) > 0.1) {
          return { x, y };
        }
        return prev;
      });
    };

    const handleMouseUp = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🖱️ Text drag ended via mouseup');
      setIsDragging(false);
    };

    const handleMouseLeave = (e) => {
      // Only handle if leaving the document
      if (e.target === document) {
        console.log('🖱️ Text drag ended via mouseleave');
        setIsDragging(false);
      }
    };

    // Use capture phase to ensure we catch events
    document.addEventListener('mousemove', handleMouseMove, { capture: true, passive: false });
    document.addEventListener('mouseup', handleMouseUp, { capture: true, passive: false });
    document.addEventListener('mouseleave', handleMouseLeave, { capture: true, passive: false });

    return () => {
      console.log('🖱️ Cleaning up drag event listeners');
      document.removeEventListener('mousemove', handleMouseMove, { capture: true });
      document.removeEventListener('mouseup', handleMouseUp, { capture: true });
      document.removeEventListener('mouseleave', handleMouseLeave, { capture: true });
    };
  }, [isDragging]);

  // Set up video stream when capture step is active
  useEffect(() => {
    if (step === 'capture' && streamRef.current) {
      // Wait a bit for the video element to render
      const timer = setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          console.log('📹 Setting up video element with stream');
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(e => {
            console.warn('Video play error:', e);
            setError('Failed to start camera preview. Please try again.');
          });
        } else {
          console.warn('⚠️ Video element or stream not ready');
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
    
    // Cleanup when leaving capture step
    return () => {
      if (step !== 'capture' && streamRef.current) {
        console.log('🧹 Cleaning up camera stream');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [step]);

  // Calculate aspect ratio for video preview
  useEffect(() => {
    if (step === 'edit' && mediaType === 'video' && previewVideoRef.current) {
      const video = previewVideoRef.current;
      
      const updateAspectRatio = () => {
        if (video.videoWidth && video.videoHeight) {
          const ratio = video.videoWidth / video.videoHeight;
          setAspectRatio(ratio);
          console.log('📐 Video aspect ratio:', ratio, `(${video.videoWidth}x${video.videoHeight})`);
        }
      };

      const handleLoadedMetadata = () => {
        updateAspectRatio();
      };

      // Check if metadata is already loaded
      if (video.readyState >= 1) {
        updateAspectRatio();
      } else {
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
      }

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [step, mediaType, preview]);

  // Calculate aspect ratio for image preview
  useEffect(() => {
    if (step === 'edit' && mediaType === 'image' && previewImageRef.current) {
      const img = previewImageRef.current;
      
      const updateAspectRatio = () => {
        if (img.naturalWidth && img.naturalHeight) {
          const ratio = img.naturalWidth / img.naturalHeight;
          setAspectRatio(ratio);
          console.log('📐 Image aspect ratio:', ratio, `(${img.naturalWidth}x${img.naturalHeight})`);
        }
      };

      if (img.complete) {
        updateAspectRatio();
      } else {
        img.addEventListener('load', updateAspectRatio);
      }

      return () => {
        img.removeEventListener('load', updateAspectRatio);
      };
    }
  }, [step, mediaType, preview]);

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      setError('Please select an image or video file');
      return;
    }

    setMediaType(isVideo ? 'video' : 'image');
    setMediaFile(file);
    setError(null);
    setAspectRatio(null); // Reset aspect ratio

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      
      // Calculate aspect ratio after preview is set
      if (isImage) {
        const img = new Image();
        img.onload = () => {
          const ratio = img.width / img.height;
          setAspectRatio(ratio);
        };
        img.src = e.target.result;
      } else {
        // For video, we'll calculate in useEffect
      }
      
      setStep('edit');
    };
    reader.readAsDataURL(file);
  };

  // Handle camera capture
  const handleCameraCapture = async () => {
    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.');
      return;
    }

    // Check if we're on HTTPS (required for camera access)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setError('Camera access requires HTTPS. Please access this site via HTTPS.');
      return;
    }

    setError(null);
    setIsLoadingCamera(true);
    
    try {
      console.log('📷 Requesting camera access...');
      
      // Try with ideal constraints first
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (constraintError) {
        // If constraints fail, try with minimal requirements
        console.warn('⚠️ Ideal constraints failed, trying minimal constraints:', constraintError);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false
        });
      }
      
      console.log('✅ Camera access granted');
      streamRef.current = stream;
      
      // Set step to capture - useEffect will handle setting up the video
      setStep('capture');
      setMediaType('image'); // Default to image for camera
      setError(null);
    } catch (error) {
      console.error('❌ Error accessing camera:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error stack:', error.stack);
      
      // Detailed debugging info
      console.group('🔍 Camera Access Debug Info');
      console.log('Browser:', navigator.userAgent);
      console.log('Protocol:', window.location.protocol);
      console.log('Hostname:', window.location.hostname);
      console.log('mediaDevices available:', !!navigator.mediaDevices);
      console.log('getUserMedia available:', !!navigator.mediaDevices?.getUserMedia);
      console.log('Permissions API available:', !!navigator.permissions);
      
      // Check permissions if API is available
      if (navigator.permissions) {
        navigator.permissions.query({ name: 'camera' }).then(result => {
          console.log('Camera permission state:', result.state);
          console.log('Camera permission status:', result.status);
        }).catch(permError => {
          console.warn('Could not check camera permission:', permError);
        });
      }
      
      // List available devices
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices().then(devices => {
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          console.log('Available video devices:', videoDevices.length);
          videoDevices.forEach((device, index) => {
            console.log(`  Device ${index + 1}:`, device.label || 'Unnamed device', device.deviceId);
          });
        }).catch(enumError => {
          console.warn('Could not enumerate devices:', enumError);
        });
      }
      console.groupEnd();
      
      let errorMessage = 'Could not access camera. ';
      
      // Provide specific error messages based on error type
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow camera permissions in your browser settings and try again.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera found. Please connect a camera and try again.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += 'Camera is being used by another application. Please close other apps using the camera.';
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage += 'Camera does not support the required settings. Please try again.';
      } else if (error.name === 'SecurityError') {
        errorMessage += 'Camera access blocked for security reasons. Please use HTTPS.';
      } else if (error.name === 'TypeError') {
        errorMessage += 'Camera API not available. Please use a modern browser.';
      } else {
        errorMessage += `Error: ${error.message || 'Unknown error occurred'}`;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoadingCamera(false);
    }
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // Calculate aspect ratio
    const ratio = video.videoWidth / video.videoHeight;
    setAspectRatio(ratio);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'story-photo.jpg', { type: 'image/jpeg' });
        setMediaFile(file);
        setPreview(URL.createObjectURL(blob));
        setStep('edit');
        
        // Stop camera stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      }
    }, 'image/jpeg', 0.9);
  };

  // Handle upload
  const handleUpload = async (e) => {
    // Prevent default and stop propagation
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log('🔘 Share Story button clicked');
    console.log('📁 Media file:', mediaFile);
    console.log('👤 User:', user);
    console.log('📝 Media type:', mediaType);
    console.log('🔤 Text:', text);

    if (!mediaFile) {
      console.error('❌ No media file selected');
      setError('Please select a photo or video first.');
      return;
    }

    // User check - StoryCreator should only be accessible when logged in
    // But if user object is temporarily unavailable, API will handle authentication
    // So we just log it but don't block the upload
    if (!user) {
      console.warn('⚠️ User object not available, but continuing with upload...');
      console.warn('API will handle authentication via token in headers');
      // Don't block - let API handle auth
    }

    if (isUploading) {
      console.warn('⚠️ Already uploading, ignoring click');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('media', mediaFile);
      formData.append('type', mediaType);
      if (text.trim()) {
        formData.append('text', text.trim());
        formData.append('textColor', textColor);
        formData.append('textBackground', textBackground);
        formData.append('textPositionX', textPosition.x.toString());
        formData.append('textPositionY', textPosition.y.toString());
      }

      console.log('📤 Starting story upload...');
      const response = await createStory(formData);
      console.log('✅ Story upload response:', response);
      
      if (response && response.success) {
        // Show success message
        setUploadSuccess(true);
        setIsUploading(false);
        setError(null);
        
        const storyId = response.story?._id || response.story?.id;
        console.log('🎉 Story uploaded successfully:', storyId);
        console.log('📦 Full story response:', response.story);
        
        // Trigger story refresh event
        if (onStoryCreated) {
          onStoryCreated(response.story);
        }
        
        // Dispatch single refresh event - components will handle debouncing
        console.log('📢 Dispatching stories:refresh event...');
        window.dispatchEvent(new Event('stories:refresh'));
        
        // Close after showing success message (2 seconds to allow refresh)
        setTimeout(() => {
          console.log('🔒 Closing story creator after success...');
          onClose();
        }, 2000);
      } else {
        const errorMsg = response?.message || 'Failed to upload story. Please try again.';
        console.error('❌ Upload failed:', errorMsg);
        setError(errorMsg);
        setIsUploading(false);
        setUploadSuccess(false);
      }
    } catch (error) {
      console.error('❌ Error uploading story:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to upload story. Please try again.';
      
      setError(errorMessage);
      setIsUploading(false);
      setUploadSuccess(false);
      
      // Don't close on error - let user see the error and retry
    }
  };

  // Reset to initial state
  const handleReset = () => {
    setStep('select');
    setMediaType(null);
    setMediaFile(null);
    setPreview(null);
    setText('');
    setTextColor('#FFFFFF');
    setTextBackground('transparent');
    setError(null);
    setUploadSuccess(false);
    setAspectRatio(null);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Render content in portal to ensure it's always on top
  const content = (() => {
    if (step === 'select') {
      return (
        <div className="story-creator">
        <div className="story-creator__modal">
          <div className="story-creator__header">
            <h2>Create Story</h2>
            <button className="story-creator__close" onClick={onClose}>
              <i className="fa-solid fa-times"></i>
            </button>
          </div>
          
          <div className="story-creator__options">
            <button
              className="story-creator__option"
              onClick={handleCameraCapture}
              disabled={isLoadingCamera}
            >
              {isLoadingCamera ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Accessing Camera...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-camera"></i>
                  <span>Take Photo</span>
                </>
              )}
            </button>
            
            <button
              className="story-creator__option"
              onClick={() => fileInputRef.current?.click()}
            >
              <i className="fa-solid fa-image"></i>
              <span>Choose from Gallery</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {error && (
            <div className="story-creator__error">
              <i className="fa-solid fa-circle-exclamation"></i>
              <div style={{ flex: 1 }}>
                <div>{error}</div>
                {error.includes('camera') && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', opacity: 0.9, lineHeight: '1.4' }}>
                    <strong>Debugging Steps:</strong>
                    <ol style={{ margin: '0.5rem 0 0 1.2rem', padding: 0, listStyle: 'decimal' }}>
                      <li>Press <kbd style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '3px', fontFamily: 'monospace' }}>F12</kbd> to open browser console and check detailed error</li>
                      <li>Allow camera permissions in browser settings (click lock icon in address bar)</li>
                      <li>Close other apps using the camera (Zoom, Teams, etc.)</li>
                      <li>Make sure you're using HTTPS or localhost</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}

          {uploadSuccess && (
            <div className="story-creator__success">
              <i className="fa-solid fa-circle-check"></i>
              Story uploaded successfully! 🎉
            </div>
          )}
        </div>
      </div>
      );
    }

    if (step === 'capture') {
      return (
        <div className="story-creator">
          <div className="story-creator__camera-container">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="story-creator__camera-preview"
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            
            <div className="story-creator__camera-controls">
              <button
                className="story-creator__btn story-creator__btn--secondary"
                onClick={handleReset}
              >
                <i className="fa-solid fa-arrow-left"></i>
                Back
              </button>
              <button
                className="story-creator__btn story-creator__btn--primary story-creator__btn--capture"
                onClick={capturePhoto}
              >
                <i className="fa-solid fa-circle"></i>
              </button>
              <div style={{ width: '80px' }}></div>
            </div>
          </div>
        </div>
      );
    }

    if (step === 'edit') {
      return (
        <div className="story-creator">
        <div className="story-creator__edit-container">
          <div 
            ref={previewWrapperRef}
            className="story-creator__preview-wrapper"
            style={aspectRatio ? {
              aspectRatio: `${aspectRatio} / 1`,
              maxWidth: '100%',
              maxHeight: '80vh', // Increased to show more content
              width: '100%'
            } : {
              maxHeight: '80vh', // Increased to show more content
              width: '100%'
            }}
          >
            {mediaType === 'video' ? (
              <video
                ref={previewVideoRef}
                src={preview}
                controls
                className="story-creator__preview"
              />
            ) : (
              <img
                ref={previewImageRef}
                src={preview}
                alt="Story preview"
                className="story-creator__preview"
              />
            )}
            
            {text && (
              <div
                ref={textOverlayRef}
                className="story-creator__text-overlay"
                style={{
                  color: textColor,
                  background: textBackground === 'transparent' ? 'transparent' : textBackground,
                  left: `${textPosition.x}%`,
                  top: `${textPosition.y}%`,
                  transform: 'translate(-50%, -50%)',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  pointerEvents: 'auto',
                  zIndex: 10,
                  position: 'absolute',
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🖱️ Text drag started - isDragging will be set to true');
                  console.log('🖱️ Current text position:', textPosition);
                  console.log('🖱️ Preview wrapper ref:', previewWrapperRef.current);
                  setIsDragging(true);
                }}
                onTouchStart={(e) => {
                  // Also support touch for mobile
                  e.preventDefault();
                  e.stopPropagation();
                  if (previewWrapperRef.current) {
                    const touch = e.touches[0];
                    const rect = previewWrapperRef.current.getBoundingClientRect();
                    const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
                    const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
                    setTextPosition({ x, y });
                    setIsDragging(true);
                  }
                }}
                draggable={false}
              >
                {text}
              </div>
            )}
          </div>

          <div className="story-creator__edit-panel">
            <div className="story-creator__section">
              <label>Add Text (Optional)</label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your message..."
                maxLength={500}
                className="story-creator__input"
              />
            </div>

            {text && (
              <>
                <div className="story-creator__section">
                  <label>Text Color</label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="story-creator__color-input"
                  />
                </div>

                <div className="story-creator__section">
                  <label>Text Background</label>
                  <select
                    value={textBackground}
                    onChange={(e) => setTextBackground(e.target.value)}
                    className="story-creator__select"
                  >
                    <option value="transparent">Transparent</option>
                    <option value="rgba(0, 0, 0, 0.5)">Dark</option>
                    <option value="rgba(255, 255, 255, 0.5)">Light</option>
                  </select>
                </div>
              </>
            )}

            {error && (
              <div className="story-creator__error">
                <i className="fa-solid fa-circle-exclamation"></i>
                {error}
              </div>
            )}

            {uploadSuccess && (
              <div className="story-creator__success">
                <i className="fa-solid fa-circle-check"></i>
                Story uploaded successfully! 🎉
              </div>
            )}

            <div className="story-creator__actions">
              <button
                className="story-creator__btn story-creator__btn--secondary"
                onClick={handleReset}
                disabled={isUploading}
                type="button"
              >
                Cancel
              </button>
              <button
                className="story-creator__btn story-creator__btn--primary"
                onClick={(e) => {
                  console.log('🎯 Share Story button clicked!');
                  e.preventDefault();
                  e.stopPropagation();
                  handleUpload(e);
                }}
                disabled={isUploading}
                type="button"
                style={{ 
                  position: 'relative', 
                  zIndex: 99999, 
                  pointerEvents: 'auto',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  minHeight: '44px',
                  minWidth: '120px'
                }}
                title={!mediaFile ? 'Please select a photo or video first' : 'Share your story'}
              >
                {isUploading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Uploading...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane"></i>
                    Share Story
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      );
    }

    return null;
  })();

  // Render to portal at document body level
  return ReactDOM.createPortal(content, document.body);
};

export default StoryCreator;


