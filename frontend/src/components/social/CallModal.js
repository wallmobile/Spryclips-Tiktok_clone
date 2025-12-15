import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import './CallModal.css';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

const CallModal = ({ isOpen, onClose, callType, otherUser, currentUser, incomingCall = null }) => {
  const { socket, isConnected } = useSocket();
  const [callState, setCallState] = useState('idle'); // idle, calling, ringing, connected, ended
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [isRemoteVideoOff, setIsRemoteVideoOff] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const callIdRef = useRef(null);
  const isIncomingRef = useRef(!!incomingCall);

  // Initialize call (outgoing or incoming)
  useEffect(() => {
    if (!isOpen || !socket || !isConnected || !otherUser) {
      console.log('[Call] CallModal not ready:', { isOpen, hasSocket: !!socket, isConnected, hasOtherUser: !!otherUser });
      return;
    }

    const isIncoming = !!incomingCall;
    isIncomingRef.current = isIncoming;

    if (isIncoming) {
      // Handle incoming call - just set state, user will accept/reject
      callIdRef.current = incomingCall.callId;
      setCallState('ringing');
      console.log('[Call] Incoming call received:', incomingCall);
      return;
    }

    // Handle outgoing call
    const initializeCall = async () => {
      try {
        // Generate unique call ID
        callIdRef.current = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Get user media
        const constraints = {
          audio: true,
          video: callType === 'video' ? {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } : false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create peer connection
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionRef.current = pc;

        // Add local tracks
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate && socket) {
            socket.emit('call:ice-candidate', {
              callId: callIdRef.current,
              candidate: event.candidate,
              targetUserId: String(otherUser.id || otherUser._id)
            });
          }
        };

        // Handle remote stream
        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setIsRemoteVideoOff(false);
          }
        };

        // Handle connection state
        pc.onconnectionstatechange = () => {
          console.log('[Call] Connection state:', pc.connectionState);
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            endCall();
          }
        };

        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Send call request
        setCallState('calling');
        const targetUserId = String(otherUser.id || otherUser._id);
        console.log('[Call] Initiating call to:', targetUserId, 'Type:', callType);
        socket.emit('call:initiate', {
          callId: callIdRef.current,
          callType,
          targetUserId: targetUserId,
          offer: pc.localDescription
        });
        
        // Listen for errors
        const handleCallError = (data) => {
          if (data.callId === callIdRef.current) {
            console.error('[Call] Call error:', data.message);
            alert(data.message || 'Failed to initiate call');
            endCall();
          }
        };
        
        socket.on('call:error', handleCallError);
        
        return () => {
          socket.off('call:error', handleCallError);
        };

      } catch (error) {
        console.error('[Call] Error initializing call:', error);
        alert('Failed to start call. Please check your camera/microphone permissions.');
        onClose();
      }
    };

    initializeCall();

    // Listen for call responses
    const handleCallAccepted = async (data) => {
      if (data.callId === callIdRef.current && peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          setCallState('connected');
        } catch (error) {
          console.error('[Call] Error setting remote description:', error);
        }
      }
    };

    const handleCallRejected = (data) => {
      if (data.callId === callIdRef.current) {
        setCallState('ended');
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    };

    const handleCallEnded = (data) => {
      if (data.callId === callIdRef.current) {
        endCall();
      }
    };

    const handleIncomingAnswer = async (data) => {
      if (data.callId === callIdRef.current && peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          setCallState('connected');
        } catch (error) {
          console.error('[Call] Error setting remote description:', error);
        }
      }
    };

    const handleIncomingICE = async (data) => {
      if (data.callId === callIdRef.current && peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error('[Call] Error adding ICE candidate:', error);
        }
      }
    };

    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:answer', handleIncomingAnswer);
    socket.on('call:ice-candidate', handleIncomingICE);

    return () => {
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:rejected', handleCallRejected);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:answer', handleIncomingAnswer);
      socket.off('call:ice-candidate', handleIncomingICE);
    };
  }, [isOpen, socket, isConnected, otherUser, callType, onClose, incomingCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (socket && callIdRef.current && otherUser) {
      const targetUserId = String(otherUser.id || otherUser._id);
      console.log('[Call] Ending call with:', targetUserId);
      socket.emit('call:end', {
        callId: callIdRef.current,
        targetUserId: targetUserId
      });
    }

    setCallState('ended');
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="call-modal-overlay">
      <div className="call-modal">
        <div className="call-header">
          <div className="call-user-info">
            <img 
              src={otherUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.displayName || 'User')}&background=2563EB&color=fff`} 
              alt={otherUser?.displayName}
              className="call-user-avatar"
            />
            <div className="call-user-details">
              <h3>{otherUser?.displayName || 'User'}</h3>
              <p className="call-status">
                {callState === 'calling' && 'Calling...'}
                {callState === 'ringing' && 'Ringing...'}
                {callState === 'connected' && 'Connected'}
                {callState === 'ended' && 'Call Ended'}
              </p>
            </div>
          </div>
        </div>

        <div className="call-video-container">
          {/* Remote video */}
          <div className="remote-video-wrapper">
            {callType === 'video' ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="remote-video"
                style={{ display: isRemoteVideoOff ? 'none' : 'block' }}
              />
            ) : null}
            {isRemoteVideoOff && callType === 'video' && (
              <div className="video-placeholder">
                <i className="fa-solid fa-user"></i>
              </div>
            )}
          </div>

          {/* Local video (picture-in-picture) */}
          {callType === 'video' && (
            <div className="local-video-wrapper">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="local-video"
                style={{ display: isVideoOff ? 'none' : 'block' }}
              />
              {isVideoOff && (
                <div className="video-placeholder small">
                  <i className="fa-solid fa-user"></i>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="call-controls">
          {callState === 'ringing' && isIncomingRef.current ? (
            <>
              <button
                className="call-control-btn reject-call"
                onClick={async () => {
                  if (socket && callIdRef.current) {
                    const targetUserId = String(otherUser?.id || otherUser?._id);
                    console.log('[Call] Rejecting call from:', targetUserId);
                    socket.emit('call:reject', {
                      callId: callIdRef.current,
                      targetUserId: targetUserId
                    });
                  }
                  endCall();
                }}
                title="Reject call"
              >
                <i className="fa-solid fa-phone-slash"></i>
              </button>
              <button
                className="call-control-btn accept-call"
                onClick={async () => {
                  try {
                    // Get user media
                    const constraints = {
                      audio: true,
                      video: callType === 'video' ? {
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                      } : false
                    };

                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    localStreamRef.current = stream;
                    
                    if (localVideoRef.current) {
                      localVideoRef.current.srcObject = stream;
                    }

                    // Create peer connection
                    const pc = new RTCPeerConnection(ICE_SERVERS);
                    peerConnectionRef.current = pc;

                    // Add local tracks
                    stream.getTracks().forEach(track => {
                      pc.addTrack(track, stream);
                    });

                    // Handle ICE candidates
                    pc.onicecandidate = (event) => {
                      if (event.candidate && socket) {
                        socket.emit('call:ice-candidate', {
                          callId: callIdRef.current,
                          candidate: event.candidate,
                          targetUserId: String(otherUser.id || otherUser._id)
                        });
                      }
                    };

                    // Handle remote stream
                    pc.ontrack = (event) => {
                      if (remoteVideoRef.current && event.streams[0]) {
                        remoteVideoRef.current.srcObject = event.streams[0];
                        setIsRemoteVideoOff(false);
                      }
                    };

                    // Handle connection state
                    pc.onconnectionstatechange = () => {
                      console.log('[Call] Connection state:', pc.connectionState);
                      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                        endCall();
                      }
                    };

                    // Set remote description from incoming offer
                    if (incomingCall?.offer) {
                      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
                    }

                    // Create answer
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    // Send answer
                    const targetUserId = String(otherUser.id || otherUser._id);
                    console.log('[Call] Sending answer to:', targetUserId);
                    socket.emit('call:answer', {
                      callId: callIdRef.current,
                      answer: pc.localDescription,
                      targetUserId: targetUserId
                    });

                    setCallState('connected');
                  } catch (error) {
                    console.error('[Call] Error accepting call:', error);
                    alert('Failed to accept call. Please check your camera/microphone permissions.');
                    endCall();
                  }
                }}
                title="Accept call"
              >
                <i className="fa-solid fa-phone"></i>
              </button>
            </>
          ) : (
            <>
              <button
                className={`call-control-btn ${isMuted ? 'active' : ''}`}
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                <i className={`fa-solid ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
              </button>

              {callType === 'video' && (
                <button
                  className={`call-control-btn ${isVideoOff ? 'active' : ''}`}
                  onClick={toggleVideo}
                  title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                >
                  <i className={`fa-solid ${isVideoOff ? 'fa-video-slash' : 'fa-video'}`}></i>
                </button>
              )}

              <button
                className="call-control-btn end-call"
                onClick={endCall}
                title="End call"
              >
                <i className="fa-solid fa-phone-slash"></i>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallModal;

