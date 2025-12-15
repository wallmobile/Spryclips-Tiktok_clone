import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import { getConversations, getMessages, sendMessage, getOrCreateConversation, markMessageAsRead } from '../../api/messages';
import { searchUsers } from '../../api/search';
import CallModal from './CallModal';
import './MessageCenter.css';

// All conversations will be fetched from backend API - no hardcoded data

const getParticipant = (conversation, currentUser) => {
  if (Array.isArray(conversation?.participants) && conversation.participants.length) {
    const currentUserId = currentUser?._id || currentUser?.id;
    const currentUsername = currentUser?.username;
    const match = conversation.participants.find((participant) => {
      const participantId = participant?.id || participant?._id || participant?.userId;
      const participantUsername = participant?.username || participant?.handle;
      if (participantId && currentUserId) {
        return participantId !== currentUserId;
      }
      if (participantUsername && currentUsername) {
        return participantUsername !== currentUsername;
      }
      return true;
    });
    return match || conversation.participants[0];
  }
  return conversation?.participant || conversation?.user || conversation?.contact || {};
};

const convertMessage = (message, currentUser) => {
  if (!message) {
    return null;
  }
  const senderInfo = message.sender || message.from || {};
  const senderId = senderInfo?._id || senderInfo?.id || message.senderId;
  const currentUserId = currentUser?._id || currentUser?.id;
  const senderUsername =
    typeof message.sender === 'string'
      ? message.sender
      : senderInfo.username || senderInfo.handle || senderInfo.displayName || senderInfo.name || 'creator';
  const isSelf = senderId
    ? senderId === currentUserId
    : senderUsername === currentUser?.username || senderUsername === currentUser?.displayName;
  const timestamp = message.createdAt || message.timestamp || message.time;

  // Extract text from content object or use direct text field
  let messageText = '';
  if (message.text) {
    messageText = message.text;
  } else if (message.content) {
    // Backend returns content as object: { text, mediaUrl, mediaType, thumbnail }
    messageText = typeof message.content === 'object' ? (message.content.text || '') : message.content;
  }

  return {
    id: message.id || message._id || Date.now(),
    sender: isSelf ? 'me' : senderUsername || 'creator',
    text: messageText,
    time: timestamp
      ? (() => {
          try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } catch {
            return '';
          }
        })()
      : '',
    isRead: Boolean(message.isRead ?? message.read ?? isSelf)
  };
};

