import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './AdvancedVideoEditor.css';

const AdvancedVideoEditor = ({ onClose, onSave }) => {
  const { user } = useAuth();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  
  const [activeTab, setActiveTab] = useState('clips'); // 'clips', 'greenscreen', 'time', 'transitions', 'templates', 'captions'
  const [clips, setClips] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [greenScreenEnabled, setGreenScreenEnabled] = useState(false);
  const [greenScreenColor, setGreenScreenColor] = useState('#00ff00');
  const [greenScreenThreshold, setGreenScreenThreshold] = useState(50);
  const [timeEffects, setTimeEffects] = useState([]); // [{start: 0, end: 5, speed: 0.5}]
  const [selectedTransition, setSelectedTransition] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [autoCaptionsEnabled, setAutoCaptionsEnabled] = useState(false);
  const [captions, setCaptions] = useState([]);
  const [captionLanguage, setCaptionLanguage] = useState('en');
  const [translationLanguage, setTranslationLanguage] = useState('');
  const [stream, setStream] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const transitions = [
    { id: 'fade', name: 'Fade', icon: 'fa-solid fa-circle-half-stroke' },
    { id: 'slide', name: 'Slide', icon: 'fa-solid fa-arrows-left-right' },
    { id: 'zoom', name: 'Zoom', icon: 'fa-solid fa-magnifying-glass-plus' },
    { id: 'wipe', name: 'Wipe', icon: 'fa-solid fa-eraser' },
    { id: 'dissolve', name: 'Dissolve', icon: 'fa-solid fa-cloud' }
  ];

  const templates = [
    { id: 1, name: 'Trending Dance', thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200', duration: 15 },
    { id: 2, name: 'Comedy Skit', thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200', duration: 30 },
    { id: 3, name: 'Cooking Tutorial', thumbnail: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=200', duration: 60 },
    { id: 4, name: 'Travel Vlog', thumbnail: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200', duration: 45 },
    { id: 5, name: 'Beauty Tips', thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200', duration: 20 }
  ];

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [stream, previewUrl]);

  useEffect(() => {
    let interval = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Green screen processing
  useEffect(() => {
    if (greenScreenEnabled && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const processFrame = () => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Convert hex color to RGB
          const hex = greenScreenColor.replace('#', '');
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          
          // Remove green screen
          for (let i = 0; i < data.length; i += 4) {
            const dr = Math.abs(data[i] - r);
            const dg = Math.abs(data[i + 1] - g);
            const db = Math.abs(data[i + 2] - b);
            
            if (dr < greenScreenThreshold && dg < greenScreenThreshold && db < greenScreenThreshold) {
              data[i + 3] = 0; // Make transparent
            }
          }
          
          ctx.putImageData(imageData, 0, 0);
        }
        requestAnimationFrame(processFrame);
      };
      
      video.addEventListener('play', processFrame);
      return () => video.removeEventListener('play', processFrame);
    }
  }, [greenScreenEnabled, greenScreenColor, greenScreenThreshold]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startRecording = async () => {
    if (!stream) {
      await startCamera();
      return;
    }

    try {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const newClip = {
          id: Date.now(),
          url: url,
          duration: recordingTime,
          timestamp: new Date().toISOString()
        };
        setClips([...clips, newClip]);
        setPreviewUrl(url);
        setIsRecording(false);
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const deleteClip = (clipId) => {
    const updatedClips = clips.filter(c => c.id !== clipId);
    setClips(updatedClips);
  };

  const addTimeEffect = () => {
    const newEffect = {
      id: Date.now(),
      start: 0,
      end: 5,
      speed: 1.0 // 0.25x, 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
    };
    setTimeEffects([...timeEffects, newEffect]);
  };

  const updateTimeEffect = (id, field, value) => {
    setTimeEffects(timeEffects.map(effect => 
      effect.id === id ? { ...effect, [field]: parseFloat(value) } : effect
    ));
  };

  const deleteTimeEffect = (id) => {
    setTimeEffects(timeEffects.filter(e => e.id !== id));
  };

  const generateAutoCaptions = async () => {
    if (!clips.length) {
      alert('Please record some clips first!');
      return;
    }

    // Simulate caption generation
    setAutoCaptionsEnabled(true);
    const mockCaptions = [
      { id: 1, start: 0, end: 3, text: 'Hey everyone, welcome back!' },
      { id: 2, start: 3, end: 6, text: 'Today I\'m going to show you something amazing' },
      { id: 3, start: 6, end: 9, text: 'Make sure to like and subscribe!' }
    ];
    
    setTimeout(() => {
      setCaptions(mockCaptions);
      alert('Captions generated successfully!');
    }, 2000);
  };

  const translateCaptions = async () => {
    if (!translationLanguage || !captions.length) {
      alert('Please select a translation language and generate captions first!');
      return;
    }

    // Simulate translation
    alert(`Translating captions to ${translationLanguage}...`);
    // In production, this would call a translation API
  };

  const applyTemplate = (template) => {
    setSelectedTemplate(template);
    alert(`Template "${template.name}" applied! Duration: ${template.duration}s`);
  };

  const handleSave = () => {
    const videoData = {
      clips,
      greenScreen: greenScreenEnabled ? { color: greenScreenColor, threshold: greenScreenThreshold } : null,
      timeEffects,
      transition: selectedTransition,
      template: selectedTemplate,
      captions: autoCaptionsEnabled ? captions : [],
      captionLanguage,
      translationLanguage
    };

    if (onSave) {
      onSave(videoData);
    }
    alert('Video saved successfully!');
    onClose();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="advanced-editor-overlay" onClick={onClose}>
      <div className="advanced-editor-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="editor-header">
          <button className="editor-close" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>Advanced Video Editor</h2>
          <button className="save-editor-btn" onClick={handleSave}>
            <i className="fa-solid fa-check"></i>
            Save
          </button>
        </div>

        <div className="editor-container">
          {/* Preview Area */}
          <div className="editor-preview-section">
            <div className="preview-container">
              {greenScreenEnabled ? (
                <div className="preview-wrapper">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="preview-video"
                    style={{ display: greenScreenEnabled ? 'none' : 'block' }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="preview-canvas"
                  />
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="preview-video"
                />
              )}
              
              {previewUrl && !isRecording && (
                <video
                  src={previewUrl}
                  controls
                  className="preview-video"
                />
              )}

              {isRecording && (
                <div className="recording-indicator">
                  <div className="recording-dot"></div>
                  <span>{formatTime(recordingTime)}</span>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div className="camera-controls">
              {!stream ? (
                <button className="start-camera-btn" onClick={startCamera}>
                  <i className="fa-solid fa-video"></i>
                  Start Camera
                </button>
              ) : (
                <>
                  {!isRecording ? (
                    <button className="record-btn" onClick={startRecording}>
                      <i className="fa-solid fa-circle"></i>
                      Start Recording
                    </button>
                  ) : (
                    <button className="stop-record-btn" onClick={stopRecording}>
                      <i className="fa-solid fa-stop"></i>
                      Stop Recording
                    </button>
                  )}
                  <button className="stop-camera-btn" onClick={stopCamera}>
                    <i className="fa-solid fa-video-slash"></i>
                    Stop Camera
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tools Panel */}
          <div className="editor-tools-section">
            {/* Tabs */}
            <div className="editor-tabs">
              <button
                className={`editor-tab ${activeTab === 'clips' ? 'active' : ''}`}
                onClick={() => setActiveTab('clips')}
              >
                <i className="fa-solid fa-film"></i>
                <span>Clips</span>
                {clips.length > 0 && <span className="tab-badge">{clips.length}</span>}
              </button>
              <button
                className={`editor-tab ${activeTab === 'greenscreen' ? 'active' : ''}`}
                onClick={() => setActiveTab('greenscreen')}
              >
                <i className="fa-solid fa-mask"></i>
                <span>Green Screen</span>
              </button>
              <button
                className={`editor-tab ${activeTab === 'time' ? 'active' : ''}`}
                onClick={() => setActiveTab('time')}
              >
                <i className="fa-solid fa-clock"></i>
                <span>Time Effects</span>
              </button>
              <button
                className={`editor-tab ${activeTab === 'transitions' ? 'active' : ''}`}
                onClick={() => setActiveTab('transitions')}
              >
                <i className="fa-solid fa-shuffle"></i>
                <span>Transitions</span>
              </button>
              <button
                className={`editor-tab ${activeTab === 'templates' ? 'active' : ''}`}
                onClick={() => setActiveTab('templates')}
              >
                <i className="fa-solid fa-layer-group"></i>
                <span>Templates</span>
              </button>
              <button
                className={`editor-tab ${activeTab === 'captions' ? 'active' : ''}`}
                onClick={() => setActiveTab('captions')}
              >
                <i className="fa-solid fa-closed-captioning"></i>
                <span>Captions</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="editor-tab-content">
              {/* Multi-clip Tab */}
              {activeTab === 'clips' && (
                <div className="tab-panel">
                  <h3>Record Multiple Clips</h3>
                  <div className="clips-list">
                    {clips.length === 0 ? (
                      <div className="empty-state">
                        <i className="fa-solid fa-film"></i>
                        <p>No clips recorded yet</p>
                        <span>Record multiple clips and merge them together</span>
                      </div>
                    ) : (
                      clips.map(clip => (
                        <div key={clip.id} className="clip-item">
                          <video src={clip.url} className="clip-preview" />
                          <div className="clip-info">
                            <span>{formatTime(clip.duration)}</span>
                            <button
                              className="delete-clip-btn"
                              onClick={() => deleteClip(clip.id)}
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Green Screen Tab */}
              {activeTab === 'greenscreen' && (
                <div className="tab-panel">
                  <h3>Green Screen Effect</h3>
                  <div className="greenscreen-controls">
                    <label className="toggle-control">
                      <span>Enable Green Screen</span>
                      <input
                        type="checkbox"
                        checked={greenScreenEnabled}
                        onChange={(e) => setGreenScreenEnabled(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>

                    {greenScreenEnabled && (
                      <>
                        <div className="color-picker-control">
                          <label>Background Color</label>
                          <div className="color-picker-wrapper">
                            <input
                              type="color"
                              value={greenScreenColor}
                              onChange={(e) => setGreenScreenColor(e.target.value)}
                              className="color-picker"
                            />
                            <input
                              type="text"
                              value={greenScreenColor}
                              onChange={(e) => setGreenScreenColor(e.target.value)}
                              className="color-input"
                            />
                          </div>
                        </div>

                        <div className="slider-control">
                          <label>Threshold: {greenScreenThreshold}%</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={greenScreenThreshold}
                            onChange={(e) => setGreenScreenThreshold(e.target.value)}
                            className="slider"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Time Effects Tab */}
              {activeTab === 'time' && (
                <div className="tab-panel">
                  <h3>Time Effects</h3>
                  <button className="add-effect-btn" onClick={addTimeEffect}>
                    <i className="fa-solid fa-plus"></i>
                    Add Time Effect
                  </button>

                  <div className="time-effects-list">
                    {timeEffects.map(effect => (
                      <div key={effect.id} className="time-effect-item">
                        <div className="effect-inputs">
                          <div className="input-group">
                            <label>Start (s)</label>
                            <input
                              type="number"
                              value={effect.start}
                              onChange={(e) => updateTimeEffect(effect.id, 'start', e.target.value)}
                              min="0"
                            />
                          </div>
                          <div className="input-group">
                            <label>End (s)</label>
                            <input
                              type="number"
                              value={effect.end}
                              onChange={(e) => updateTimeEffect(effect.id, 'end', e.target.value)}
                              min={effect.start}
                            />
                          </div>
                          <div className="input-group">
                            <label>Speed</label>
                            <select
                              value={effect.speed}
                              onChange={(e) => updateTimeEffect(effect.id, 'speed', e.target.value)}
                            >
                              <option value="0.25">0.25x (Slow)</option>
                              <option value="0.5">0.5x (Slow)</option>
                              <option value="0.75">0.75x</option>
                              <option value="1.0">1x (Normal)</option>
                              <option value="1.25">1.25x</option>
                              <option value="1.5">1.5x (Fast)</option>
                              <option value="2.0">2x (Fast)</option>
                            </select>
                          </div>
                        </div>
                        <button
                          className="delete-effect-btn"
                          onClick={() => deleteTimeEffect(effect.id)}
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transitions Tab */}
              {activeTab === 'transitions' && (
                <div className="tab-panel">
                  <h3>Transitions</h3>
                  <div className="transitions-grid">
                    {transitions.map(transition => (
                      <button
                        key={transition.id}
                        className={`transition-item ${selectedTransition?.id === transition.id ? 'selected' : ''}`}
                        onClick={() => setSelectedTransition(transition)}
                      >
                        <i className={transition.icon}></i>
                        <span>{transition.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Templates Tab */}
              {activeTab === 'templates' && (
                <div className="tab-panel">
                  <h3>Video Templates</h3>
                  <div className="templates-grid">
                    {templates.map(template => (
                      <div
                        key={template.id}
                        className={`template-item ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                        onClick={() => applyTemplate(template)}
                      >
                        <img src={template.thumbnail} alt={template.name} />
                        <div className="template-info">
                          <h4>{template.name}</h4>
                          <span>{template.duration}s</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Captions Tab */}
              {activeTab === 'captions' && (
                <div className="tab-panel">
                  <h3>Auto-Captions</h3>
                  <div className="captions-controls">
                    <label className="toggle-control">
                      <span>Enable Auto-Captions</span>
                      <input
                        type="checkbox"
                        checked={autoCaptionsEnabled}
                        onChange={(e) => setAutoCaptionsEnabled(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>

                    <button className="generate-captions-btn" onClick={generateAutoCaptions}>
                      <i className="fa-solid fa-magic"></i>
                      Generate Captions
                    </button>

                    <div className="language-selector">
                      <label>Language</label>
                      <select
                        value={captionLanguage}
                        onChange={(e) => setCaptionLanguage(e.target.value)}
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="hi">Hindi</option>
                        <option value="ur">Urdu</option>
                      </select>
                    </div>

                    {autoCaptionsEnabled && captions.length > 0 && (
                      <>
                        <div className="language-selector">
                          <label>Translate To</label>
                          <select
                            value={translationLanguage}
                            onChange={(e) => setTranslationLanguage(e.target.value)}
                          >
                            <option value="">Select language</option>
                            <option value="en">English</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                            <option value="de">German</option>
                            <option value="hi">Hindi</option>
                            <option value="ur">Urdu</option>
                          </select>
                        </div>

                        {translationLanguage && (
                          <button className="translate-captions-btn" onClick={translateCaptions}>
                            <i className="fa-solid fa-language"></i>
                            Translate Captions
                          </button>
                        )}

                        <div className="captions-list">
                          {captions.map(caption => (
                            <div key={caption.id} className="caption-item">
                              <span className="caption-time">
                                {formatTime(caption.start)} - {formatTime(caption.end)}
                              </span>
                              <p className="caption-text">{caption.text}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedVideoEditor;
