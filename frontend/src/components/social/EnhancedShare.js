import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode.react';
import './EnhancedShare.css';

const EnhancedShare = ({ video, profile, type = 'video', onClose }) => {
  const [activeTab, setActiveTab] = useState('share'); // 'share', 'embed', 'download'
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [embedCode, setEmbedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const embedCodeRef = useRef(null);

  useEffect(() => {
    // Generate share URL
    const shareUrl = type === 'video' 
      ? `${window.location.origin}/video/${video?.id || 'video-id'}`
      : `${window.location.origin}/@${profile?.username || 'username'}`;
    
    setQrCodeUrl(shareUrl);

    // Generate embed code
    if (type === 'video' && video) {
      const embed = `<iframe 
  src="${window.location.origin}/embed/video/${video.id}" 
  width="325" 
  height="578" 
  frameborder="0" 
  scrolling="no" 
  allowtransparency="true" 
  allow="encrypted-media">
</iframe>`;
      setEmbedCode(embed);
    } else if (type === 'profile' && profile) {
      const embed = `<iframe 
  src="${window.location.origin}/embed/profile/${profile.username}" 
  width="400" 
  height="600" 
  frameborder="0" 
  scrolling="no" 
  allowtransparency="true">
</iframe>`;
      setEmbedCode(embed);
    }
  }, [video, profile, type]);

  const handleCopyLink = () => {
    const url = qrCodeUrl;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyEmbed = () => {
    if (embedCodeRef.current) {
      embedCodeRef.current.select();
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    const canvas = document.querySelector('#qr-code-canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `qr-code-${type === 'video' ? video?.id : profile?.username}.png`;
      link.href = url;
      link.click();
    }
  };

  const handleDownloadVideo = async () => {
    if (!video || !video.url) {
      alert('Video URL not available');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      // Use backend download API endpoint instead of direct video URL
      const apiUrl = (typeof window !== 'undefined' && window.APP_CONFIG?.API_URL) || '';
      const downloadUrl = `${apiUrl}/api/videos/${video.id}/download`;

      const response = await fetch(downloadUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'video/mp4'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      setDownloadProgress(100);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tiktok-video-${video.id}.mp4`;
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setIsDownloading(false);
      setDownloadProgress(0);
      alert('Video downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      setIsDownloading(false);
      setDownloadProgress(0);
      alert('Failed to download video. Please try again.');
    }
  };

  const handleShareToStories = () => {
    // In a real app, this would integrate with Instagram Stories API
    // For now, we'll provide the share functionality
    const shareUrl = qrCodeUrl;
    const shareText = type === 'video' 
      ? `Check out this TikTok video! ${shareUrl}`
      : `Follow @${profile?.username} on TikTok! ${shareUrl}`;

    if (navigator.share) {
      navigator.share({
        title: type === 'video' ? 'Check out this video!' : `Follow @${profile?.username}`,
        text: shareText,
        url: shareUrl
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Link copied! You can paste it in your story.');
    }
  };

  const handleSocialShare = (platform) => {
    try {
      const url = encodeURIComponent(qrCodeUrl);
      const text = encodeURIComponent(
        type === 'video' 
          ? 'Check out this TikTok video!'
          : `Follow @${profile?.username} on TikTok!`
      );

      const shareUrls = {
        whatsapp: `https://wa.me/?text=${text}%20${url}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
        instagram: `https://www.instagram.com/`, // Instagram doesn't support direct URL sharing
        telegram: `https://t.me/share/url?url=${url}&text=${text}`,
        reddit: `https://reddit.com/submit?url=${url}&title=${text}`,
        pinterest: `https://pinterest.com/pin/create/button/?url=${url}&description=${text}`
      };

      if (shareUrls[platform]) {
        // Use window.location for WhatsApp and Telegram (better mobile compatibility)
        if (platform === 'whatsapp' || platform === 'telegram') {
          try {
            window.location.href = shareUrls[platform];
          } catch (err) {
            // Fallback to window.open
            const win = window.open(shareUrls[platform], '_blank', 'noopener,noreferrer');
            if (!win || win.closed || typeof win.closed === 'undefined') {
              // Popup blocked, copy to clipboard as fallback
              navigator.clipboard.writeText(qrCodeUrl).then(() => {
                alert('Link copied to clipboard! You can paste it in ' + platform);
              }).catch(() => {
                alert('Please copy this link manually: ' + qrCodeUrl);
              });
            }
          }
        } else {
          // For other platforms, use window.open
          const win = window.open(shareUrls[platform], '_blank', 'noopener,noreferrer');
          if (!win || win.closed || typeof win.closed === 'undefined') {
            // Popup blocked, try location.href
            window.location.href = shareUrls[platform];
          }
        }
      }
    } catch (error) {
      console.error('Share error:', error);
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(qrCodeUrl).then(() => {
        alert('Link copied to clipboard! You can paste it manually.');
      }).catch(() => {
        alert('Failed to share. Please copy this link: ' + qrCodeUrl);
      });
    }
  };

  return (
    <div className="enhanced-share-overlay" onClick={onClose}>
      <div className="enhanced-share-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="enhanced-share-header">
          <button className="enhanced-share-close" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>Share {type === 'video' ? 'Video' : 'Profile'}</h2>
          <div className="enhanced-share-header-placeholder"></div>
        </div>

        {/* Tabs */}
        <div className="enhanced-share-tabs">
          <button
            className={`enhanced-share-tab ${activeTab === 'share' ? 'active' : ''}`}
            onClick={() => setActiveTab('share')}
          >
            <i className="fa-solid fa-share"></i>
            <span>Share</span>
          </button>
          {type === 'video' && (
            <>
              <button
                className={`enhanced-share-tab ${activeTab === 'embed' ? 'active' : ''}`}
                onClick={() => setActiveTab('embed')}
              >
                <i className="fa-solid fa-code"></i>
                <span>Embed</span>
              </button>
              <button
                className={`enhanced-share-tab ${activeTab === 'download' ? 'active' : ''}`}
                onClick={() => setActiveTab('download')}
              >
                <i className="fa-solid fa-download"></i>
                <span>Download</span>
              </button>
            </>
          )}
        </div>

        {/* Share Tab */}
        {activeTab === 'share' && (
          <div className="enhanced-share-content">
            {/* QR Code Section */}
            <div className="share-section">
              <h3>QR Code</h3>
              <div className="qr-code-container">
                <div className="qr-code-wrapper">
                  <QRCode
                    id="qr-code-canvas"
                    value={qrCodeUrl}
                    size={200}
                    level="H"
                    includeMargin={true}
                    renderAs="canvas"
                  />
                </div>
                <div className="qr-code-actions">
                  <button className="qr-action-btn" onClick={handleDownloadQR}>
                    <i className="fa-solid fa-download"></i>
                    Save QR Code
                  </button>
                </div>
                <p className="qr-code-hint">Scan to open {type === 'video' ? 'video' : 'profile'}</p>
              </div>
            </div>

            {/* Copy Link Section */}
            <div className="share-section">
              <h3>Copy Link</h3>
              <div className="copy-link-container">
                <input
                  type="text"
                  value={qrCodeUrl}
                  readOnly
                  className="copy-link-input"
                />
                <button 
                  className={`copy-link-btn ${copied ? 'copied' : ''}`}
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <>
                      <i className="fa-solid fa-check"></i>
                      Copied!
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-copy"></i>
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Share to Stories */}
            <div className="share-section">
              <h3>Share to Stories</h3>
              <button className="share-stories-btn" onClick={handleShareToStories}>
                <i className="fa-solid fa-square-plus"></i>
                <span>Share to Your Story</span>
              </button>
            </div>

            {/* Social Media Share */}
            <div className="share-section">
              <h3>Share to</h3>
              <div className="social-share-grid">
                <button className="social-share-btn" onClick={() => handleSocialShare('whatsapp')}>
                  <i className="fa-brands fa-whatsapp"></i>
                  <span>WhatsApp</span>
                </button>
                <button className="social-share-btn" onClick={() => handleSocialShare('facebook')}>
                  <i className="fa-brands fa-facebook"></i>
                  <span>Facebook</span>
                </button>
                <button className="social-share-btn" onClick={() => handleSocialShare('twitter')}>
                  <i className="fa-brands fa-twitter"></i>
                  <span>Twitter</span>
                </button>
                <button className="social-share-btn" onClick={() => handleSocialShare('telegram')}>
                  <i className="fa-brands fa-telegram"></i>
                  <span>Telegram</span>
                </button>
                <button className="social-share-btn" onClick={() => handleSocialShare('reddit')}>
                  <i className="fa-brands fa-reddit"></i>
                  <span>Reddit</span>
                </button>
                <button className="social-share-btn" onClick={() => handleSocialShare('pinterest')}>
                  <i className="fa-brands fa-pinterest"></i>
                  <span>Pinterest</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Embed Tab */}
        {activeTab === 'embed' && type === 'video' && (
          <div className="enhanced-share-content">
            <div className="embed-section">
              <h3>Embed Video</h3>
              <p className="embed-description">
                Copy and paste this code into your website to embed this video.
              </p>
              <div className="embed-code-container">
                <textarea
                  ref={embedCodeRef}
                  value={embedCode}
                  readOnly
                  className="embed-code-textarea"
                  rows="8"
                />
                <button className="copy-embed-btn" onClick={handleCopyEmbed}>
                  {copied ? (
                    <>
                      <i className="fa-solid fa-check"></i>
                      Copied!
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-copy"></i>
                      Copy Embed Code
                    </>
                  )}
                </button>
              </div>
              <div className="embed-preview">
                <div className="embed-preview-placeholder">
                  <i className="fa-solid fa-code"></i>
                  <p>Preview of embedded video</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Download Tab */}
        {activeTab === 'download' && type === 'video' && (
          <div className="enhanced-share-content">
            <div className="download-section">
              <h3>Download Video</h3>
              <div className="download-warning">
                <i className="fa-solid fa-info-circle"></i>
                <p>
                  Downloaded videos will include a TikTok watermark. 
                  Please respect the creator's content and follow our Terms of Service.
                </p>
              </div>
              {isDownloading ? (
                <div className="download-progress-container">
                  <div className="download-progress-bar">
                    <div 
                      className="download-progress-fill"
                      style={{ width: `${downloadProgress}%` }}
                    ></div>
                  </div>
                  <p className="download-progress-text">
                    Downloading... {Math.round(downloadProgress)}%
                  </p>
                </div>
              ) : (
                <button className="download-video-btn" onClick={handleDownloadVideo}>
                  <i className="fa-solid fa-download"></i>
                  <span>Download Video</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedShare;