const convertConversation = (conversation, currentUser) => {
  const participant = getParticipant(conversation, currentUser);
  const displayName = participant?.displayName || participant?.name || participant?.username || 'Creator';
  const username = participant?.username || participant?.handle || displayName;
  const avatar =
    participant?.profile?.avatar ||
    participant?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2563EB&color=fff`;
  const lastMessage = conversation?.lastMessage
    ? convertMessage(conversation.lastMessage, currentUser)
    : null;

  return {
    id: conversation.id || conversation._id || conversation.conversationId,
    user: {
      id: participant?._id || participant?.id || participant?.userId,
      _id: participant?._id || participant?.id || participant?.userId,
      username,
      displayName,
      avatar,
      isOnline: Boolean(participant?.isOnline),
      lastSeen: participant?.lastSeen || ''
    },
    lastMessage,
    unreadCount: conversation.unreadCount ?? conversation.unreadMessages ?? 0,
    messages: conversation.messages || []
  };
};

const MessageCenter = ({ onClose, initialUser }) => {
  const { user } = useAuth();
  
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [conversationError, setConversationError] = useState(null);
  const [sendError, setSendError] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [newChatError, setNewChatError] = useState(null);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callType, setCallType] = useState(null); // 'audio' or 'video'
  const [incomingCall, setIncomingCall] = useState(null);
  
  const { socket, isConnected } = useSocket();

  // Search users for new message
  const handleUserSearch = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchedUsers([]);
      return;
    }
    
    setIsSearchingUsers(true);
    try {
      const response = await searchUsers(query);
      const users = response?.users || [];
      // Filter out current user
      const filteredUsers = users.filter(u => u._id !== user?._id && u.username !== user?.username);
      setSearchedUsers(filteredUsers);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchedUsers([]);
    } finally {
      setIsSearchingUsers(false);
    }
  }, [user]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearchQuery) {
        handleUserSearch(userSearchQuery);
      } else {
        setSearchedUsers([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery, handleUserSearch]);

  // Fetch suggested users when modal opens
  useEffect(() => {
    if (showNewMessage && suggestedUsers.length === 0) {
      const fetchSuggestedUsers = async () => {
        try {
          // Fetch some users to suggest
          const response = await searchUsers('');
          const users = response?.users || [];
          // Filter out current user and take first 5
          const filtered = users
            .filter(u => u._id !== user?._id && u.username !== user?.username)
            .slice(0, 5)
            .map(u => ({
              _id: u._id,
              username: u.username,
              displayName: u.profile?.displayName || u.username,
              avatar: u.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=E74C3C&color=fff`,
              followers: u.followersCount || 0,
              isVerified: u.isVerified || false
            }));
          setSuggestedUsers(filtered);
        } catch (error) {
          console.error('Error fetching suggested users:', error);
        }
      };
      fetchSuggestedUsers();
    }
  }, [showNewMessage, suggestedUsers.length, user]);

  // Handle incoming calls
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleIncomingCall = (data) => {
      console.log('[MessageCenter] Incoming call:', data);
      setIncomingCall({
        callId: data.callId,
        callType: data.callType,
        caller: {
          ...data.caller,
          id: data.caller?.id || data.caller?._id,
          _id: data.caller?._id || data.caller?.id
        },
        offer: data.offer
      });
      setShowCallModal(true);
    };

    socket.on('call:incoming', handleIncomingCall);

    return () => {
      socket.off('call:incoming', handleIncomingCall);
    };
  }, [socket, isConnected]);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      return;
    }

    const fetchConversations = async () => {
      setIsLoadingConversations(true);
      setConversationError(null);
      try {
        const response = await getConversations();
        const rawConversations = Array.isArray(response?.conversations)
          ? response.conversations
          : Array.isArray(response)
          ? response
          : [];

        setConversations(rawConversations.map((conversation) => convertConversation(conversation, user)));
      } catch (error) {
        console.error('Error fetching conversations:', error);
        setConversationError('Unable to load conversations. Please try again.');
        setConversations([]);
      } finally {
        setIsLoadingConversations(false);
      }
    };

    fetchConversations();
  }, [user]);

  // Auto-open conversation with initialUser if provided
  useEffect(() => {
    if (!initialUser || !user || conversations.length === 0 || activeChat) {
      return;
    }

    const openInitialUserChat = async () => {
      try {
        // First, try to find existing conversation
        const existingConversation = conversations.find(conv => 
          conv.user.username === initialUser || 
          conv.user.username === initialUser.replace('@', '')
        );
        
        if (existingConversation) {
          await openConversation(existingConversation);
        } else {
          // No existing conversation, search for user and create new chat
          try {
            const response = await searchUsers(initialUser.replace('@', ''));
            const users = response?.users || [];
            const targetUser = users.find(u => 
              u.username === initialUser || 
              u.username === initialUser.replace('@', '')
            );
            
            if (targetUser) {
              await handleStartNewChat(targetUser);
            } else {
              console.warn('User not found for initialUser:', initialUser);
            }
          } catch (error) {
            console.error('Error searching for initial user:', error);
          }
        }
      } catch (error) {
        console.error('Error opening initial user chat:', error);
      }
    };

    openInitialUserChat();
  }, [initialUser, user, conversations, activeChat]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChat) {
      return;
    }

    const text = messageText.trim();
    setMessageText('');
    setSendError(null);
    setIsSending(true);

    const optimisticMessage = {
      id: Date.now(),
      sender: 'me',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: true,
      optimistic: true
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      // Backend expects content object with text field
      const response = await sendMessage(activeChat.id, { content: { text } });
      const delivered = convertMessage(response?.message || response, user) || optimisticMessage;

      setMessages((prev) =>
        prev.map((msg) => (msg.id === optimisticMessage.id ? delivered : msg))
      );

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeChat.id
            ? {
                ...conv,
                lastMessage: delivered,
                unreadCount: 0
              }
            : conv
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      setSendError('Unable to send message. Please try again.');
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
      setMessageText(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleStartNewChat = async (selectedUser) => {
    try {
      setIsStartingChat(true);
      setNewChatError(null);
      
      const userId = selectedUser._id || selectedUser.id || selectedUser.userId || selectedUser.username;
      const response = await getOrCreateConversation(userId);
      const conversationData = response?.conversation || response;
      const normalized = convertConversation(conversationData, user);
      
      setConversations((prev) => {
        const exists = prev.some((conv) => conv.id === normalized.id);
        return exists
          ? prev.map((conv) => (conv.id === normalized.id ? normalized : conv))
          : [normalized, ...prev];
      });
      
      setShowNewMessage(false);
      setUserSearchQuery('');
      setSearchedUsers([]);
      setNewChatError(null);
      
      await openConversation(normalized);
    } catch (error) {
      console.error('Error starting conversation:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Unable to start conversation. Please try again.';
      setNewChatError(errorMessage);
    } finally {
      setIsStartingChat(false);
    }
  };

  const openConversation = async (conversation) => {
    if (!conversation) {
      return;
    }

    setActiveChat(conversation);
    setMessages([]);
    setMessagesLoading(true);
    setSendError(null);

    try {
      const response = conversation.id ? await getMessages(conversation.id) : null;
      const rawMessages = Array.isArray(response?.messages)
        ? response.messages
        : Array.isArray(response)
        ? response
        : [];

      const normalizedMessages = rawMessages.length
        ? rawMessages.map((message) => convertMessage(message, user))
        : (conversation.messages || []).map((message) => convertMessage(message, user));

      setMessages(normalizedMessages);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversation.id
            ? {
                ...conv,
                unreadCount: 0,
                lastMessage:
                  normalizedMessages.length > 0
                    ? normalizedMessages[normalizedMessages.length - 1]
                    : conv.lastMessage
              }
            : conv
        )
      );

      const unreadMessages = rawMessages.filter((msg) => {
        const senderId = msg?.sender?._id || msg?.sender?.id || msg?.senderId;
        const currentUserId = user?._id || user?.id;
        return !(msg?.isRead ?? msg?.read) && senderId && senderId !== currentUserId;
      });

      if (unreadMessages.length) {
        await Promise.all(
          unreadMessages
            .map((msg) => msg?.id || msg?._id)
            .filter(Boolean)
            .map((messageId) => markMessageAsRead(messageId))
        );
      }
      } catch (error) {
        console.error('Error loading messages:', error);
        setConversationError('Unable to load messages for this conversation. Please try again.');
        setMessages([]);
      } finally {
      setMessagesLoading(false);
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    const username = (conv.user?.username || '').toLowerCase();
    const displayName = (conv.user?.displayName || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return displayName.includes(query) || username.includes(query);
  });

  const totalUnreadCount = conversations.reduce((total, conv) => total + conv.unreadCount, 0);

  return (
    <div className="message-center-overlay" onClick={onClose}>
      <div className="message-center-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="message-center-header">
          <button className="message-center-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>
            Messages 
            {totalUnreadCount > 0 && (
              <span className="unread-badge">{totalUnreadCount}</span>
            )}
          </h2>
          <button 
            className="new-message-btn"
            onClick={() => setShowNewMessage(true)}
          >
            <i className="fa-solid fa-plus"></i>
          </button>
        </div>

        <div className="message-center-content">
          {/* Sidebar */}
          <div className="message-sidebar">
            {conversationError && (
              <div className="message-alert error" role="alert">
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>{conversationError}</span>
              </div>
            )}
            {/* Search */}
            <div className="message-search">
              <div className="search-input-container">
                <i className="fa-solid fa-magnifying-glass search-icon"></i>
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="message-search-input"
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="conversations-list">
              {isLoadingConversations ? (
                <div className="conversations-loading" role="status">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Loading conversations...</span>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="conversations-empty">
                  <i className="fa-solid fa-inbox"></i>
                  <p>No conversations yet. Start a new one!</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`conversation-item ${activeChat?.id === conversation.id ? 'active' : ''}`}
                    onClick={() => openConversation(conversation)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openConversation(conversation);
                      }
                    }}
                  >
                    <div className="conversation-avatar">
                      <img src={conversation.user.avatar} alt={conversation.user.displayName} />
                      {conversation.user.isOnline && <div className="online-indicator"></div>}
                    </div>
                    <div className="conversation-info">
                      <div className="conversation-header">
                        <h4>{conversation.user.displayName}</h4>
                        <span className="conversation-time">
                          {conversation.lastMessage?.time || 'No messages'}
                        </span>
                      </div>
                      <div className="conversation-preview">
                        <p>{conversation.lastMessage?.text || 'Start a conversation'}</p>
                        {conversation.unreadCount > 0 && (
                          <span className="unread-count">{conversation.unreadCount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="chat-area">
            {activeChat ? (
              <>
                {/* Chat Header */}
                <div className="chat-header">
                  <div className="chat-user-info">
                    <div className="chat-avatar">
                      <img src={activeChat.user.avatar} alt={activeChat.user.displayName} />
                      {activeChat.user.isOnline && <div className="online-indicator"></div>}
                    </div>
                    <div className="chat-user-details">
                      <h3>{activeChat.user.displayName}</h3>
                      <p>@{activeChat.user.username} • {activeChat.user.lastSeen}</p>
                    </div>
                  </div>
                  <div className="chat-actions">
                    <button 
                      className="chat-action-btn"
                      onClick={() => {
                        setCallType('audio');
                        setShowCallModal(true);
                      }}
                      title="Audio call"
                    >
                      <i className="fa-solid fa-phone"></i>
                    </button>
                    <button 
                      className="chat-action-btn"
                      onClick={() => {
                        setCallType('video');
                        setShowCallModal(true);
                      }}
                      title="Video call"
                    >
                      <i className="fa-solid fa-video"></i>
                    </button>
                    <button className="chat-action-btn">
                      <i className="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="chat-messages">
                  {messagesLoading ? (
                    <div className="chat-loading">
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <p>Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="chat-empty">
                      <i className="fa-solid fa-message-slash"></i>
                      <p>No messages in this conversation yet.</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`message ${message.sender === 'me' ? 'sent' : 'received'}`}
                      >
                        <div className="message-content">
                          <p>{message.text}</p>
                          <span className="message-time">{message.time}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <form className="message-input-form" onSubmit={handleSendMessage}>
                  <div className="message-input-container">
                    <button type="button" className="attachment-btn">
                      <i className="fa-solid fa-paperclip"></i>
                    </button>
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="message-input"
                    />
                    <button type="button" className="emoji-btn">
                      <i className="fa-solid fa-face-smile"></i>
                    </button>
                    <button type="submit" className="send-btn" disabled={!messageText.trim() || isSending}>
                      {isSending ? (
                        <i className="fa-solid fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fa-solid fa-paper-plane"></i>
                      )}
                    </button>
                  </div>
                  {sendError && (
                    <div className="message-alert error" role="alert">
                      <i className="fa-solid fa-circle-exclamation"></i>
                      <span>{sendError}</span>
                    </div>
                  )}
                </form>
              </>
            ) : (
              <div className="no-chat-selected">
                <div className="no-chat-icon">
                  <i className="fa-solid fa-comments"></i>
                </div>
                <h3>Select a conversation</h3>
                <p>Choose from your existing conversations or start a new one</p>
                <button 
                  className="start-new-chat-btn"
                  onClick={() => setShowNewMessage(true)}
                >
                  <i className="fa-solid fa-plus"></i>
                  New Message
                </button>
              </div>
            )}
          </div>
        </div>

        {/* New Message Modal */}
        {showNewMessage && (
          <div className="new-message-overlay" onClick={() => { setShowNewMessage(false); setNewChatError(null); }}>
            <div className="new-message-modal" onClick={(e) => e.stopPropagation()}>
              <div className="new-message-header">
                <h3>New Message</h3>
                <button className="new-message-close" onClick={() => { setShowNewMessage(false); setNewChatError(null); }}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="new-message-body">
                {/* Error Message */}
                {newChatError && (
                  <div className="message-alert error" role="alert" style={{ margin: '0 0 16px 0' }}>
                    <i className="fa-solid fa-circle-exclamation"></i>
                    <span>{newChatError}</span>
                  </div>
                )}

                {/* Loading Overlay */}
                {isStartingChat && (
                  <div className="starting-chat-overlay">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <p>Starting conversation...</p>
                  </div>
                )}

                <div className="user-search">
                  <input
                    type="text"
                    placeholder="Search users by username..."
                    className="user-search-input"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    autoFocus
                    disabled={isStartingChat}
                  />
                  {isSearchingUsers && (
                    <i className="fa-solid fa-spinner fa-spin search-spinner"></i>
                  )}
                </div>
                
                {/* Search Results */}
                {userSearchQuery && searchedUsers.length > 0 && (
                  <div className="search-results-users">
                    <h4>Search Results</h4>
                    <div className="users-list">
                      {searchedUsers.map((searchedUser) => (
                        <div
                          key={searchedUser._id}
                          className={`user-item ${isStartingChat ? 'disabled' : ''}`}
                          onClick={() => !isStartingChat && handleStartNewChat({
                            _id: searchedUser._id,
                            username: searchedUser.username,
                            displayName: searchedUser.displayName || searchedUser.profile?.displayName,
                            avatar: searchedUser.avatar || searchedUser.profile?.avatar,
                            isVerified: searchedUser.isVerified
                          })}
                        >
                          <div className="user-avatar">
                            <img src={searchedUser.avatar || searchedUser.profile?.avatar || `https://ui-avatars.com/api/?name=${searchedUser.username}&background=E74C3C&color=fff`} alt={searchedUser.displayName || searchedUser.username} />
                          </div>
                          <div className="user-info">
                            <div className="user-name">
                              {searchedUser.displayName || searchedUser.profile?.displayName || searchedUser.username}
                              {searchedUser.isVerified && (
                                <i className="fa-solid fa-circle-check verified-icon"></i>
                              )}
                            </div>
                            <div className="user-details">
                              @{searchedUser.username} • {searchedUser.followersCount?.toLocaleString() || 0} followers
                            </div>
                          </div>
                          <button className="message-user-btn" disabled={isStartingChat}>
                            <i className="fa-solid fa-paper-plane"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results */}
                {userSearchQuery && userSearchQuery.length >= 2 && !isSearchingUsers && searchedUsers.length === 0 && (
                  <div className="no-users-found">
                    <i className="fa-solid fa-user-slash"></i>
                    <p>No users found for "{userSearchQuery}"</p>
                  </div>
                )}

                {/* Suggested Users (show when not searching) */}
                {!userSearchQuery && (
                  <div className="suggested-users">
                    <h4>Suggested</h4>
                    <div className="users-list">
                      {suggestedUsers.length === 0 ? (
                        <div className="no-suggestions">
                          <i className="fa-solid fa-users"></i>
                          <p>Search for users to start a conversation</p>
                        </div>
                      ) : (
                        suggestedUsers.map((suggestedUser) => (
                          <div
                            key={suggestedUser._id}
                            className={`user-item ${isStartingChat ? 'disabled' : ''}`}
                            onClick={() => !isStartingChat && handleStartNewChat(suggestedUser)}
                          >
                            <div className="user-avatar">
                              <img src={suggestedUser.avatar} alt={suggestedUser.displayName} />
                            </div>
                            <div className="user-info">
                              <div className="user-name">
                                {suggestedUser.displayName}
                                {suggestedUser.isVerified && (
                                  <i className="fa-solid fa-circle-check verified-icon"></i>
                                )}
                              </div>
                              <div className="user-details">
                                @{suggestedUser.username} • {suggestedUser.followers?.toLocaleString() || 0} followers
                              </div>
                            </div>
                            <button className="message-user-btn" disabled={isStartingChat}>
                              <i className="fa-solid fa-paper-plane"></i>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Call Modal */}
      {showCallModal && activeChat && (
        <CallModal
          isOpen={showCallModal}
          onClose={() => {
            setShowCallModal(false);
            setCallType(null);
          }}
          callType={callType}
          otherUser={{
            ...activeChat.user,
            id: activeChat.user?.id || activeChat.user?._id || activeChat.id,
            _id: activeChat.user?._id || activeChat.user?.id || activeChat.id
          }}
          currentUser={user}
        />
      )}

      {/* Incoming Call Modal */}
      {incomingCall && (
        <CallModal
          isOpen={!!incomingCall}
          onClose={() => {
            setIncomingCall(null);
          }}
          callType={incomingCall?.callType}
          otherUser={incomingCall?.caller}
          currentUser={user}
          incomingCall={incomingCall}
        />
      )}
    </div>
  );
};

export default MessageCenter;














