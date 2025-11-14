import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadVideo, promoteVideo } from '../api/videos';
import { saveDraft, scheduleVideo } from '../api/drafts';
import faceDetection from '../utils/faceDetection';
import './UploadPage.css';

const MAX_VIDEO_MB = 100;
const MAX_VIDEO_SECONDS = 10 * 60; // 10 minutes

const boolToString = (value) => (value ? 'true' : 'false');

const UploadPage = ({ onClose }) => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const videoPlayerRef = useRef(null);
  const voiceoverInputRef = useRef(null);
  const autoCropIntervalRef = useRef(null);
  const previousFaceBoxRef = useRef(null);
  
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showMusicLibrary, setShowMusicLibrary] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [cropStart, setCropStart] = useState(0);
  const [cropEnd, setCropEnd] = useState(0);
  const [musicSearchQuery, setMusicSearchQuery] = useState('');
  const [searchingMusic, setSearchingMusic] = useState(false);
  const [onlineMusicResults, setOnlineMusicResults] = useState([]);
  const [showOnlineTab, setShowOnlineTab] = useState(false);
  
  // Smart Auto-Crop states
  const [autoCropEnabled, setAutoCropEnabled] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [faceBox, setFaceBox] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  
  // Advanced Editor states
  const [activeEditTab, setActiveEditTab] = useState('trim');
  const [textOverlays, setTextOverlays] = useState([]);
  const [stickers, setStickers] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('None');
  const [selectedSpeed, setSelectedSpeed] = useState('1x');
  const [transitions, setTransitions] = useState([]);
  const [voiceover, setVoiceover] = useState(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('9:16');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [textInput, setTextInput] = useState('');
  
  const [videoData, setVideoData] = useState({
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

  useEffect(() => {
    if (videoPlayerRef.current) {
      const numericSpeed = parseFloat(selectedSpeed) || 1;
      videoPlayerRef.current.playbackRate = numericSpeed;
    }
  }, [selectedSpeed]);

  useEffect(() => {
    return () => {
      if (voiceover?.src && voiceover.src.startsWith('blob:')) {
        URL.revokeObjectURL(voiceover.src);
      }
    };
  }, [voiceover]);

  const handleAddTextOverlay = () => {
    const content = textInput.trim();
    if (!content) {
      return;
    }
    setTextOverlays((prev) => [
      ...prev,
      {
        id: Date.now(),
        content
      }
    ]);
    setTextInput('');
  };

  const handleRemoveTextOverlay = (id) => {
    setTextOverlays((prev) => prev.filter((overlay) => overlay.id !== id));
  };

  const toggleSticker = (emoji) => {
    setStickers((prev) => (prev.includes(emoji) ? prev.filter((item) => item !== emoji) : [...prev, emoji]));
  };

  const toggleTransition = (name) => {
    setTransitions((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]));
  };

  const handleVoiceoverFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
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
  };

  const handleClearVoiceover = () => {
    if (voiceover?.src && voiceover.src.startsWith('blob:')) {
      URL.revokeObjectURL(voiceover.src);
    }
    setVoiceover(null);
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
      autoCrop: autoCropEnabled,
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

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Online Music Search Function
  const searchOnlineMusic = async (query) => {
    if (!query || query.length < 2) {
      setOnlineMusicResults([]);
      return;
    }

    setSearchingMusic(true);
    try {
      // Using YouTube Data API (free tier available)
      // Note: You'll need to get a YouTube API key
      const API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY || 'YOUR_YOUTUBE_API_KEY';
      
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}+music&type=video&maxResults=20&key=${API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch music');
      }
      
      const data = await response.json();
      
      const musicResults = data.items.map((item, index) => ({
        id: item.id.videoId,
        name: item.snippet.title,
        artist: item.snippet.channelTitle,
        duration: '3:00', // YouTube doesn't provide duration in search, you'd need another API call
        thumbnail: item.snippet.thumbnails.default.url,
        isTrending: index < 3,
        youtubeUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`
      }));
      
      setOnlineMusicResults(musicResults);
    } catch (error) {
      console.error('Error searching music:', error);
      // Fallback to mock data
      setOnlineMusicResults([
        { id: '1', name: `${query} - Demo Result 1`, artist: 'Artist 1', duration: '3:30', isTrending: false },
        { id: '2', name: `${query} - Demo Result 2`, artist: 'Artist 2', duration: '2:45', isTrending: false },
        { id: '3', name: `${query} - Demo Result 3`, artist: 'Artist 3', duration: '4:15', isTrending: false }
      ]);
    } finally {
      setSearchingMusic(false);
    }
  };

  // Handle music search input
  const handleMusicSearch = (e) => {
    const query = e.target.value;
    setMusicSearchQuery(query);
    
    // Debounce search
    clearTimeout(window.musicSearchTimeout);
    window.musicSearchTimeout = setTimeout(() => {
      searchOnlineMusic(query);
    }, 500);
  };

  // Load face detection model on mount
  useEffect(() => {
    const loadModel = async () => {
      setIsModelLoading(true);
      await faceDetection.loadModel();
      setIsModelLoading(false);
    };
    loadModel();
  }, []);

  // Handle Auto-Crop toggle
  const handleAutoCropToggle = async (enabled) => {
    setAutoCropEnabled(enabled);
    
    if (enabled) {
      if (!faceDetection.isModelLoaded) {
        setIsModelLoading(true);
        await faceDetection.loadModel();
        setIsModelLoading(false);
      }
      startAutoCrop();
    } else {
      stopAutoCrop();
    }
  };

  // Start auto-crop detection
  const startAutoCrop = () => {
    if (autoCropIntervalRef.current) {
      stopAutoCrop();
    }

    setIsDetecting(true);
    autoCropIntervalRef.current = setInterval(async () => {
      if (!videoPlayerRef.current) return;

      const video = videoPlayerRef.current;
      if (video.readyState >= 2) { // HAVE_CURRENT_DATA
        const detectedBox = await faceDetection.detectFaces(video);
        
        if (detectedBox) {
          // Smooth tracking with interpolation
          const currentBox = previousFaceBoxRef.current
            ? faceDetection.interpolateBoxes(previousFaceBoxRef.current, detectedBox, 0.7)
            : detectedBox;
          
          setFaceBox(currentBox);
          previousFaceBoxRef.current = currentBox;
        } else {
          previousFaceBoxRef.current = null;
          setFaceBox(null);
        }
      }
    }, 100); // Check every 100ms for smooth tracking
  };

  // Stop auto-crop detection
  const stopAutoCrop = () => {
    if (autoCropIntervalRef.current) {
      clearInterval(autoCropIntervalRef.current);
      autoCropIntervalRef.current = null;
    }
    setIsDetecting(false);
    setFaceBox(null);
    previousFaceBoxRef.current = null;
  };

  // Prevent horizontal scroll on body when upload page is open
  useEffect(() => {
    document.body.classList.add('upload-page-open');
    document.documentElement.classList.add('upload-page-open');
    
    return () => {
      document.body.classList.remove('upload-page-open');
      document.documentElement.classList.remove('upload-page-open');
      stopAutoCrop();
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

  // Music Library Data
  const musicLibrary = [
    { id: 1, name: 'Trending Sound #1', artist: 'Artist Name', duration: '0:30', isTrending: true },
    { id: 2, name: 'Trending Sound #2', artist: 'Another Artist', duration: '0:25', isTrending: true },
    { id: 3, name: 'Epic Music', artist: 'Music Creator', duration: '1:00', isTrending: false },
    { id: 4, name: 'Happy Vibes', artist: 'Sound Maker', duration: '0:45', isTrending: false },
    { id: 5, name: 'Dance Beat', artist: 'DJ Producer', duration: '1:15', isTrending: true },
    { id: 6, name: 'Chill Sounds', artist: 'Music Mixer', duration: '0:50', isTrending: false }
  ];

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
                    style={{ filter: selectedFilterStyle }}
                    poster=""
                  />
                  {/* Face Detection Bounding Box Overlay */}
                  {faceBox && autoCropEnabled && (
                    <div 
                      className="face-bounding-box"
                      style={{
                        position: 'absolute',
                        left: `${faceBox.x * 100}%`,
                        top: `${faceBox.y * 100}%`,
                        width: `${faceBox.width * 100}%`,
                        height: `${faceBox.height * 100}%`,
                        border: '3px solid #00D9FF',
                        borderRadius: '12px',
                        pointerEvents: 'none',
                        zIndex: 50,
                        boxShadow: '0 0 20px rgba(236, 72, 153, 0.6)',
                        animation: 'pulse 2s infinite'
                      }}
                    >
                      <div className="face-indicator">
                        <i className="fa-solid fa-face-smile"></i>
                      </div>
                    </div>
                  )}
                  {textOverlays.length > 0 && (
                    <div className="text-overlays-preview">
                      {textOverlays.map((overlay) => (
                        <span key={overlay.id} className="text-overlay-preview-item">
                          {overlay.content}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="video-info-overlay">
                    <div className="video-stats">
                      <div className="stat-item">
                        <i className="fa-solid fa-clock"></i>
                        <span>{formatDuration(videoInfo.duration)}</span>
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
                    onClick={() => setVideoData({...videoData, privacy: 'public'})}
                  >
                    <i className="fa-solid fa-globe"></i>
                    <div className="privacy-info">
                      <h4>Public</h4>
                      <p>Anyone can view</p>
                    </div>
                  </div>
                  <div 
                    className={`privacy-option ${videoData.privacy === 'friends' ? 'selected' : ''}`}
                    onClick={() => setVideoData({...videoData, privacy: 'friends'})}
                  >
                    <i className="fa-solid fa-users"></i>
                    <div className="privacy-info">
                      <h4>Friends</h4>
                      <p>Only friends can view</p>
                    </div>
                  </div>
                  <div 
                    className={`privacy-option ${videoData.privacy === 'private' ? 'selected' : ''}`}
                    onClick={() => setVideoData({...videoData, privacy: 'private'})}
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
                      onClick={() => setVideoData({...videoData, allowComments: !videoData.allowComments})}
                    >
                      <div className="toggle-slider"></div>
                    </div>
                  </div>
                  <div className="setting-item">
                    <span>Duet</span>
                    <div 
                      className={`toggle-switch ${videoData.allowDuet ? 'active' : ''}`}
                      onClick={() => setVideoData({...videoData, allowDuet: !videoData.allowDuet})}
                    >
                      <div className="toggle-slider"></div>
                    </div>
                  </div>
                  <div className="setting-item">
                    <span>Stitch</span>
                    <div 
                      className={`toggle-switch ${videoData.allowStitch ? 'active' : ''}`}
                      onClick={() => setVideoData({...videoData, allowStitch: !videoData.allowStitch})}
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

              {/* Age Restriction */}
              <div className="form-group">
                <label>Age Restriction</label>
                <div className="privacy-options">
                  <div 
                    className={`privacy-option ${videoData.ageRestriction === 'all' ? 'selected' : ''}`}
                    onClick={() => setVideoData({...videoData, ageRestriction: 'all'})}
                  >
                    <i className="fa-solid fa-users"></i>
                    <div className="privacy-info">
                      <h4>All Ages</h4>
                      <p>Everyone can watch</p>
                    </div>
                  </div>
                  <div 
                    className={`privacy-option ${videoData.ageRestriction === '18+' ? 'selected' : ''}`}
                    onClick={() => setVideoData({...videoData, ageRestriction: '18+'})}
                  >
                    <i className="fa-solid fa-circle-exclamation"></i>
                    <div className="privacy-info">
                      <h4>18+ Only</h4>
                      <p>Mature content</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto Captions */}
              <div className="form-group">
                <label>Accessibility</label>
                <div className="setting-item">
                  <span>Auto Captions</span>
                  <div 
                    className={`toggle-switch ${videoData.autoCaptions ? 'active' : ''}`}
                    onClick={() => setVideoData({...videoData, autoCaptions: !videoData.autoCaptions})}
                  >
                    <div className="toggle-slider"></div>
                  </div>
                </div>
              </div>

              {/* Share to Other Apps */}
              <div className="form-group">
                <label>Share to Other Apps</label>
                <div className="share-options">
                  <div className="setting-item">
                    <span>
                      <i className="fa-brands fa-instagram"></i> Instagram
                    </span>
                    <div 
                      className={`toggle-switch ${videoData.shareToInstagram ? 'active' : ''}`}
                      onClick={() => setVideoData({...videoData, shareToInstagram: !videoData.shareToInstagram})}
                    >
                      <div className="toggle-slider"></div>
                    </div>
                  </div>
                  <div className="setting-item">
                    <span>
                      <i className="fa-brands fa-whatsapp"></i> WhatsApp
                    </span>
                    <div 
                      className={`toggle-switch ${videoData.shareToWhatsApp ? 'active' : ''}`}
                      onClick={() => setVideoData({...videoData, shareToWhatsApp: !videoData.shareToWhatsApp})}
                    >
                      <div className="toggle-slider"></div>
                    </div>
                  </div>
                  <div className="setting-item">
                    <span>
                      <i className="fa-brands fa-facebook"></i> Facebook
                    </span>
                    <div 
                      className={`toggle-switch ${videoData.shareToFacebook ? 'active' : ''}`}
                      onClick={() => setVideoData({...videoData, shareToFacebook: !videoData.shareToFacebook})}
                    >
                      <div className="toggle-slider"></div>
                    </div>
                  </div>
                  <div className="setting-item">
                    <span>
                      <i className="fa-brands fa-twitter"></i> Twitter/X
                    </span>
                    <div 
                      className={`toggle-switch ${videoData.shareToTwitter ? 'active' : ''}`}
                      onClick={() => setVideoData({...videoData, shareToTwitter: !videoData.shareToTwitter})}
                    >
                      <div className="toggle-slider"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="schedule-settings">
                <div className="schedule-header">
                  <div className="schedule-copy">
                    <h4>Schedule</h4>
                    <p>Pick a time to publish automatically.</p>
                  </div>
                  <div
                    className={`toggle-switch ${scheduleEnabled ? 'active' : ''}`}
                    onClick={() => {
                      setScheduleEnabled((prev) => {
                        if (prev) {
                          setScheduleDate('');
                        }
                        return !prev;
                      });
                    }}
                  >
                    <div className="toggle-slider"></div>
                  </div>
                </div>
                {scheduleEnabled && (
                  <div className="schedule-inputs">
                    <label htmlFor="schedule-date">Publish at</label>
                    <input
                      id="schedule-date"
                      type="datetime-local"
                      value={scheduleDate}
                      min={getMinScheduleValue()}
                      onChange={(e) => setScheduleDate(e.target.value)}
                    />
                    <small>Times use your local timezone.</small>
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
                <button 
                  className="promote-btn-location"
                  onClick={handlePromote}
                  disabled={!uploadedVideo || isUploading}
                >
                  <i className="fa-solid fa-fire"></i>
                  Promote
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
                <div className={`upload-feedback ${uploadError ? 'error' : 'success'}`}>
                  <i className={`fa-solid ${uploadError ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
                  <span>{uploadError || uploadSuccess}</span>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Hidden File Input */}
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
                  <div className="music-modal-preview">
                    <video src={videoPreview} className="music-preview-video" style={{ filter: selectedFilterStyle }} />
                  </div>
                )}
                
                {/* Music List on Right */}
                <div className="modal-body music-library-body">
                {/* Tabs */}
                <div className="music-tabs">
                  <button 
                    className={`music-tab ${!showOnlineTab ? 'active' : ''}`}
                    onClick={() => setShowOnlineTab(false)}
                  >
                    <i className="fa-solid fa-folder"></i> Library
                  </button>
                  <button 
                    className={`music-tab ${showOnlineTab ? 'active' : ''}`}
                    onClick={() => setShowOnlineTab(true)}
                  >
                    <i className="fa-solid fa-globe"></i> Online
                  </button>
                </div>

                {/* Search Bar */}
                {showOnlineTab && (
                  <div className="music-library-search">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input 
                      type="text" 
                      placeholder="Search music online (e.g., 'Shape of You', 'Blinding Lights')..."
                      value={musicSearchQuery}
                      onChange={handleMusicSearch}
                    />
                    {searchingMusic && (
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    )}
                  </div>
                )}

                {!showOnlineTab && (
                  <>
                    <div className="music-categories">
                      <button className="category-btn active">
                        <i className="fa-solid fa-fire"></i> Trending
                      </button>
                      <button className="category-btn">
                        <i className="fa-solid fa-heart"></i> Popular
                      </button>
                      <button className="category-btn">
                        <i className="fa-solid fa-clock"></i> Recent
                      </button>
                      <button className="category-btn">
                        <i className="fa-solid fa-images"></i> My Gallery
                      </button>
                    </div>
                    <div className="music-list">
                      {musicLibrary.map((music) => (
                        <div 
                          key={music.id} 
                          className={`music-item ${videoData.music?.id === music.id ? 'selected' : ''}`}
                          onClick={() => {
                            setVideoData({...videoData, music: music});
                            setShowMusicLibrary(false);
                          }}
                        >
                          <div className="music-cover">
                            <i className="fa-solid fa-music"></i>
                            {music.isTrending && <span className="trending-badge">🔥</span>}
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
                                alert(`Playing: ${music.name} by ${music.artist}`);
                              }}
                            >
                              <i className="fa-solid fa-play"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {showOnlineTab && (
                  <div className="music-list">
                    {onlineMusicResults.length > 0 ? (
                      onlineMusicResults.map((music) => (
                        <div 
                          key={music.id} 
                          className={`music-item ${videoData.music?.id === music.id ? 'selected' : ''}`}
                          onClick={() => {
                            setVideoData({...videoData, music: music});
                            setShowMusicLibrary(false);
                          }}
                        >
                          {music.thumbnail ? (
                            <div className="music-cover" style={{ backgroundImage: `url(${music.thumbnail})` }}>
                              <div className="music-cover-overlay">
                                <i className="fa-solid fa-music"></i>
                              </div>
                            </div>
                          ) : (
                            <div className="music-cover">
                              <i className="fa-solid fa-music"></i>
                              {music.isTrending && <span className="trending-badge">🔥</span>}
                            </div>
                          )}
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
                                alert(`Playing: ${music.name} by ${music.artist}`);
                              }}
                            >
                              <i className="fa-solid fa-play"></i>
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-music-state">
                        <i className="fa-solid fa-music"></i>
                        <p>Search for your favorite music online</p>
                        <span>Try searching for: "Shape of You", "Blinding Lights", "Watermelon Sugar"...</span>
                      </div>
                    )}
                  </div>
                )}
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
                    src={videoPreview}
                    controls
                    className="edit-preview-video"
                    style={{ filter: selectedFilterStyle }}
                  />
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
                  
                  {/* Smart Auto-Crop Toggle */}
                  <div className="auto-crop-controls">
                    <div className="setting-item">
                      <div className="setting-info">
                        <span>
                          <i className="fa-solid fa-robot"></i> Smart Auto-Crop
                        </span>
                        {isDetecting && <span className="detecting-badge">
                          <i className="fa-solid fa-circle"></i> Detecting...
                        </span>}
                        {isModelLoading && <span className="loading-badge">
                          <i className="fa-solid fa-spinner fa-spin"></i> Loading AI...
                        </span>}
                      </div>
                      <div 
                        className={`toggle-switch ${autoCropEnabled ? 'active' : ''}`}
                        onClick={() => handleAutoCropToggle(!autoCropEnabled)}
                      >
                        <div className="toggle-slider"></div>
                      </div>
                    </div>
                    <p className="setting-description">
                      {autoCropEnabled 
                        ? 'AI will automatically center and track faces in your video' 
                        : 'Enable to automatically track and center faces'}
                    </p>
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
                      <button key={idx} className="text-style-btn">
                        <span>{style}</span>
                      </button>
                    ))}
                  </div>
                  <div className="stickers-library">
                    <h4>
                      <i className="fa-solid fa-face-smile"></i> Stickers
                    </h4>
                    <div className="stickers-grid">
                      {availableStickers.map((emoji) => (
                        <button
                          key={emoji}
                          className={`sticker-btn ${stickers.includes(emoji) ? 'active' : ''}`}
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
                        <i className="fa-solid fa-circle"></i>
                        Upload / Record
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
                    alert('Edit applied successfully! ✨');
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








