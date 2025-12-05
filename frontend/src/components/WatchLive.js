import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { getLiveStreamDetails, sendChatMessage, toggleLikeLiveStream } from '../api/live';
import './WatchLive.css';

const WatchLive = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [hasGuest, setHasGuest] = useState(false);
  const [guestVideo, setGuestVideo] = useState(null);
  const [endedModalOpen, setEndedModalOpen] = useState(false);
  const [endedInfo, setEndedInfo] = useState(null);
  
  const videoRef = useRef(null);
  const guestVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const hostSocketIdRef = useRef(null);
  const chatEndRef = useRef(null);
  const roomIdRef = useRef(null);

  useEffect(() => {
    if (!streamId) {
      navigate('/live');
      return;
    }

    fetchStreamDetails();
    return () => {
      cleanup();
    };
  }, [streamId]);

  useEffect(() => {
    if (socket && isConnected && stream) {
      setupSocketListeners();
      joinRoom();
    }

    return () => {
      if (socket) {
        socket.off('live:joined');
        socket.off('live:error');
        socket.off('live:chat');
        socket.off('live:reaction');
        socket.off('live:viewer-count');
        socket.off('live:host-offline');
        socket.off('live:ended');
        socket.off('live:guest-joined');
        socket.off('live:guest-left');
        socket.off('webrtc:offer');
        socket.off('webrtc:answer');
        socket.off('webrtc:ice-candidate');
      }
    };
  }, [socket, isConnected, stream]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchStreamDetails = async () => {
    try {
      setLoading(true);
      const response = await getLiveStreamDetails(streamId);
      if (response.success) {
        setStream(response.stream);
        setViewerCount(response.stream.viewers || 0);
        setLikes(response.stream.likes || 0);
        setIsLiked(response.stream.likedBy?.includes?.(localStorage.getItem('userId')) || false);
        // Prefer the Mongo _id for socket room joins; fall back to roomId
        roomIdRef.current = response.stream._id || response.stream.roomId || streamId;
      }
    } catch (error) {
      console.error('Error fetching stream details:', error);
      navigate('/live');
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    socket.on('live:joined', (data) => {
      console.log('Joined live room:', data);
      setIsConnecting(false);
      setViewerCount(data.viewerCount || 0);
      // store host socket id so viewer can target offers/ICE to the host
      hostSocketIdRef.current = data.hostSocketId || null;
      // Start WebRTC connection to host
      setupWebRTC('viewer');
    });

    socket.on('live:error', (error) => {
      console.error('Live stream error:', error);
      setIsConnecting(false);
    });

    socket.on('live:chat', (data) => {
      setChatMessages((prev) => [...prev, data.message]);
    });

    socket.on('live:reaction', (data) => {
      // Show reaction animation
      showReactionAnimation(data.type);
    });

    socket.on('live:viewer-count', (data) => {
      setViewerCount(data.count || 0);
    });

    socket.on('live:host-offline', () => {
      setIsConnecting(true);
    });

    socket.on('live:ended', (data) => {
      console.log('Received live:ended', data);
      // Show end-of-stream modal to user instead of an alert
      setEndedInfo({ message: (data && data.message) || 'The live stream has ended' });
      setEndedModalOpen(true);
    });

    socket.on('live:guest-joined', (data) => {
      setHasGuest(true);
      // Setup WebRTC for guest video
      setupGuestWebRTC(data.guestId);
    });

    socket.on('live:guest-left', () => {
      setHasGuest(false);
      if (guestVideoRef.current) {
        guestVideoRef.current.srcObject = null;
      }
    });

    // WebRTC signaling
    socket.on('webrtc:offer', async (data) => {
      await handleWebRTCOffer(data);
    });

    socket.on('webrtc:answer', async (data) => {
      await handleWebRTCAnswer(data);
    });

    socket.on('webrtc:ice-candidate', async (data) => {
      await handleICE(data);
    });
  };

  const joinRoom = () => {
    if (socket && roomIdRef.current) {
      socket.emit('live:join', {
        roomId: roomIdRef.current,
        role: 'viewer'
      });
    }
  };

  const setupWebRTC = async (role) => {
    try {
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      peerConnectionRef.current = new RTCPeerConnection(configuration);

      // Handle incoming stream
      peerConnectionRef.current.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setIsConnecting(false);
        }
      };

      // Handle ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('webrtc:ice-candidate', {
            roomId: roomIdRef.current,
            candidate: event.candidate,
            targetId: hostSocketIdRef.current || stream.streamer._id
          });
        }
      };

      // For viewers we do NOT create the offer — the host creates the offer and sends it to the viewer.
      // Viewer simply creates the RTCPeerConnection and waits for an incoming offer from the host.
    } catch (error) {
      console.error('WebRTC setup error:', error);
      setIsConnecting(false);
    }
  };

  const setupGuestWebRTC = async (guestId) => {
    // Similar setup for guest video
    // This would connect to guest's video stream
  };

  const handleWebRTCOffer = async (data) => {
    if (!peerConnectionRef.current) return;
    
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      
      socket.emit('webrtc:answer', {
        roomId: roomIdRef.current,
        answer: answer,
        targetId: data.fromId
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleWebRTCAnswer = async (data) => {
    if (!peerConnectionRef.current) return;
    
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleICE = async (data) => {
    if (!peerConnectionRef.current) return;
    
    try {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;

    try {
      socket.emit('live:chat', {
        roomId: roomIdRef.current,
        message: chatInput.trim()
      });
      setChatInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const sendReaction = (type = 'heart') => {
    if (socket && roomIdRef.current) {
      socket.emit('live:reaction', {
        roomId: roomIdRef.current,
        type
      });
      showReactionAnimation(type);
    }
  };

  const showReactionAnimation = (type) => {
    // Create floating reaction element
    const reaction = document.createElement('div');
    reaction.className = `reaction-float reaction-${type}`;
    reaction.innerHTML = type === 'heart' ? '❤️' : '🔥';
    document.querySelector('.watch-live-video-container')?.appendChild(reaction);
    
    setTimeout(() => {
      reaction.remove();
    }, 3000);
  };

  const handleLike = async () => {
    try {
      const response = await toggleLikeLiveStream(streamId);
      if (response.success) {
        setIsLiked(response.isLiked);
        setLikes(response.likes);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const cleanup = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (socket && roomIdRef.current) {
      socket.emit('live:leave');
    }
  };

  if (loading) {
    return (
      <div className="watch-live-loading">
        <div className="spinner"></div>
        <p>Loading stream...</p>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="watch-live-error">
        <h2>Stream not found</h2>
        <button onClick={() => navigate('/live')}>Go to Live List</button>
      </div>
    );
  }

  return (
    <div className="watch-live-container">
      <div className="watch-live-main">
        <div className="watch-live-video-container">
          {/* End-of-stream modal */}
          {endedModalOpen && (
            <div className="end-stream-modal" role="dialog" aria-modal="true">
              <div className="end-modal-content">
                <h3>Stream Ended</h3>
                <p>{endedInfo?.message || 'This live stream has ended.'}</p>
                <div className="end-modal-buttons">
                  <button
                    className="end-modal-btn primary"
                    onClick={() => navigate('/live')}
                  >
                    Back to Live List
                  </button>
                  <button
                    className="end-modal-btn"
                    onClick={() => setEndedModalOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Visible LIVE badge for viewers */}
          <div className="watch-live-badge" aria-hidden="true">
            <span className="watch-live-dot" />
            LIVE
          </div>
          {isConnecting && (
            <div className="connecting-overlay">
              <div className="connecting-spinner"></div>
              <p>Connecting to stream...</p>
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={false}
            className="watch-live-video"
          />
          {hasGuest && (
            <div className="guest-video-container">
              <video
                ref={guestVideoRef}
                autoPlay
                playsInline
                muted={false}
                className="guest-video"
              />
            </div>
          )}
          <div className="watch-live-controls">
            <div className="watch-live-info">
              <div className="streamer-info">
                <img
                  src={stream.streamer?.profile?.profilePicture || '/default-avatar.png'}
                  alt={stream.streamer?.username}
                  className="streamer-avatar"
                />
                <div>
                  <h3>{stream.streamer?.username}</h3>
                  <p>{stream.title}</p>
                </div>
              </div>
            </div>
            <div className="watch-live-stats">
              <div className="stat-item">
                <i className="fa-solid fa-eye"></i>
                <span>{viewerCount.toLocaleString()}</span>
              </div>
              <button
                className={`like-btn ${isLiked ? 'liked' : ''}`}
                onClick={handleLike}
              >
                <i className="fa-solid fa-heart"></i>
                <span>{likes.toLocaleString()}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="watch-live-sidebar">
          <div className="chat-container">
            <div className="chat-header">
              <h3>Live Chat</h3>
              <span className="viewer-count-badge">{viewerCount} watching</span>
            </div>
            <div className="chat-messages">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className="chat-message">
                  <img
                    src={msg.user?.profile?.profilePicture || '/default-avatar.png'}
                    alt={msg.user?.username}
                    className="chat-avatar"
                  />
                  <div className="chat-content">
                    <span className="chat-username">{msg.user?.username}</span>
                    <span className="chat-text">{msg.message}</span>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={sendMessage} className="chat-input-form">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Say something..."
                className="chat-input"
              />
              <button type="submit" className="chat-send-btn">
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </form>
          </div>

          <div className="reactions-container">
            <button
              className="reaction-btn"
              onClick={() => sendReaction('heart')}
              title="Send Heart"
            >
              ❤️
            </button>
            <button
              className="reaction-btn"
              onClick={() => sendReaction('fire')}
              title="Send Fire"
            >
              🔥
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchLive;

