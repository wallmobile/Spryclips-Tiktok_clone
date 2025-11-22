import React, { useState } from 'react';
import api from '../config/axios';
import './VideoUpload.css';

const VideoUpload = ({ onClose, onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a video file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('description', description);
      formData.append('hashtags', hashtags);
      formData.append('isPrivate', isPrivate);

      await api.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      onUploadSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-overlay">
      <div className="upload-modal">
        <button className="close-btn" onClick={onClose}>
          <i className="fa-solid fa-times"></i>
        </button>

        <div className="upload-header">
          <h2>Upload Video</h2>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          {error && <div className="error-message">{error}</div>}

          <div className="file-upload-area">
            <input
              type="file"
              id="video-file"
              accept="video/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              required
            />
            <label htmlFor="video-file" className="file-label">
              {preview ? (
                <video src={preview} controls className="preview-video" />
              ) : (
                <div className="file-placeholder">
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                  <p>Click to select a video</p>
                  <span>MP4, MOV, AVI, WebM (max 100MB)</span>
                </div>
              )}
            </label>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description to your video"
              maxLength={500}
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Hashtags (comma separated)</label>
            <input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="funny, viral, dance"
            />

          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              Make this video private
            </label>
          </div>

          <button type="submit" className="submit-btn" disabled={uploading}>
            {uploading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                Uploading...
              </>
            ) : (
              <>
                <i className="fa-solid fa-upload"></i>
                Upload Video
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VideoUpload;













