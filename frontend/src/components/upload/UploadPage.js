import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { uploadVideo, promoteVideo } from '../../api/videos';
import { saveDraft, scheduleVideo } from '../../api/drafts';
import { searchSounds, getTrendingSounds, searchOnlineMusic } from '../../api/music';
import { searchMusic } from '../../api/search';
import './UploadPage.css';

const MAX_VIDEO_MB = 100;
const MAX_VIDEO_SECONDS = 10 * 60; // 10 minutes

const boolToString = (value) => (value ? 'true' : 'false');

const UploadPage = ({ onClose }) => {
  const { user } = useAuth();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const videoPlayerRef = useRef(null);
  const editVideoPlayerRef = useRef(null);
  const musicAudioRef = useRef(null);
  const musicPreviewAudioRef = useRef(null);
  const voiceoverInputRef = useRef(null);
  const feedbackRef = useRef(null);
  const musicFileInputRef = useRef(null);
  
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showMusicLibrary, setShowMusicLibrary] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [cropStart, setCropStart] = useState(0);
  const [cropEnd, setCropEnd] = useState(0);
  const [selectedMusicCategory, setSelectedMusicCategory] = useState('trending');
  const [musicLibrary, setMusicLibrary] = useState([]);
  const [loadingMusic, setLoadingMusic] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState(null); // Temporary selection before save
  const [musicSearchQuery, setMusicSearchQuery] = useState(''); // Online search query
  const [searchingMusic, setSearchingMusic] = useState(false); // Loading state for search
  const [onlineMusicResults, setOnlineMusicResults] = useState([]); // Online search results
  const clickTimeoutRef = useRef(null); // For handling single vs double click
  
  // Advanced Editor states
  const [activeEditTab, setActiveEditTab] = useState('trim');
  const [textOverlays, setTextOverlays] = useState([]);
  const [selectedTextStyle, setSelectedTextStyle] = useState(null);
  const [stickers, setStickers] = useState([]);
  const [draggingElement, setDraggingElement] = useState(null); // {type: 'text'|'sticker', id: number}
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedFilter, setSelectedFilter] = useState('None');
  const [selectedEffectId, setSelectedEffectId] = useState(null);
  const [selectedSpeed, setSelectedSpeed] = useState('1x');
  const [transitions, setTransitions] = useState([]);
  const [voiceover, setVoiceover] = useState(null);
  const [voiceoverFile, setVoiceoverFile] = useState(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('9:16');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [playingMusicId, setPlayingMusicId] = useState(null);
  
  // Load preferences from localStorage or use defaults
  const getInitialPrivacy = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('upload_privacy_preference');
      if (saved && ['public', 'friends', 'private'].includes(saved)) {
        return saved;
      }
    }
    return 'public';
  };

  const getInitialBool = (key, defaultValue) => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`upload_${key}_preference`);
      if (saved !== null) {
        return saved === 'true';
      }
    }
    return defaultValue;
  };

  const [videoData, setVideoData] = useState({
    caption: '',
    hashtags: '',
    privacy: getInitialPrivacy(),
    allowComments: getInitialBool('allowComments', true),
    allowDuet: getInitialBool('allowDuet', true),
    allowStitch: getInitialBool('allowStitch', true),
    location: '',
    music: null,
    coverImage: null,
    taggedFriends: [],
    ageRestriction: 'all',
    autoCaptions: false,
    shareToInstagram: false,
    shareToWhatsApp: false,
    shareToFacebook: false,
    shareToTwitter: false
  });

  const [videoInfo, setVideoInfo] = useState({
    duration: 0,
    size: 0,
    format: '',
    resolution: ''
  });

  const filterPresets = {
    None: 'none',
    Vintage: 'sepia(0.4) contrast(1.1) saturate(1.1)',
    'Black & White': 'grayscale(0.95) contrast(1.2)',
    Warm: 'contrast(1.05) saturate(1.2) sepia(0.2)',
    Cool: 'contrast(1.1) saturate(0.9) hue-rotate(180deg)',
    Bright: 'brightness(1.15) contrast(1.05)',
    Contrast: 'contrast(1.3) brightness(0.9)'
  };
  const availableStickers = ['😀', '😂', '😍', '🤔', '🔥', '💯', '🎉', '❤️', '👍', '✨', '⭐', '🎊'];
  const speedOptions = ['0.5x', '0.75x', '1x', '1.25x', '1.5x', '2x'];
  const transitionOptions = ['Zoom', 'Fade', 'Slide', 'Blur', 'Shake', 'Pulse'];
  const selectedFilterStyle = filterPresets[selectedFilter] || 'none';

  // Handle effect selection from EffectsLab
  useEffect(() => {
    if (location.state?.selectedEffect) {
      setSelectedEffectId(location.state.selectedEffect);
      // Show a message that effect is selected
      setUploadSuccess(`Effect selected! It will be applied when you record your video.`);
      setTimeout(() => setUploadSuccess(null), 3000);
    }
  }, [location.state]);

  // Calculate complete filter style including transitions
  const getCompleteFilterStyle = () => {
    let filter = selectedFilterStyle;
    if (transitions.includes('Blur')) {
      filter += (filter !== 'none' ? ' ' : '') + 'blur(2px)';
    }
    return filter || 'none';
  };

  // Calculate complete transform style including transitions
  const getCompleteTransformStyle = () => {
    let transforms = [];
    if (transitions.includes('Zoom')) {
      transforms.push('scale(1.1)');
    }
    if (transitions.includes('Shake')) {
      transforms.push('translateX(5px)');
    }
    return transforms.length > 0 ? transforms.join(' ') : 'none';
  };

  useEffect(() => {
    if (videoPlayerRef.current) {
      const numericSpeed = parseFloat(selectedSpeed) || 1;
      videoPlayerRef.current.playbackRate = numericSpeed;
    }
    // Also apply to edit panel video
    if (editVideoPlayerRef.current) {
      const numericSpeed = parseFloat(selectedSpeed) || 1;
      editVideoPlayerRef.current.playbackRate = numericSpeed;
    }
    // Sync music audio with video speed
    if (musicAudioRef.current) {
      const numericSpeed = parseFloat(selectedSpeed) || 1;
      musicAudioRef.current.playbackRate = numericSpeed;
    }
  }, [selectedSpeed]);

  // Sync music audio with video playback
  useEffect(() => {
    if (!videoPlayerRef.current || !videoData.music) {
      // Stop audio if no music selected
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        musicAudioRef.current.src = '';
      }
      return;
    }

    const video = videoPlayerRef.current;
    
    // If music has audioUrl, set it up
    if (videoData.music.audioUrl && musicAudioRef.current) {
      const audio = musicAudioRef.current;
      audio.src = videoData.music.audioUrl;
      audio.volume = 0.7; // Set volume to 70%
      audio.load();

      const handleVideoPlay = () => {
        audio.currentTime = video.currentTime;
        audio.play().catch((err) => {
          // Autoplay might be blocked - user needs to interact first
          console.log('Audio autoplay blocked:', err);
        });
      };

      const handleVideoPause = () => {
        audio.pause();
      };

      const handleVideoTimeUpdate = () => {
        if (!audio.paused && !video.paused) {
          // Keep audio in sync with video (within 0.2s tolerance)
          if (Math.abs(audio.currentTime - video.currentTime) > 0.2) {
            audio.currentTime = video.currentTime;
          }
        }
      };

      const handleVideoSeeked = () => {
        audio.currentTime = video.currentTime;
      };

      const handleVideoEnded = () => {
        audio.pause();
        audio.currentTime = 0;
      };

      video.addEventListener('play', handleVideoPlay);
      video.addEventListener('pause', handleVideoPause);
      video.addEventListener('timeupdate', handleVideoTimeUpdate);
      video.addEventListener('seeked', handleVideoSeeked);
      video.addEventListener('ended', handleVideoEnded);

      return () => {
        video.removeEventListener('play', handleVideoPlay);
        video.removeEventListener('pause', handleVideoPause);
        video.removeEventListener('timeupdate', handleVideoTimeUpdate);
        video.removeEventListener('seeked', handleVideoSeeked);
        video.removeEventListener('ended', handleVideoEnded);
      };
    }
  }, [videoData.music, videoPreview]);

  // Apply effects/transitions to video preview (both main and edit panel)
  useEffect(() => {
    if (videoPlayerRef.current) {
      const video = videoPlayerRef.current;
      video.style.transform = getCompleteTransformStyle();
      video.style.filter = getCompleteFilterStyle();
      video.style.transition = transitions.length > 0 ? 'all 0.3s ease-in-out' : 'none';
    }
    // Also apply to edit panel video for live preview
    if (editVideoPlayerRef.current) {
      const video = editVideoPlayerRef.current;
      video.style.transform = getCompleteTransformStyle();
      video.style.filter = getCompleteFilterStyle();
      video.style.transition = transitions.length > 0 ? 'all 0.3s ease-in-out' : 'none';
    }
  }, [transitions, selectedFilter, selectedFilterStyle]);

  useEffect(() => {
    return () => {
      if (voiceover?.src && voiceover.src.startsWith('blob:')) {
        URL.revokeObjectURL(voiceover.src);
      }
    };
  }, [voiceover]);

  // Get text style classes based on style name
  const getTextStyleClass = (style) => {
    const styleMap = {
      'Bold': 'text-bold',
      'Italic': 'text-italic',
      'Outline': 'text-outline',
      'Shadow': 'text-shadow',
      'Neon': 'text-neon',
      'Rainbow': 'text-rainbow'
    };
    return styleMap[style] || '';
  };

  const handleAddTextOverlay = () => {
    const content = textInput.trim();
    if (!content) {
      return;
    }
    setTextOverlays((prev) => [
      ...prev,
      {
        id: Date.now(),
        content,
        style: selectedTextStyle,
        x: 50, // Default center position (percentage)
        y: 20 + (prev.length * 15) // Stagger vertically
      }
    ]);
    setTextInput('');
    setSelectedTextStyle(null); // Reset style after adding
  };

  const handleRemoveTextOverlay = (id) => {
    setTextOverlays((prev) => prev.filter((overlay) => overlay.id !== id));
  };

  const handleRemoveSticker = (id) => {
    setStickers((prev) => prev.filter((sticker) => sticker.id !== id));
  };

  const toggleSticker = (emoji) => {
    setStickers((prev) => {
      const existingIndex = prev.findIndex(s => s.emoji === emoji);
      if (existingIndex >= 0) {
        // Remove if already exists
        return prev.filter((_, index) => index !== existingIndex);
      } else {
        // Add new sticker with position
        return [...prev, {
          id: Date.now(),
          emoji,
          x: 20 + (prev.length % 3) * 30, // Grid positioning
          y: 20 + Math.floor(prev.length / 3) * 20
        }];
      }
    });
  };

  // Drag handlers for text and stickers
  const handleMouseDown = (e, type, id) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setDraggingElement({ type, id });
    setDragOffset({ x, y });
  };

  const handleMouseMove = (e) => {
    if (!draggingElement) return;
    
    const videoContainer = e.currentTarget.closest('.video-preview, .edit-modal-preview');
    if (!videoContainer) return;
    
    const rect = videoContainer.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    if (draggingElement.type === 'text') {
      setTextOverlays((prev) =>
        prev.map((overlay) =>
          overlay.id === draggingElement.id
            ? { ...overlay, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
            : overlay
        )
      );
    } else if (draggingElement.type === 'sticker') {
      setStickers((prev) =>
        prev.map((sticker) =>
          sticker.id === draggingElement.id
            ? { ...sticker, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
            : sticker
        )
      );
    }
  };

  const handleMouseUp = () => {
    setDraggingElement(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const toggleTransition = (name) => {
    setTransitions((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]));
  };

  const handleVoiceoverFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('audio/')) {
      setUploadError('Please select a valid audio file');
      setTimeout(() => setUploadError(null), 3000);
      return;
    }
    
    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('Audio file size must be less than 50MB');
      setTimeout(() => setUploadError(null), 3000);
      return;
    }
    
    if (voiceover?.src && voiceover.src.startsWith('blob:')) {
      URL.revokeObjectURL(voiceover.src);
    }
    const url = URL.createObjectURL(file);
    setVoiceover({
      src: url,
      name: file.name,
      size: file.size
    });
    setVoiceoverFile(file); // Store the actual File object
  };

  const handleClearVoiceover = () => {
    if (voiceover?.src && voiceover.src.startsWith('blob:')) {
      URL.revokeObjectURL(voiceover.src);
    }
    setVoiceover(null);
    setVoiceoverFile(null);
    // Reset the file input
    if (voiceoverInputRef.current) {
      voiceoverInputRef.current.value = '';
    }
  };

  // Handle music file selection from gallery
  const handleMusicFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('audio/')) {
      setUploadError('Please select a valid audio file (MP3, WAV, etc.)');
      setTimeout(() => setUploadError(null), 3000);
      if (musicFileInputRef.current) {
        musicFileInputRef.current.value = '';
      }
      return;
    }
    
    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('Audio file size must be less than 50MB');
      setTimeout(() => setUploadError(null), 3000);
      if (musicFileInputRef.current) {
        musicFileInputRef.current.value = '';
      }
      return;
    }

    // Create blob URL for preview
    const audioUrl = URL.createObjectURL(file);
    
    // Get audio duration
    const audio = new Audio(audioUrl);
    audio.addEventListener('loadedmetadata', () => {
      const duration = Math.round(audio.duration);
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      // Create music object from selected file
      const selectedMusic = {
        id: Date.now(), // Unique ID
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        artist: 'My Music',
        duration: durationStr,
        isTrending: false,
        category: 'gallery',
        audioUrl: audioUrl,
        file: file // Store file for upload
      };

      // Set as selected music
      setVideoData({...videoData, music: selectedMusic});
      setUploadSuccess(`Music selected: ${selectedMusic.name}`);
      setTimeout(() => {
        setUploadSuccess(null);
        setShowMusicLibrary(false);
      }, 1500);

      // Clean up
      audio.removeEventListener('loadedmetadata', () => {});
    });

    // Reset file input
    if (musicFileInputRef.current) {
      musicFileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (file) => {
    console.log('handleFileSelect called with file:', file?.name);
    if (file && file.type.startsWith('video/')) {
      if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
        setUploadError(`Video must be smaller than ${MAX_VIDEO_MB}MB.`);
        // Reset file input after error
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
      const url = URL.createObjectURL(file);
      console.log('Setting uploadedVideo state...');
      setUploadedVideo(file);
      setVideoPreview(url);
      setUploadError(null);
      setUploadSuccess(null);
      console.log('Video state updated! uploadedVideo should be set now.');
      
      // Reset file input value after successful selection to allow selecting again
      setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 100);
      
      // Get video info
      const video = document.createElement('video');
      video.src = url;
      video.onloadedmetadata = () => {
        const duration = Math.round(video.duration);
        if (duration > MAX_VIDEO_SECONDS) {
          setUploadError('Video must be 10 minutes or shorter.');
          setUploadedVideo(null);
          setVideoPreview(null);
          setVideoInfo({
            duration: 0,
            size: 0,
            format: '',
            resolution: ''
          });
          URL.revokeObjectURL(url);
          return;
        }
        setVideoInfo({
          duration: duration,
          size: (file.size / (1024 * 1024)).toFixed(2),
          format: file.type.split('/')[1].toUpperCase(),
          resolution: `${video.videoWidth}x${video.videoHeight}`
        });
        setCropEnd(duration); // Initialize cropEnd to full duration
      };
    } else {
      alert('Please select a valid video file');
      setUploadError('Please select a valid video file.');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    console.log('File input onChange triggered!', e.target.files);
    const file = e.target.files && e.target.files[0];
    if (file) {
      console.log('File selected:', file.name, file.type, file.size);
      handleFileSelect(file);
    } else {
      console.warn('No file selected');
    }
    // Don't reset value immediately - let it reset after file is processed
    // This allows the file input to work multiple times
  };

  // Handle button click to trigger file input - INSTANT (no delays)
  const handleSelectFileClick = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Direct click - no delays, no retries, instant
    const fileInput = fileInputRef.current || document.getElementById('video-upload-input');
    if (fileInput) {
      fileInput.click();
    }
  };

  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

  const buildMetadata = () => {
    const parsedHashtags = videoData.hashtags
      .split(/[\s,#]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => (tag.startsWith('#') ? tag.slice(1) : tag));

    return {
      caption: videoData.caption.trim(),
      hashtags: parsedHashtags,
      privacy: videoData.privacy,
      allowComments: videoData.allowComments,
      allowDuet: videoData.allowDuet,
      allowStitch: videoData.allowStitch,
      location: videoData.location,
      taggedFriends: videoData.taggedFriends,
      ageRestriction: videoData.ageRestriction,
      autoCaptions: videoData.autoCaptions,
      music: videoData.music,
      shareTargets: {
        instagram: videoData.shareToInstagram,
        whatsapp: videoData.shareToWhatsApp,
        facebook: videoData.shareToFacebook,
        twitter: videoData.shareToTwitter
      },
      crop: {
        start: cropStart,
        end: cropEnd > 0 ? cropEnd : videoInfo.duration
      },
      editor: {
        filter: selectedFilter,
        textOverlays,
        stickers,
        speed: selectedSpeed,
        transitions,
        voiceover: !!voiceover
      },
      voiceoverFile: voiceoverFile, // Include the actual File object
      duration: videoInfo.duration,
      format: videoInfo.format,
      resolution: videoInfo.resolution,
      sizeMB: videoInfo.size
    };
  };

  const getMinScheduleValue = () => {
    const date = new Date(Date.now() + 5 * 60 * 1000);
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
  };

  const closeAfterSuccess = () => {
    console.log('closeAfterSuccess called'); // Debug log
    // Reset form immediately
    handleDiscard();
    
    // Close page immediately after form reset (delay already handled in handlePost)
    if (typeof onClose === 'function') {
      console.log('Calling onClose...'); // Debug log
      onClose();
    } else {
      console.warn('onClose is not a function'); // Debug log
    }
  };

  const createUploadFormData = (file, metadata) => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('description', metadata.caption || '');

    if (metadata.hashtags?.length) {
      formData.append('hashtags', metadata.hashtags.join(','));
    }

    formData.append('privacy', metadata.privacy);
    formData.append('isPrivate', boolToString(metadata.privacy === 'private'));
    formData.append('allowComments', boolToString(metadata.allowComments));
    formData.append('allowDuet', boolToString(metadata.allowDuet));
    formData.append('allowStitch', boolToString(metadata.allowStitch));

    if (metadata.taggedFriends?.length) {
      formData.append('taggedFriends', JSON.stringify(metadata.taggedFriends));
    }

    if (metadata.music) {
      formData.append('music', JSON.stringify(metadata.music));
    }

    if (metadata.crop) {
      formData.append('cropStart', String(metadata.crop.start ?? 0));
      formData.append('cropEnd', String(metadata.crop.end ?? metadata.crop.start ?? 0));
    }

    if (metadata.editor?.filter) {
      formData.append('filter', metadata.editor.filter);
    }

    if (metadata.editor?.transitions?.length) {
      formData.append('effects', JSON.stringify(metadata.editor.transitions));
    }

    if (metadata.editor?.speed) {
      formData.append('speed', metadata.editor.speed);
    }

    // Append voiceover file if exists
    if (metadata.voiceoverFile) {
      formData.append('voiceover', metadata.voiceoverFile);
    }

    formData.append('ageRestriction', metadata.ageRestriction);
    formData.append('autoCaptions', boolToString(metadata.autoCaptions));

    formData.append('shareToInstagram', boolToString(metadata.shareTargets.instagram));
    formData.append('shareToWhatsApp', boolToString(metadata.shareTargets.whatsapp));
    formData.append('shareToFacebook', boolToString(metadata.shareTargets.facebook));
    formData.append('shareToTwitter', boolToString(metadata.shareTargets.twitter));

    formData.append('metadata', JSON.stringify(metadata));

    return formData;
  };

  const extractUploadError = (error) => {
    const fallback = error?.message || 'Failed to upload video. Please try again.';
    const data = error?.response?.data;
    if (!data) {
      return fallback;
    }
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      return `${data.message || fallback} (${data.errors.join(', ')})`;
    }
    if (data.detail) {
      return `${data.message || fallback} (${data.detail})`;
    }
    return data.message || fallback;
  };

  const handlePost = async () => {
    if (!uploadedVideo) {
      alert('Please select a video to upload');
      return;
    }

    if (!videoData.caption.trim()) {
      alert('Please add a caption for your video');
      return;
    }

    if (videoInfo.duration > MAX_VIDEO_SECONDS) {
      setUploadError('Video must be 10 minutes or shorter.');
      return;
    }

    if (scheduleEnabled) {
      if (!scheduleDate) {
        setUploadError('Select a publish time to schedule your video.');
        return;
      }
      const publishAt = new Date(scheduleDate);
      if (Number.isNaN(publishAt.getTime()) || publishAt.getTime() <= Date.now()) {
        setUploadError('Choose a future publish time.');
        return;
      }
    }

    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const metadata = buildMetadata();
      const formData = createUploadFormData(uploadedVideo, metadata);

      let response;
      try {
        // Track if we're waiting for response (progress can be 100% but response not received yet)
        let uploadComplete = false;
        
        response = await uploadVideo(formData, (event) => {
          if (event?.total) {
            const progress = Math.min(99, Math.round((event.loaded / event.total) * 100)); // Cap at 99% until response received
            setUploadProgress(progress);
            console.log('Upload progress:', progress + '%'); // Debug log
            
            // If progress is 100%, file upload is complete but waiting for server response
            if (progress >= 99 && !uploadComplete) {
              console.log('File upload complete, waiting for server response...');
              setUploadProgress(99); // Keep at 99% until response
            }
          }
        });
        
        uploadComplete = true;
        setUploadProgress(100); // Now set to 100% since we have response
        console.log('Upload response received:', response); // Debug log
      } catch (uploadError) {
        console.error('Upload request failed:', uploadError);
        setUploadProgress(0); // Reset progress on error
        throw uploadError;
      }

      // uploadVideo returns response.data, so response is already the data object
      // Backend returns: { success: true, message: string, video: { id, status, url, thumbnail, ... } }
      if (!response) {
        throw new Error('No response received from server. Please try again.');
      }

      const responseVideo = response?.video || response;
      
      const uploadedVideoId =
        responseVideo?.id ||
        responseVideo?._id ||
        response?.id ||
        response?.videoId;

      console.log('Extracted video ID:', uploadedVideoId); // Debug log

      if (!uploadedVideoId) {
        console.error('Response structure:', JSON.stringify(response, null, 2));
        throw new Error('Video ID not found in response. Please try again.');
      }

      // Set success message first
      if (scheduleEnabled && scheduleDate) {
        const publishAt = new Date(scheduleDate);
        try {
          await scheduleVideo({
            videoId: uploadedVideoId,
            publishAt: publishAt.toISOString(),
            metadata
          });
          setUploadSuccess('Video scheduled successfully! 📅');
        } catch (scheduleError) {
          console.error('Schedule error:', scheduleError);
          setUploadSuccess('Video uploaded successfully! 📅 (Scheduling failed)');
        }
      } else {
        setUploadSuccess('Video uploaded successfully! 🎉');
      }

      // Progress already set to 100% when response received
      
      // Scroll to success message on mobile/tablet
      setTimeout(() => {
        if (feedbackRef.current) {
          feedbackRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 100);
      
      // Dispatch event to refresh feed immediately
      try {
        window.dispatchEvent(new CustomEvent('videoUploaded', {
          detail: {
            video: responseVideo ?? null,
            metadata,
            scheduled: Boolean(scheduleEnabled && scheduleDate)
          }
        }));
        console.log('Video uploaded event dispatched'); // Debug log
      } catch (eventError) {
        console.error('Failed to dispatch event:', eventError);
      }
      
      // Close after success - ensure all state updates are complete
      setTimeout(() => {
        console.log('Closing upload page...'); // Debug log
        closeAfterSuccess();
      }, 1500); // Give 1.5 seconds to show success message
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = extractUploadError(error);
      setUploadError(errorMessage);
      
      // Scroll to error message on mobile/tablet
      setTimeout(() => {
        if (feedbackRef.current) {
          feedbackRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 100);
      
      // Show error toast if available
      if (typeof window.showToast === 'function') {
        window.showToast(errorMessage, 'error');
      }
      
      // Reset upload progress on error
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDraft = async () => {
    if (!uploadedVideo) {
      alert('Please select a video first');
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);
    setUploadProgress(20);

    try {
      const metadata = buildMetadata();
      const base64Video = await readFileAsBase64(uploadedVideo);
      await saveDraft({
        ...metadata,
        video: base64Video,
        preview: videoPreview,
        savedAt: new Date().toISOString()
      });
      setUploadSuccess('Draft saved successfully! 📝');
    } catch (error) {
      console.error('Draft error:', error);
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to save draft right now.';
      setUploadError(message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handlePromote = async () => {
    if (!uploadedVideo) {
      alert('Please select a video first');
      return;
    }

    if (!videoData.caption.trim()) {
      alert('Please add a caption for your video');
      return;
    }

    if (videoInfo.duration > MAX_VIDEO_SECONDS) {
      setUploadError('Video must be 10 minutes or shorter.');
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const metadata = { ...buildMetadata(), promoted: true };
      const formData = createUploadFormData(uploadedVideo, metadata);

      const response = await uploadVideo(formData, (event) => {
        if (event?.total) {
          const progress = Math.min(100, Math.round((event.loaded / event.total) * 100));
          setUploadProgress(progress);
        }
      });

      const uploadedVideoId =
        response?.video?.id ||
        response?.video?._id ||
        response?.id ||
        response?.videoId;

      await promoteVideo(uploadedVideoId);
      setUploadSuccess('Video promoted and uploaded successfully! 🚀💰');
      setUploadProgress(100);
      window.dispatchEvent(new CustomEvent('videoUploaded', {
        detail: {
          video: response?.video ?? null,
          metadata,
          promoted: true
        }
      }));
      closeAfterSuccess();
    } catch (error) {
      console.error('Promote error:', error);
      const errorMessage = extractUploadError(error);
      setUploadError(errorMessage);
      
      // Show error toast if available
      if (typeof window.showToast === 'function') {
        window.showToast(errorMessage, 'error');
      }
      
      // Reset upload progress on error
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDiscard = () => {
    setUploadedVideo(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoPreview(null);
    setVideoData({
      caption: '',
      hashtags: '',
      privacy: 'public',
      allowComments: true,
      allowDuet: true,
      allowStitch: true,
      location: '',
      music: null,
      coverImage: null,
      taggedFriends: [],
      ageRestriction: 'all',
      autoCaptions: false,
      shareToInstagram: false,
      shareToWhatsApp: false,
      shareToFacebook: false,
      shareToTwitter: false
    });
    setVideoInfo({
      duration: 0,
      size: 0,
      format: '',
      resolution: ''
    });
    setUploadProgress(0);
    setIsUploading(false);
    setCropStart(0);
    setCropEnd(0);
    setShowMusicLibrary(false);
    setShowEditPanel(false);
    setScheduleEnabled(false);
    setScheduleDate('');
    setUploadError(null);
    setUploadSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Calculate adjusted duration based on speed
  const getAdjustedDuration = () => {
    if (!videoInfo.duration) return 0;
    const speed = parseFloat(selectedSpeed) || 1;
    return videoInfo.duration / speed;
  };

  // Calculate aspect ratio styles for video preview
  const getAspectRatioStyle = () => {
    const aspectRatios = {
      '9:16': { aspectRatio: '9/16', maxWidth: '100%', maxHeight: '80vh' },
      '1:1': { aspectRatio: '1/1', maxWidth: '60vh', maxHeight: '60vh' },
      '16:9': { aspectRatio: '16/9', maxWidth: '100%', maxHeight: '60vh' },
      '4:5': { aspectRatio: '4/5', maxWidth: '80%', maxHeight: '80vh' }
    };
    return aspectRatios[selectedAspectRatio] || aspectRatios['9:16'];
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };




  // Prevent horizontal scroll on body when upload page is open
  useEffect(() => {
    document.body.classList.add('upload-page-open');
    document.documentElement.classList.add('upload-page-open');
    
    return () => {
      document.body.classList.remove('upload-page-open');
      document.documentElement.classList.remove('upload-page-open');
    };
  }, []);

  // Real-time crop preview effect
  useEffect(() => {
    if (videoPlayerRef.current && showEditPanel) {
      const video = videoPlayerRef.current;
      
      // Update video current time based on crop sliders
      const updateVideoTime = () => {
        if (cropStart > 0 || cropEnd < videoInfo.duration) {
          // Show middle of crop range
          const middleTime = (cropStart + cropEnd) / 2;
          video.currentTime = middleTime;
        }
      };
      
      updateVideoTime();
    }
  }, [cropStart, cropEnd, showEditPanel, videoInfo.duration]);

  const suggestedHashtags = ['#fyp', '#viral', '#trending', '#tiktok', '#foryou', '#dance', '#comedy', '#music'];

  // Fallback Punjabi Songs (25+ songs)
  const getFallbackPunjabiSongs = () => {
    return [
      { id: 1, name: 'Brown Munde', artist: 'AP Dhillon', duration: '3:15', isTrending: true, category: 'trending', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3' },
      { id: 2, name: 'Insane', artist: 'AP Dhillon', duration: '2:45', isTrending: true, category: 'trending', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-assets/Epoq-Lepidoptera.ogg' },
      { id: 3, name: 'Excuses', artist: 'AP Dhillon', duration: '2:55', isTrending: true, category: 'trending', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Sevish_-__nbsp_.mp3' },
      { id: 4, name: 'Dil Nu', artist: 'AP Dhillon', duration: '3:20', isTrending: false, category: 'popular', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-assets/Epoq-Lepidoptera.ogg' },
      { id: 5, name: 'Summer High', artist: 'AP Dhillon', duration: '2:50', isTrending: true, category: 'trending', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3' },
      { id: 6, name: 'Desires', artist: 'AP Dhillon', duration: '3:05', isTrending: false, category: 'popular', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-assets/Epoq-Lepidoptera.ogg' },
      { id: 7, name: 'Tere Te', artist: 'AP Dhillon', duration: '2:40', isTrending: true, category: 'trending', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Sevish_-__nbsp_.mp3' },
      { id: 8, name: 'Arrogant', artist: 'AP Dhillon', duration: '3:10', isTrending: false, category: 'popular', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-assets/Epoq-Lepidoptera.ogg' },
      { id: 9, name: 'Sakhiyaan', artist: 'Maninder Buttar', duration: '3:25', isTrending: true, category: 'trending', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3' },
      { id: 10, name: 'Jatt Da Muqabala', artist: 'Sidhu Moose Wala', duration: '3:15', isTrending: true, category: 'trending', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-assets/Epoq-Lepidoptera.ogg' },
      { id: 11, name: '295', artist: 'Sidhu Moose Wala', duration: '3:30', isTrending: false, category: 'popular', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Sevish_-__nbsp_.mp3' },
      { id: 12, name: 'So High', artist: 'Sidhu Moose Wala', duration: '3:20', isTrending: true, category: 'trending', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-assets/Epoq-Lepidoptera.ogg' },
      { id: 13, name: 'Same Beef', artist: 'Bohemia', duration: '3:45', isTrending: false, category: 'popular', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3' },
      { id: 14, name: 'Dil Diyaan Gallan', artist: 'Atif Aslam', duration: '3:50', isTrending: false, category: 'popular', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-assets/Epoq-Lepidoptera.ogg' },
      { id: 15, name: 'Lamberghini', artist: 'Guru Randhawa', duration: '3:10', isTrending: true, category: 'trending', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Sevish_-__nbsp_.mp3' },
      { id: 16, name: 'High Rated Gabru', artist: 'Guru Randhawa', duration: '3:25', isTrending: false, category: 'popular', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-assets/Epoq-Lepidoptera.ogg' },
      { id: 17, name: 'Suit Suit', artist: 'Guru Randhawa', duration: '3:15', isTrending: true, category: 'trending', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3' },
      { id: 18, name: 'Naah', artist: 'Jassie Gill', duration: '3:05', isTrending: false, category: 'popular', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-assets/Epoq-Lepidoptera.ogg' },
      { id: 19, name: 'Proper Patola', artist: 'Diljit Dosanjh', duration: '3:20', isTrending: true, category: 'trending', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Sevish_-__nbsp_.mp3' },
      { id: 20, name: 'Lak 28 Kudi Da', artist: 'Diljit Dosanjh', duration: '3:30', isTrending: false, category: 'popular', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-assets/Epoq-Lepidoptera.ogg' },
      { id: 21, name: 'Do You Know', artist: 'Diljit Dosanjh', duration: '3:15', isTrending: true, category: 'trending', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3' },
      { id: 22, name: 'Patiala Peg', artist: 'Diljit Dosanjh', duration: '3:40', isTrending: false, category: 'popular', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-assets/Epoq-Lepidoptera.ogg' },
      { id: 23, name: 'Jatt Da Muqabala', artist: 'Sidhu Moose Wala', duration: '3:15', isTrending: false, category: 'recent', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Sevish_-__nbsp_.mp3' },
      { id: 24, name: 'Kala Chashma', artist: 'Badshah', duration: '3:25', isTrending: false, category: 'recent', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-assets/Epoq-Lepidoptera.ogg' },
      { id: 25, name: 'Tareefan', artist: 'Badshah', duration: '3:20', isTrending: true, category: 'trending', audioUrl: 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3' }
    ];
  };

  // Fetch music from backend API when music library modal opens
  useEffect(() => {
    const loadMusicFromBackend = async () => {
      if (!showMusicLibrary) return;
      
      setLoadingMusic(true);
      try {
        console.log('🔄 Fetching music from backend...');
        // Fetch trending sounds from backend
        const response = await getTrendingSounds(50, 'all');
        
        if (response && response.success && response.sounds && response.sounds.length > 0) {
          const musicList = response.sounds.map((sound, index) => ({
            id: sound._id || sound.id || `sound-${index}`,
            name: sound.name || 'Unknown',
            artist: sound.artist || 'Unknown Artist',
            duration: sound.formattedDuration || sound.duration || '0:00',
            isTrending: sound.isTrending || false,
            category: sound.genre || 'trending',
            audioUrl: sound.audioUrl || sound.url || '',
            thumbnail: sound.coverImage || sound.thumbnail || ''
          }));
          
          setMusicLibrary(musicList);
          console.log('✅ Music loaded from database:', musicList.length, 'sounds');
        } else {
          // Fallback to hardcoded music if API fails - 20+ Punjabi Songs
          console.warn('⚠️ API returned no music, using fallback');
          setMusicLibrary(getFallbackPunjabiSongs());
        }
      } catch (error) {
        console.error('❌ Error loading music from backend:', error);
        // Fallback to hardcoded music on error - 20+ Punjabi Songs
        setMusicLibrary(getFallbackPunjabiSongs());
      } finally {
        setLoadingMusic(false);
      }
    };

    loadMusicFromBackend();
  }, [showMusicLibrary]);

  // Handle online music search
  const handleMusicSearch = async (query) => {
    if (!query || query.trim().length < 2) {
      setOnlineMusicResults([]);
      return;
    }

    setSearchingMusic(true);
    try {
      console.log('🔍 Searching online music for:', query);
      const response = await searchOnlineMusic(query, 30);
      
      if (response && response.success && response.sounds) {
        const formattedResults = response.sounds.map((sound, index) => ({
          id: sound._id || sound.id || `online-${index}`,
          name: sound.name || 'Unknown',
          artist: sound.artist || 'Unknown Artist',
          duration: sound.formattedDuration || sound.duration || '0:00',
          isTrending: sound.isTrending || false,
          category: sound.genre || 'trending',
          audioUrl: sound.audioUrl || sound.url || '',
          thumbnail: sound.coverImage || sound.thumbnail || '',
          isOnline: sound.isOnline || false,
          source: sound.source || 'online'
        }));
        
        setOnlineMusicResults(formattedResults);
        console.log('✅ Online music search results:', formattedResults.length);
      } else {
        setOnlineMusicResults([]);
      }
    } catch (error) {
      console.error('❌ Error searching online music:', error);
      setOnlineMusicResults([]);
    } finally {
      setSearchingMusic(false);
    }
  };

  // Debounced search function
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (musicSearchQuery.trim().length >= 2) {
        handleMusicSearch(musicSearchQuery.trim());
      } else {
        setOnlineMusicResults([]);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [musicSearchQuery]);

  // Filter music based on selected category
  const getFilteredMusic = () => {
    // If searching online, return online results
    if (musicSearchQuery.trim().length >= 2 && onlineMusicResults.length > 0) {
      return onlineMusicResults;
    }

    // Otherwise, filter by category
    if (selectedMusicCategory === 'trending') {
      return musicLibrary.filter(music => music.isTrending);
    } else if (selectedMusicCategory === 'popular') {
      return musicLibrary.filter(music => music.category === 'popular');
    } else if (selectedMusicCategory === 'recent') {
      return musicLibrary.filter(music => music.category === 'recent');
    } else if (selectedMusicCategory === 'gallery') {
      return musicLibrary.filter(music => music.category === 'gallery');
    }
    return musicLibrary;
  };

  const handleOverlayClick = (e) => {
    // Only close if clicking directly on overlay, not on container
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="upload-page-overlay" onClick={handleOverlayClick}>
      <div className="upload-page-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="upload-header">
          <button className="upload-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h1>Upload your video</h1>
          <div className="upload-header-placeholder"></div>
        </div>

        {/* Main Content */}
        <div className="upload-content">
          {/* Left Side - Video Preview */}
          <div className="video-preview-section">
            <div className="preview-container">
              {videoPreview ? (
                <div className="video-preview">
                  <video
                    ref={videoPlayerRef}
                    src={videoPreview}
                    controls
                    className="preview-video"
                    style={{ 
                      filter: getCompleteFilterStyle(),
                      transform: getCompleteTransformStyle(),
                      transition: transitions.length > 0 ? 'all 0.3s ease-in-out' : 'none',
                      ...getAspectRatioStyle(),
                      objectFit: 'contain'
                    }}
                    poster=""
                  />
                  {/* Hidden audio element for music playback */}
                  {videoData.music && (
                    <audio
                      ref={musicAudioRef}
                      preload="auto"
                      style={{ display: 'none' }}
                      volume={0.7}
                    />
                  )}
                  {textOverlays.length > 0 && (
                    <div 
                      className="text-overlays-preview"
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    >
                      {textOverlays.map((overlay) => (
                        <span 
                          key={overlay.id} 
                          className={`text-overlay-preview-item ${overlay.style ? getTextStyleClass(overlay.style) : ''}`}
                          style={{
                            position: 'absolute',
                            left: `${overlay.x || 50}%`,
                            top: `${overlay.y || 20}%`,
                            transform: 'translate(-50%, -50%)',
                            cursor: draggingElement?.type === 'text' && draggingElement?.id === overlay.id ? 'grabbing' : 'grab',
                            pointerEvents: 'auto',
                            userSelect: 'none'
                          }}
                          onMouseDown={(e) => handleMouseDown(e, 'text', overlay.id)}
                        >
                          {overlay.content}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Stickers Preview */}
                  {stickers.length > 0 && (
                    <div 
                      className="stickers-preview"
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    >
                      {stickers.map((sticker) => (
                        <span 
                          key={sticker.id} 
                          className="sticker-preview-item"
                          style={{
                            position: 'absolute',
                            left: `${sticker.x || 20}%`,
                            top: `${sticker.y || 20}%`,
                            transform: 'translate(-50%, -50%)',
                            fontSize: '48px',
                            cursor: draggingElement?.type === 'sticker' && draggingElement?.id === sticker.id ? 'grabbing' : 'grab',
                            pointerEvents: 'auto',
                            zIndex: 10,
                            textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
                            userSelect: 'none'
                          }}
                          onMouseDown={(e) => handleMouseDown(e, 'sticker', sticker.id)}
                        >
                          {sticker.emoji}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Music Info Overlay - REMOVED: Now using checkmark icon in music list instead */}
                  {/* {(selectedMusic || videoData.music) && (
                    <div className="music-info-overlay" style={{
                      position: 'absolute',
                      bottom: '80px',
                      left: '16px',
                      right: '16px',
                      background: 'rgba(0, 0, 0, 0.7)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      zIndex: 15,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: '#FF0050',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '18px'
                      }}>
                        <i className="fa-solid fa-music"></i>
                      </div>
                      <div style={{ flex: 1, color: '#fff' }}>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{(selectedMusic || videoData.music).name}</div>
                        <div style={{ fontSize: '12px', opacity: 0.8 }}>{(selectedMusic || videoData.music).artist}</div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedMusic(null);
                          setVideoData({...videoData, music: null});
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                        title="Remove music"
                      >
                        <i className="fa-solid fa-times"></i>
                      </button>
                    </div>
                  )} */}
                  
                  <div className="video-info-overlay">
                    <div className="video-stats">
                      <div className="stat-item">
                        <i className="fa-solid fa-clock"></i>
                        <span>
                          {formatDuration(videoInfo.duration)}
                          {selectedSpeed !== '1x' && (
                            <span style={{ marginLeft: '8px', color: '#FF0050', fontWeight: 600 }}>
                              ({formatDuration(getAdjustedDuration())} at {selectedSpeed})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="stat-item">
                        <i className="fa-solid fa-file"></i>
                        <span>{videoInfo.size} MB</span>
                      </div>
                      <div className="stat-item">
                        <i className="fa-solid fa-video"></i>
                        <span>{videoInfo.format}</span>
                      </div>
                      <div className="stat-item">
                        <i className="fa-solid fa-expand"></i>
                        <span>{videoInfo.resolution}</span>
                      </div>
                    </div>
                  </div>
                  <div className="video-preview-actions">
                    <button 
                      className="edit-btn"
                      onClick={() => setShowEditPanel(!showEditPanel)}
                    >
                      <i className="fa-solid fa-edit"></i>
                      Edit
                    </button>
                    <button 
                      className="music-btn"
                      onClick={() => setShowMusicLibrary(!showMusicLibrary)}
                    >
                      <i className="fa-solid fa-music"></i>
                      Music
                    </button>
                    <button 
                      className="change-video-btn"
                      onClick={() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.click();
                        } else {
                          const fileInput = document.getElementById('video-upload-input');
                          if (fileInput) {
                            fileInput.click();
                          }
                        }
                      }}
                    >
                      <i className="fa-solid fa-exchange-alt"></i>
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  className={`upload-drop-zone ${isDragging ? 'dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={(e) => {
                    // Only trigger if clicking directly on drop zone, not on child button
                    if (e.target === e.currentTarget || e.target.classList.contains('drop-zone-content') || e.target.closest('.drop-zone-content')) {
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }
                  }}
                >
                  <div className="drop-zone-content">
                    <div className="upload-icon">
                      <i className="fa-solid fa-cloud-upload-alt"></i>
                    </div>
                    <h3>Select video to upload</h3>
                    <p>Or drag and drop a file</p>
                    <div className="upload-requirements">
                      <div className="requirement-item">
                        <i className="fa-solid fa-check"></i>
                        <span>MP4, MOV, AVI, WebM</span>
                      </div>
                      <div className="requirement-item">
                        <i className="fa-solid fa-check"></i>
                        <span>Up to 10 minutes</span>
                      </div>
                      <div className="requirement-item">
                        <i className="fa-solid fa-check"></i>
                        <span>Less than 2GB</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="select-file-btn"
                      onClick={handleSelectFileClick}
                    >
                      Select file
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Upload Form */}
          <div className="upload-form-section">
            <div className="form-container">
              {/* User Info */}
              <div className="user-info">
                <div className="user-avatar">
                  <img
                    src={user?.profile?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=FF3B6E&color=fff`}
                    alt={user?.username}
                  />
                </div>
                <div className="user-details">
                  <h3>{user?.profile?.displayName || user?.username}</h3>
                  <p>@{user?.username}</p>
                </div>
              </div>

              {/* Caption */}
              <div className="form-group">
                <label>Caption</label>
                <textarea
                  placeholder="Describe your video..."
                  value={videoData.caption}
                  onChange={(e) => setVideoData({...videoData, caption: e.target.value})}
                  maxLength="2200"
                  rows="4"
                />
                <div className="char-count">
                  {videoData.caption.length}/2200
                </div>
              </div>

              {/* Hashtags */}
              <div className="form-group">
                <label>Hashtags</label>
                <input
                  type="text"
                  placeholder="#fyp #viral #trending"
                  value={videoData.hashtags}
                  onChange={(e) => setVideoData({...videoData, hashtags: e.target.value})}
                />
                <div className="suggested-hashtags">
                  {suggestedHashtags.map((tag, index) => (
                    <button
                      key={index}
                      className="hashtag-btn"
                      onClick={() => {
                        const currentTags = videoData.hashtags;
                        if (!currentTags.includes(tag)) {
                          setVideoData({
                            ...videoData,
                            hashtags: currentTags ? `${currentTags} ${tag}` : tag
                          });
                        }
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy Settings */}
              <div className="form-group">
                <label>Who can view this video</label>
                <div className="privacy-options">
                  <div 
                    className={`privacy-option ${videoData.privacy === 'public' ? 'selected' : ''}`}
                    onClick={() => {
                      const newPrivacy = 'public';
                      setVideoData({...videoData, privacy: newPrivacy});
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('upload_privacy_preference', newPrivacy);
                      }
                    }}
                  >
                    <i className="fa-solid fa-globe"></i>
                    <div className="privacy-info">
                      <h4>Public</h4>
                      <p>Anyone can view</p>
                    </div>
                  </div>
                  <div 
                    className={`privacy-option ${videoData.privacy === 'friends' ? 'selected' : ''}`}
                    onClick={() => {
                      const newPrivacy = 'friends';
                      setVideoData({...videoData, privacy: newPrivacy});
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('upload_privacy_preference', newPrivacy);
                      }
                    }}
                  >
                    <i className="fa-solid fa-users"></i>
                    <div className="privacy-info">
                      <h4>Friends</h4>
                      <p>Only friends can view</p>
                    </div>
                  </div>
                  <div 
                    className={`privacy-option ${videoData.privacy === 'private' ? 'selected' : ''}`}
                    onClick={() => {
                      const newPrivacy = 'private';
                      setVideoData({...videoData, privacy: newPrivacy});
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('upload_privacy_preference', newPrivacy);
                      }
                    }}
                  >
                    <i className="fa-solid fa-lock"></i>
                    <div className="privacy-info">
                      <h4>Private</h4>
                      <p>Only you can view</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interaction Settings */}
              <div className="form-group">
                <label>Allow users to</label>
                <div className="interaction-settings">
                  <div className="setting-item">
                    <span>Comment</span>
                    <div 
                      className={`toggle-switch ${videoData.allowComments ? 'active' : ''}`}
                      onClick={() => {
                        const newValue = !videoData.allowComments;
                        setVideoData({...videoData, allowComments: newValue});
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('upload_allowComments_preference', String(newValue));
                        }
                      }}
                    >
                      <div className="toggle-slider"></div>
                    </div>
                  </div>
                  <div className="setting-item">
                    <span>Duet</span>
                    <div 
                      className={`toggle-switch ${videoData.allowDuet ? 'active' : ''}`}
                      onClick={() => {
                        const newValue = !videoData.allowDuet;
                        setVideoData({...videoData, allowDuet: newValue});
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('upload_allowDuet_preference', String(newValue));
                        }
                      }}
                    >
                      <div className="toggle-slider"></div>
                    </div>
                  </div>
                  <div className="setting-item">
                    <span>Stitch</span>
                    <div 
                      className={`toggle-switch ${videoData.allowStitch ? 'active' : ''}`}
                      onClick={() => {
                        const newValue = !videoData.allowStitch;
                        setVideoData({...videoData, allowStitch: newValue});
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('upload_allowStitch_preference', String(newValue));
                        }
                      }}
                    >
                      <div className="toggle-slider"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="form-group">
                <label>Location (Optional)</label>
                <input
                  type="text"
                  placeholder="Add location"
                  value={videoData.location}
                  onChange={(e) => setVideoData({...videoData, location: e.target.value})}
                />
              </div>

              {/* Tag Friends */}
              <div className="form-group">
                <label>Tag Friends (Optional)</label>
                <input
                  type="text"
                  placeholder="@username"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      e.preventDefault();
                      const newTag = e.target.value.trim();
                      if (!videoData.taggedFriends.includes(newTag)) {
                        setVideoData({
                          ...videoData,
                          taggedFriends: [...videoData.taggedFriends, newTag]
                        });
                        e.target.value = '';
                      }
                    }
                  }}
                />
                {videoData.taggedFriends.length > 0 && (
                  <div className="tagged-friends-list">
                    {videoData.taggedFriends.map((friend, idx) => (
                      <span key={idx} className="friend-tag">
                        {friend}
                        <button onClick={() => {
                          setVideoData({
                            ...videoData,
                            taggedFriends: videoData.taggedFriends.filter((_, i) => i !== idx)
                          });
                        }}>
                          <i className="fa-solid fa-times"></i>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons - Moved here */}
              <div className="location-action-buttons">
                <button 
                  className="discard-btn-location"
                  onClick={handleDiscard}
                  disabled={isUploading}
                >
                  <i className="fa-solid fa-trash"></i>
                  Discard
                </button>
                <button 
                  className="draft-btn-location"
                  onClick={handleDraft}
                  disabled={!uploadedVideo || isUploading}
                >
                  <i className="fa-solid fa-file"></i>
                  Save as Draft
                </button>
                <button 
                  className="post-btn-location"
                  onClick={handlePost}
                  disabled={!uploadedVideo || isUploading}
                >
                  <i className="fa-solid fa-paper-plane"></i>
                  Post
                </button>
              </div>

              {isUploading && (
                <div className="upload-progress">
                  <div className="progress-info">
                    <span>Uploading...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {(uploadError || uploadSuccess) && (
                <div 
                  ref={feedbackRef}
                  className={`upload-feedback ${uploadError ? 'error' : 'success'}`}
                >
                  <i className={`fa-solid ${uploadError ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
                  <span>{uploadError || uploadSuccess}</span>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Hidden audio element for music preview */}
        <audio
          ref={musicPreviewAudioRef}
          preload="auto"
          style={{ display: 'none' }}
          crossOrigin="anonymous"
          onEnded={() => {
            console.log('🎵 Music playback ended');
            setPlayingMusicId(null);
          }}
          onError={(e) => {
            console.error('❌ Audio playback error:', e);
            console.error('Error details:', {
              code: e.target.error?.code,
              message: e.target.error?.message,
              src: e.target.src
            });
            setPlayingMusicId(null);
          }}
          onLoadedData={() => {
            console.log('✅ Audio data loaded');
          }}
          onCanPlay={() => {
            console.log('✅ Audio can play');
          }}
          onLoadStart={() => {
            console.log('🔄 Audio loading started');
          }}
        />

        {/* Hidden File Input for Video */}
        <input
          ref={fileInputRef}
          id="video-upload-input"
          type="file"
          accept="video/*"
          onChange={handleFileInputChange}
          style={{ 
            position: 'absolute',
            width: '1px',
            height: '1px',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -1
          }}
          multiple={false}
        />

        {/* Hidden File Input for Music from Gallery */}
        <input
          ref={musicFileInputRef}
          id="music-upload-input"
          type="file"
          accept="audio/*"
          onChange={handleMusicFileChange}
          style={{ 
            position: 'absolute',
            width: '1px',
            height: '1px',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -1
          }}
          multiple={false}
        />

        {/* Music Library Modal */}
        {showMusicLibrary && (
          <div className="modal-overlay" onClick={() => setShowMusicLibrary(false)}>
            <div className="modal-content music-library-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  <i className="fa-solid fa-music"></i> Add Music
                </h2>
                <button className="modal-close" onClick={() => setShowMusicLibrary(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              
              {/* Split Layout for Music Modal */}
              <div className="music-modal-split">
                {/* Video Preview on Left */}
                {videoPreview && (
                  <div className="music-modal-preview" style={{ position: 'relative' }}>
                    <video src={videoPreview} className="music-preview-video" style={{ 
                      filter: getCompleteFilterStyle(),
                      transform: getCompleteTransformStyle(),
                      transition: transitions.length > 0 ? 'all 0.3s ease-in-out' : 'none',
                      ...getAspectRatioStyle(),
                      objectFit: 'contain'
                    }} />
                    {/* Music Info Overlay in Modal - REMOVED: Using checkmark icon in list instead */}
                  </div>
                )}
                
                {/* Music List on Right */}
                <div className="modal-body music-library-body" style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  height: '100%',
                  maxHeight: '100%',
                  overflow: 'hidden',
                  padding: 0,
                  position: 'relative'
                }}>
                  {/* Scrollable Content Area */}
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: '24px',
                    paddingBottom: '120px', // Extra padding so buttons are visible when scrolling
                    WebkitOverflowScrolling: 'touch',
                    minHeight: 0,
                    height: 'calc(100% - 80px)', // Reserve space for buttons
                    maxHeight: 'calc(100% - 80px)' // Reserve space for buttons
                  }}>
                    {/* Online Search Bar */}
                    <div className="music-library-search" style={{ marginBottom: '16px' }}>
                      <div style={{ position: 'relative', width: '100%' }}>
                        <i className="fa-solid fa-search" style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#8e8e8e',
                          fontSize: '14px'
                        }}></i>
                        <input
                          type="text"
                          placeholder="Search songs online..."
                          value={musicSearchQuery}
                          onChange={(e) => setMusicSearchQuery(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px 10px 40px',
                            borderRadius: '8px',
                            border: '1px solid #e0e0e0',
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'all 0.3s ease'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#FF0050';
                            e.target.style.boxShadow = '0 0 0 2px rgba(255, 0, 80, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#e0e0e0';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                        {musicSearchQuery && (
                          <button
                            onClick={() => {
                              setMusicSearchQuery('');
                              setOnlineMusicResults([]);
                            }}
                            style={{
                              position: 'absolute',
                              right: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: '#8e8e8e',
                              cursor: 'pointer',
                              fontSize: '14px',
                              padding: '4px'
                            }}
                          >
                            <i className="fa-solid fa-times"></i>
                          </button>
                        )}
                      </div>
                      {searchingMusic && (
                        <div style={{ 
                          textAlign: 'center', 
                          padding: '8px', 
                          color: '#8e8e8e',
                          fontSize: '12px'
                        }}>
                          <i className="fa-solid fa-spinner fa-spin"></i> Searching...
                        </div>
                      )}
                    </div>

                    {/* Music Categories */}
                    {musicSearchQuery.trim().length < 2 && (
                    <div className="music-categories">
                      <button 
                        className={`category-btn ${selectedMusicCategory === 'trending' ? 'active' : ''}`}
                        onClick={() => setSelectedMusicCategory('trending')}
                      >
                        <i className="fa-solid fa-fire"></i> Trending
                      </button>
                      <button 
                        className={`category-btn ${selectedMusicCategory === 'popular' ? 'active' : ''}`}
                        onClick={() => setSelectedMusicCategory('popular')}
                      >
                        <i className="fa-solid fa-heart"></i> Popular
                      </button>
                      <button 
                        className={`category-btn ${selectedMusicCategory === 'recent' ? 'active' : ''}`}
                        onClick={() => setSelectedMusicCategory('recent')}
                      >
                        <i className="fa-solid fa-clock"></i> Recent
                      </button>
                      <button 
                        className={`category-btn ${selectedMusicCategory === 'gallery' ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedMusicCategory('gallery');
                          // Trigger file picker for gallery music
                          if (musicFileInputRef.current) {
                            musicFileInputRef.current.click();
                          }
                        }}
                      >
                        <i className="fa-solid fa-images"></i> My Gallery
                      </button>
                    </div>
                    )}
                    <div className="music-list">
                      {musicSearchQuery.trim().length >= 2 && onlineMusicResults.length === 0 && !searchingMusic && (
                        <div style={{ 
                          textAlign: 'center', 
                          padding: '40px 20px',
                          color: '#8e8e8e'
                        }}>
                          <i className="fa-solid fa-music" style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}></i>
                          <p>No songs found for "{musicSearchQuery}"</p>
                          <p style={{ fontSize: '12px', marginTop: '8px' }}>Try a different search term</p>
                        </div>
                      )}
                      {getFilteredMusic().map((music) => {
                        // Checkmark only shows when music is actually selected in videoData (not just selectedMusic)
                        const isSelected = videoData.music?.id === music.id;
                        const isCurrentlySelected = selectedMusic?.id === music.id;
                        return (
                        <div 
                          key={music.id} 
                          className={`music-item ${isSelected ? 'selected' : ''}`}
                          onClick={(e) => {
                            // Clear any existing timeout
                            if (clickTimeoutRef.current) {
                              clearTimeout(clickTimeoutRef.current);
                            }
                            
                            // Set a timeout to detect if it's a single click
                            clickTimeoutRef.current = setTimeout(() => {
                              // Single click: Select the music
                              const updatedMusic = {
                                ...music,
                                audioUrl: music.audioUrl || music.url || ''
                              };
                              setSelectedMusic(updatedMusic);
                              // Update video preview immediately for live preview
                              setVideoData({...videoData, music: updatedMusic});
                              clickTimeoutRef.current = null;
                            }, 300); // 300ms delay to detect double click
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            
                            // Clear the single click timeout
                            if (clickTimeoutRef.current) {
                              clearTimeout(clickTimeoutRef.current);
                              clickTimeoutRef.current = null;
                            }
                            
                            // Double click: Remove music
                            if (isSelected || isCurrentlySelected) {
                              setSelectedMusic(null);
                              setVideoData({...videoData, music: null});
                              // Stop music if playing
                              if (musicPreviewAudioRef.current) {
                                musicPreviewAudioRef.current.pause();
                                musicPreviewAudioRef.current.currentTime = 0;
                              }
                              setPlayingMusicId(null);
                              setUploadSuccess('Music removed');
                              setTimeout(() => setUploadSuccess(null), 2000);
                            } else {
                              // If not selected, double click should also remove if there's any selection
                              setSelectedMusic(null);
                              setVideoData({...videoData, music: null});
                              if (musicPreviewAudioRef.current) {
                                musicPreviewAudioRef.current.pause();
                                musicPreviewAudioRef.current.currentTime = 0;
                              }
                              setPlayingMusicId(null);
                            }
                          }}
                          title={isSelected ? 'Double click to remove' : 'Click to select, double click to remove'}
                        >
                          <div className="music-cover">
                            <i className="fa-solid fa-music"></i>
                            {music.isTrending && <span className="trending-badge">🔥</span>}
                            {/* Checkmark icon - only show when music is actually selected in videoData */}
                            {isSelected && (
                              <div style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                width: '20px',
                                height: '20px',
                                background: '#FF0050',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontSize: '12px',
                                zIndex: 10,
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                              }}>
                                <i className="fa-solid fa-check"></i>
                              </div>
                            )}
                          </div>
                          <div className="music-info">
                            <h4>{music.name}</h4>
                            <p>{music.artist}</p>
                          </div>
                          <div className="music-duration">
                            <span>{music.duration}</span>
                            <button 
                              className="preview-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                
                                // If same music is playing, stop it
                                if (playingMusicId === music.id && musicPreviewAudioRef.current) {
                                  musicPreviewAudioRef.current.pause();
                                  musicPreviewAudioRef.current.currentTime = 0;
                                  setPlayingMusicId(null);
                                  setUploadSuccess(`Stopped: ${music.name}`);
                                  setTimeout(() => setUploadSuccess(null), 2000);
                                  return;
                                }

                                // Stop any currently playing music
                                if (musicPreviewAudioRef.current) {
                                  musicPreviewAudioRef.current.pause();
                                  musicPreviewAudioRef.current.currentTime = 0;
                                }

                                // If music has audioUrl, play it
                                if (music.audioUrl && music.audioUrl !== '' && !music.audioUrl.includes('example.com')) {
                                  if (musicPreviewAudioRef.current) {
                                    try {
                                      console.log('🎵 Attempting to play:', music.name, 'URL:', music.audioUrl);
                                      
                                      const audio = musicPreviewAudioRef.current;
                                      
                                      // Set audio properties
                                      audio.crossOrigin = 'anonymous';
                                      audio.volume = 0.8; // Set volume to 80%
                                      audio.src = music.audioUrl;
                                      
                                      // Add event listeners for better debugging
                                      const handleCanPlay = () => {
                                        console.log('✅ Audio can play now');
                                        audio.play().then(() => {
                                          console.log('✅ Music playing successfully');
                                          setPlayingMusicId(music.id);
                                          setUploadSuccess(`Playing: ${music.name}`);
                                          setTimeout(() => setUploadSuccess(null), 2000);
                                        }).catch((err) => {
                                          console.error('❌ Play error:', err);
                                          setPlayingMusicId(music.id);
                                          setUploadSuccess(`Selected: ${music.name} (Preview unavailable)`);
                                          setTimeout(() => setUploadSuccess(null), 2000);
                                        });
                                      };
                                      
                                      const handleError = (e) => {
                                        console.error('❌ Audio error:', e, 'URL:', music.audioUrl);
                                        setPlayingMusicId(music.id);
                                        setUploadSuccess(`Selected: ${music.name} (Preview unavailable)`);
                                        setTimeout(() => setUploadSuccess(null), 2000);
                                      };
                                      
                                      // Remove old listeners
                                      audio.removeEventListener('canplay', handleCanPlay);
                                      audio.removeEventListener('error', handleError);
                                      
                                      // Add new listeners
                                      audio.addEventListener('canplay', handleCanPlay, { once: true });
                                      audio.addEventListener('error', handleError, { once: true });
                                      
                                      // Load the audio
                                      audio.load();
                                      
                                    } catch (err) {
                                      console.error('❌ Setup error:', err);
                                      setPlayingMusicId(music.id);
                                      setUploadSuccess(`Selected: ${music.name}`);
                                      setTimeout(() => setUploadSuccess(null), 2000);
                                    }
                                  } else {
                                    console.error('❌ Audio ref not available');
                                    setPlayingMusicId(music.id);
                                    setUploadSuccess(`Selected: ${music.name}`);
                                    setTimeout(() => setUploadSuccess(null), 2000);
                                  }
                                } else {
                                  // If no valid audioUrl, just select it
                                  console.log('⚠️ No valid audioUrl for:', music.name);
                                  setPlayingMusicId(music.id);
                                  setUploadSuccess(`Selected: ${music.name} by ${music.artist}`);
                                  setTimeout(() => setUploadSuccess(null), 2000);
                                }
                              }}
                            >
                              <i className={`fa-solid ${playingMusicId === music.id ? 'fa-pause' : 'fa-play'}`}></i>
                            </button>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Save/Cancel Buttons - Fixed at bottom, outside scrollable area */}
                  <div className="music-library-actions" style={{
                    flexShrink: 0,
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: '#F5F7FA',
                    borderTop: '2px solid rgba(0, 0, 0, 0.1)',
                    padding: '10px 16px',
                    display: 'flex',
                    gap: '8px',
                    zIndex: 100,
                    boxShadow: '0 -4px 15px rgba(0, 0, 0, 0.15)',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                      <button
                        className="cancel-music-btn"
                        onClick={() => {
                          // Cancel - revert to original music
                          if (selectedMusic) {
                            // Revert to previous music
                            const previousMusic = videoData.music;
                            setVideoData({...videoData, music: previousMusic});
                          }
                          setSelectedMusic(null);
                          setShowMusicLibrary(false);
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 16px',
                          background: '#E0F2FE',
                          color: '#0F172A',
                          border: '1px solid #E0F2FE',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="save-music-btn"
                        onClick={() => {
                          // Save - confirm music selection
                          if (selectedMusic) {
                            setVideoData({...videoData, music: selectedMusic});
                            setUploadSuccess(`Music saved: ${selectedMusic.name}`);
                            setTimeout(() => setUploadSuccess(null), 2000);
                          }
                          setSelectedMusic(null);
                          setShowMusicLibrary(false);
                        }}
                        disabled={!selectedMusic}
                        style={{
                          flex: 1,
                          padding: '8px 16px',
                          background: selectedMusic ? '#FF0050' : '#ccc',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: selectedMusic ? 'pointer' : 'not-allowed',
                          transition: 'all 0.3s ease',
                          opacity: selectedMusic ? 1 : 0.6
                        }}
                      >
                        Save
                      </button>
                    </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Panel Modal */}
        {showEditPanel && (
          <div className="modal-overlay" onClick={() => setShowEditPanel(false)}>
            <div className="modal-content edit-panel-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  <i className="fa-solid fa-edit"></i> Edit Video
                </h2>
                <button className="modal-close" onClick={() => setShowEditPanel(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              
              {/* Advanced Editor Tabs */}
              <div className="edit-tabs-nav">
                <button 
                  className={`edit-tab-btn ${activeEditTab === 'trim' ? 'active' : ''}`}
                  onClick={() => setActiveEditTab('trim')}
                >
                  <i className="fa-solid fa-crop"></i> Trim
                </button>
                <button 
                  className={`edit-tab-btn ${activeEditTab === 'text' ? 'active' : ''}`}
                  onClick={() => setActiveEditTab('text')}
                >
                  <i className="fa-solid fa-font"></i> Text
                </button>
                <button 
                  className={`edit-tab-btn ${activeEditTab === 'effects' ? 'active' : ''}`}
                  onClick={() => setActiveEditTab('effects')}
                >
                  <i className="fa-solid fa-wand-magic-sparkles"></i> Effects
                </button>
                <button 
                  className={`edit-tab-btn ${activeEditTab === 'voiceover' ? 'active' : ''}`}
                  onClick={() => setActiveEditTab('voiceover')}
                >
                  <i className="fa-solid fa-microphone"></i> Voiceover
                </button>
              </div>
              
              {/* Split Layout: Video Left, Controls Right */}
              <div className="edit-modal-split">
                {/* Video Preview on Left */}
                <div className="edit-modal-preview">
                  <video
                    ref={editVideoPlayerRef}
                    src={videoPreview}
                    controls
                    className="edit-preview-video"
                    style={{ 
                      filter: getCompleteFilterStyle(),
                      transform: getCompleteTransformStyle(),
                      transition: transitions.length > 0 ? 'all 0.3s ease-in-out' : 'none',
                      ...getAspectRatioStyle(),
                      objectFit: 'contain'
                    }}
                  />
                  {/* Text Overlays on Edit Panel Video */}
                  {textOverlays.length > 0 && (
                    <div 
                      className="text-overlays-preview"
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    >
                      {textOverlays.map((overlay) => (
                        <span 
                          key={overlay.id} 
                          className={`text-overlay-preview-item ${overlay.style ? getTextStyleClass(overlay.style) : ''}`}
                          style={{
                            position: 'absolute',
                            left: `${overlay.x || 50}%`,
                            top: `${overlay.y || 20}%`,
                            transform: 'translate(-50%, -50%)',
                            cursor: draggingElement?.type === 'text' && draggingElement?.id === overlay.id ? 'grabbing' : 'grab',
                            pointerEvents: 'auto',
                            userSelect: 'none'
                          }}
                          onMouseDown={(e) => handleMouseDown(e, 'text', overlay.id)}
                        >
                          {overlay.content}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Stickers Preview on Edit Panel Video */}
                  {stickers.length > 0 && (
                    <div 
                      className="stickers-preview"
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                    >
                      {stickers.map((sticker) => (
                        <span 
                          key={sticker.id} 
                          className="sticker-preview-item"
                          style={{
                            position: 'absolute',
                            left: `${sticker.x || 20}%`,
                            top: `${sticker.y || 20}%`,
                            transform: 'translate(-50%, -50%)',
                            fontSize: '48px',
                            cursor: draggingElement?.type === 'sticker' && draggingElement?.id === sticker.id ? 'grabbing' : 'grab',
                            pointerEvents: 'auto',
                            zIndex: 10,
                            textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
                            userSelect: 'none'
                          }}
                          onMouseDown={(e) => handleMouseDown(e, 'sticker', sticker.id)}
                        >
                          {sticker.emoji}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Controls on Right */}
                <div className="modal-body edit-panel-body">
                {/* Crop/Trim Tab */}
                {activeEditTab === 'trim' && (
                <div className="edit-section">
                  <h3>
                    <i className="fa-solid fa-crop"></i> Crop/Trim Video
                  </h3>
                  <div className="crop-controls">
                    <div className="crop-range">
                      <label>Start Time: {formatDuration(cropStart)}</label>
                      <input 
                        type="range" 
                        min="0" 
                        max={videoInfo.duration} 
                        value={cropStart}
                        onChange={(e) => setCropStart(parseInt(e.target.value))}
                        className="slider"
                      />
                    </div>
                    <div className="crop-range">
                      <label>End Time: {formatDuration(cropEnd || videoInfo.duration)}</label>
                      <input 
                        type="range" 
                        min="0" 
                        max={videoInfo.duration} 
                        value={cropEnd || videoInfo.duration}
                        onChange={(e) => setCropEnd(parseInt(e.target.value))}
                        className="slider"
                      />
                    </div>
                    <div className="crop-duration">
                      <span>Duration: {formatDuration((cropEnd || videoInfo.duration) - cropStart)}</span>
                    </div>
                  </div>
                  
                  {/* Aspect Ratio Selection */}
                  <div className="aspect-ratio-section">
                    <h4>
                      <i className="fa-solid fa-crop"></i> Aspect Ratio
                    </h4>
                    <div className="aspect-ratio-grid">
                      <button 
                        className={`aspect-btn ${selectedAspectRatio === '9:16' ? 'active' : ''}`}
                        onClick={() => setSelectedAspectRatio('9:16')}
                      >
                        <span>9:16</span>
                        <small>TikTok</small>
                      </button>
                      <button 
                        className={`aspect-btn ${selectedAspectRatio === '1:1' ? 'active' : ''}`}
                        onClick={() => setSelectedAspectRatio('1:1')}
                      >
                        <span>1:1</span>
                        <small>Square</small>
                      </button>
                      <button 
                        className={`aspect-btn ${selectedAspectRatio === '16:9' ? 'active' : ''}`}
                        onClick={() => setSelectedAspectRatio('16:9')}
                      >
                        <span>16:9</span>
                        <small>Landscape</small>
                      </button>
                      <button 
                        className={`aspect-btn ${selectedAspectRatio === '4:5' ? 'active' : ''}`}
                        onClick={() => setSelectedAspectRatio('4:5')}
                      >
                        <span>4:5</span>
                        <small>Instagram</small>
                      </button>
                    </div>
                  </div>
                </div>
                )}

                {/* Text Tab */}
                {activeEditTab === 'text' && (
                <div className="edit-section">
                  <h3>
                    <i className="fa-solid fa-font"></i> Add Text
                  </h3>
                  <div className="text-editor-controls">
                    <input
                      type="text"
                      placeholder="Enter text..."
                      className="text-input"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      maxLength={100}
                    />
                    <button className="add-text-btn" onClick={handleAddTextOverlay} disabled={!textInput.trim()}>
                      <i className="fa-solid fa-plus"></i> Add Text
                    </button>
                  </div>
                  {textOverlays.length > 0 && (
                    <div className="text-overlay-list">
                      {textOverlays.map((overlay) => (
                        <div key={overlay.id} className="text-overlay-item">
                          <span>{overlay.content}</span>
                          <button
                            type="button"
                            className="remove-overlay-btn"
                            onClick={() => handleRemoveTextOverlay(overlay.id)}
                          >
                            <i className="fa-solid fa-times"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-styles-grid">
                    {['Bold', 'Italic', 'Outline', 'Shadow', 'Neon', 'Rainbow'].map((style, idx) => (
                      <button 
                        key={idx} 
                        className={`text-style-btn ${selectedTextStyle === style ? 'active' : ''}`}
                        onClick={() => setSelectedTextStyle(selectedTextStyle === style ? null : style)}
                      >
                        <span>{style}</span>
                      </button>
                    ))}
                  </div>
                  {/* Added Stickers List */}
                  {stickers.length > 0 && (
                    <div className="text-overlay-list" style={{ marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#0F172A' }}>
                        <i className="fa-solid fa-face-smile"></i> Added Stickers
                      </h4>
                      {stickers.map((sticker) => (
                        <div key={sticker.id} className="text-overlay-item">
                          <span style={{ fontSize: '24px' }}>{sticker.emoji}</span>
                          <button
                            type="button"
                            className="remove-overlay-btn"
                            onClick={() => handleRemoveSticker(sticker.id)}
                          >
                            <i className="fa-solid fa-times"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="stickers-library">
                    <h4>
                      <i className="fa-solid fa-face-smile"></i> Stickers
                    </h4>
                    <div className="stickers-grid">
                      {availableStickers.map((emoji) => (
                        <button
                          key={emoji}
                          className={`sticker-btn ${stickers.some(s => s.emoji === emoji) ? 'active' : ''}`}
                          onClick={() => toggleSticker(emoji)}
                          type="button"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                )}

                {/* Effects Tab */}
                {activeEditTab === 'effects' && (
                <div>
                {/* Filters Section */}
                <div className="edit-section">
                  <h3>
                    <i className="fa-solid fa-filter"></i> Apply Filter
                  </h3>
                  <div className="filters-grid">
                    {Object.keys(filterPresets).map((filter) => (
                      <button
                        key={filter}
                        className={`filter-btn ${selectedFilter === filter ? 'active' : ''}`}
                        onClick={() => setSelectedFilter(filter)}
                        type="button"
                      >
                        <div className="filter-preview">
                          <i className="fa-solid fa-image"></i>
                        </div>
                        <span>{filter}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Effects Section */}
                <div className="edit-section">
                  <h3>
                    <i className="fa-solid fa-wand-magic-sparkles"></i> Effects
                  </h3>
                  <div className="effects-grid">
                    {transitionOptions.map((effect) => (
                      <button
                        key={effect}
                        className={`effect-btn ${transitions.includes(effect) ? 'active' : ''}`}
                        onClick={() => toggleTransition(effect)}
                        type="button"
                      >
                        <i className="fa-solid fa-sparkles"></i>
                        <span>{effect}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speed Control */}
                <div className="edit-section">
                  <h3>
                    <i className="fa-solid fa-gauge-high"></i> Speed Control
                  </h3>
                  <div className="speed-controls">
                    {speedOptions.map((speed) => (
                      <button
                        key={speed}
                        className={`speed-btn ${selectedSpeed === speed ? 'active' : ''}`}
                        onClick={() => setSelectedSpeed(speed)}
                        type="button"
                      >
                        {speed}
                      </button>
                    ))}
                  </div>
                </div>
                </div>
                )}

                {/* Voiceover Tab */}
                {activeEditTab === 'voiceover' && (
                <div className="edit-section">
                  <h3>
                    <i className="fa-solid fa-microphone"></i> Record Voiceover
                  </h3>
                  <div className="voiceover-controls">
                    <p className="feature-description">
                      Record audio to overlay on your video
                    </p>
                    <div className="voiceover-upload-actions">
                      <button
                        className="record-voiceover-btn"
                        onClick={() => voiceoverInputRef.current?.click()}
                        type="button"
                      >
                        <i className="fa-solid fa-upload"></i>
                        Upload Audio File
                      </button>
                      <input
                        ref={voiceoverInputRef}
                        type="file"
                        accept="audio/*"
                        style={{ display: 'none' }}
                        onChange={handleVoiceoverFileChange}
                      />
                    </div>
                    {voiceover && (
                      <div className="voiceover-preview">
                        <div className="voiceover-meta">
                          <span>{voiceover.name}</span>
                          <small>{`${(voiceover.size / (1024 * 1024)).toFixed(2)} MB`}</small>
                        </div>
                        <audio src={voiceover.src} controls className="voiceover-player" />
                        <button className="delete-voiceover-btn" onClick={handleClearVoiceover} type="button">
                          <i className="fa-solid fa-trash"></i>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                )}

                <div className="edit-panel-actions">
                  <button className="cancel-edit-btn" onClick={() => setShowEditPanel(false)}>
                    Cancel
                  </button>
                  <button className="apply-edit-btn" onClick={() => {
                    // Apply effects to video preview
                    if (videoPlayerRef.current) {
                      const video = videoPlayerRef.current;
                      let transform = '';
                      let filter = selectedFilterStyle;
                      
                      // Apply all selected transition effects
                      if (transitions.includes('Zoom')) {
                        transform += 'scale(1.1) ';
                      }
                      if (transitions.includes('Blur')) {
                        filter += ' blur(2px)';
                      }
                      if (transitions.includes('Shake')) {
                        transform += 'translateX(2px) ';
                      }
                      if (transitions.includes('Fade')) {
                        video.style.opacity = '0.9';
                      } else {
                        video.style.opacity = '1';
                      }
                      
                      video.style.transform = transform.trim() || 'none';
                      video.style.filter = filter || 'none';
                      video.style.transition = 'all 0.3s ease';
                    }
                    
                    setUploadSuccess('Edit applied successfully! ✨');
                    setTimeout(() => setUploadSuccess(null), 3000);
                    setShowEditPanel(false);
                  }}>
                    Apply Changes
                  </button>
                </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;








