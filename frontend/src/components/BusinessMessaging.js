import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  getConversations, 
  sendMessage as sendMessageAPI, 
  resolveConversation,
  createDemoConversations,
  getQuickReplies,
  createQuickReply,
  deleteQuickReply,
  searchUsers,
  startNewConversation,
  getMessagingSettings,
  updateMessagingSettings
} from '../api/business';
import './BusinessMessaging.css';

const BusinessMessaging = ({ onClose }) => {
  const navigate = useNavigate();
  useAuth(); // Auth context for protected route
  const [activeTab, setActiveTab] = useState('inbox');
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [toast, setToast] = useState(null);
  const [quickReplies, setQuickReplies] = useState([]);
  const [showQuickReplyForm, setShowQuickReplyForm] = useState(false);
  const [quickReplyForm, setQuickReplyForm] = useState({ title: '', message: '' });
  
  // Search & New Conversation
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  
  // Messaging Settings
  const [messagingSettings, setMessagingSettings] = useState({
    notifications: true,
    autoReply: false,
    autoReplyMessage: '',
    aiAssistant: true,
    messageFiltering: true
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Show Toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch conversations from backend
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const status = activeTab === 'inbox' ? 'inbox' : 'all';
      const response = await getConversations(status);
      
      if (response.success) {
        // Transform data for frontend
        const transformedConversations = response.conversations.map(conv => ({
          _id: conv._id,
          customer: {
            name: conv.customerInfo?.name || 'Customer',
            avatar: conv.customerInfo?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv._id}`,
            username: conv.customerInfo?.username || '@customer'
          },
          lastMessage: conv.lastMessage?.text || '',
          timestamp: new Date(conv.lastMessage?.timestamp || conv.updatedAt),
          unread: conv.unreadCount || 0,
          status: conv.status,
          messages: conv.messages?.map((msg, idx) => ({
            id: idx + 1,
            sender: msg.sender,
            text: msg.text,
            time: new Date(msg.timestamp)
          })) || []
        }));
        
        setConversations(transformedConversations);
        
        // If no conversations, create demo ones
        if (transformedConversations.length === 0) {
          await createDemoConversations();
          // Fetch again after creating demo
          const demoResponse = await getConversations(status);
          if (demoResponse.success && demoResponse.conversations.length > 0) {
            const demoTransformed = demoResponse.conversations.map(conv => ({
              _id: conv._id,
              customer: {
                name: conv.customerInfo?.name || 'Customer',
                avatar: conv.customerInfo?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv._id}`,
                username: conv.customerInfo?.username || '@customer'
              },
              lastMessage: conv.lastMessage?.text || '',
              timestamp: new Date(conv.lastMessage?.timestamp || conv.updatedAt),
              unread: conv.unreadCount || 0,
              status: conv.status,
              messages: conv.messages?.map((msg, idx) => ({
                id: idx + 1,
                sender: msg.sender,
                text: msg.text,
                time: new Date(msg.timestamp)
              })) || []
            }));
            setConversations(demoTransformed);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      showToast('Failed to load messages', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);
  
  // Fetch quick replies
  const fetchQuickReplies = useCallback(async () => {
    try {
      const response = await getQuickReplies();
      if (response.success) {
        setQuickReplies(response.quickReplies);
      }
    } catch (error) {
      console.error('Failed to fetch quick replies:', error);
    }
  }, []);
  
  // Fetch messaging settings
  const fetchMessagingSettings = useCallback(async () => {
    try {
      const response = await getMessagingSettings();
      if (response.success) {
        setMessagingSettings(response.settings);
      }
    } catch (error) {
      console.error('Failed to fetch messaging settings:', error);
    }
  }, []);
  
  // Update messaging setting
  const handleSettingChange = async (key, value) => {
    const newSettings = { ...messagingSettings, [key]: value };
    setMessagingSettings(newSettings);
    
    try {
      setSavingSettings(true);
      const response = await updateMessagingSettings(newSettings);
      if (response.success) {
        showToast('Setting saved! ✅');
      }
    } catch (error) {
      // Revert on error
      setMessagingSettings(messagingSettings);
      showToast('Failed to save setting', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchQuickReplies();
    fetchMessagingSettings();
  }, [fetchConversations, fetchQuickReplies, fetchMessagingSettings]);

  // Send message to backend
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;
    
    try {
      const response = await sendMessageAPI(selectedConversation._id, messageInput.trim());
      
      if (response.success) {
        const newMessage = {
          id: Date.now(),
          sender: 'business',
          text: messageInput,
          time: new Date()
        };

        setConversations(conversations.map(conv => {
          if (conv._id === selectedConversation._id) {
            return {
              ...conv,
              messages: [...conv.messages, newMessage],
              lastMessage: messageInput,
              timestamp: new Date()
            };
          }
          return conv;
        }));

        setSelectedConversation({
          ...selectedConversation,
          messages: [...selectedConversation.messages, newMessage]
        });

        setMessageInput('');
        showToast('Message sent!');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      showToast('Failed to send message', 'error');
    }
  };
  
  // Create quick reply
  const handleCreateQuickReply = async () => {
    if (!quickReplyForm.title || !quickReplyForm.message) {
      showToast('Please fill all fields', 'error');
      return;
    }
    
    try {
      const response = await createQuickReply(quickReplyForm);
      if (response.success) {
        setQuickReplies([response.quickReply, ...quickReplies]);
        setShowQuickReplyForm(false);
        setQuickReplyForm({ title: '', message: '' });
        showToast('Quick reply created!');
      }
    } catch (error) {
      showToast('Failed to create quick reply', 'error');
    }
  };
  
  // Delete quick reply
  const handleDeleteQuickReply = async (id) => {
    if (!window.confirm('Delete this quick reply?')) return;
    
    try {
      const response = await deleteQuickReply(id);
      if (response.success) {
        setQuickReplies(quickReplies.filter(qr => qr._id !== id));
        showToast('Quick reply deleted');
      }
    } catch (error) {
      showToast('Failed to delete quick reply', 'error');
    }
  };
  
  // Search users
  const handleSearchUsers = async (query) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      setIsSearching(true);
      const response = await searchUsers(query);
      if (response.success) {
        setSearchResults(response.users);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Start new conversation
  const handleStartConversation = async (user) => {
    try {
      const response = await startNewConversation(user._id, newMessageText || null);
      
      if (response.success) {
        // Transform and add to conversations
        const newConv = {
          _id: response.conversation._id,
          customer: {
            name: user.username,
            avatar: user.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
            username: `@${user.username}`
          },
          lastMessage: newMessageText || '',
          timestamp: new Date(),
          unread: 0,
          status: 'active',
          messages: newMessageText ? [{
            id: 1,
            sender: 'business',
            text: newMessageText,
            time: new Date()
          }] : []
        };
        
        if (response.isNew) {
          setConversations([newConv, ...conversations]);
        }
        
        setSelectedConversation(newConv);
        setShowNewChatModal(false);
        setSearchQuery('');
        setSearchResults([]);
        setNewMessageText('');
        showToast(response.isNew ? 'New conversation started! 💬' : 'Conversation opened');
      }
    } catch (error) {
      showToast('Failed to start conversation', 'error');
    }
  };

  // Use quick reply
  const handleQuickReply = (reply) => {
    setMessageInput(reply.message);
  };

  // Mark as resolved
  const handleMarkResolved = async (convId) => {
    try {
      const response = await resolveConversation(convId);
      if (response.success) {
        setConversations(conversations.map(conv =>
          conv._id === convId ? { ...conv, status: 'resolved', unread: 0 } : conv
        ));
        if (selectedConversation?._id === convId) {
          setSelectedConversation({ ...selectedConversation, status: 'resolved', unread: 0 });
        }
        showToast('Conversation marked as resolved');
      }
    } catch (error) {
      showToast('Failed to resolve conversation', 'error');
    }
  };

  // Format time
  const formatTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const tabs = [
    { id: 'inbox', label: 'Inbox', icon: 'fa-inbox', count: conversations.filter(c => c.unread > 0).length },
    { id: 'all', label: 'All Messages', icon: 'fa-comments' },
    { id: 'quick-replies', label: 'Quick Replies', icon: 'fa-bolt' },
    { id: 'settings', label: 'Settings', icon: 'fa-cog' }
  ];

  // Filter conversations by search
  const getFilteredConversations = () => {
    let filtered = activeTab === 'inbox' 
      ? conversations.filter(c => c.unread > 0 || c.status === 'active' || c.status === 'pending')
      : conversations;
    
    // Filter by search query in conversations
    if (searchQuery && searchQuery.length >= 2) {
      filtered = filtered.filter(c => 
        c.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.customer.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  // Render conversation list
  const renderConversationList = () => {
    const filteredConversations = getFilteredConversations();

    return (
      <div className="bm-conversations">
        <div className="bm-search-header">
          <div className="bm-search-bar">
            <i className="fa-solid fa-search"></i>
            <input 
              type="text" 
              placeholder="Search users or conversations..." 
              value={searchQuery}
              onChange={(e) => handleSearchUsers(e.target.value)}
            />
            {searchQuery && (
              <button className="bm-search-clear" onClick={() => { setSearchQuery(''); setSearchResults([]); }}>
                <i className="fa-solid fa-times"></i>
              </button>
            )}
          </div>
          <button className="bm-new-chat-btn" onClick={() => setShowNewChatModal(true)} title="New Message">
            <i className="fa-solid fa-edit"></i>
          </button>
        </div>
        
        {/* Search Results */}
        {searchQuery.length >= 2 && searchResults.length > 0 && (
          <div className="bm-search-results">
            <div className="bm-search-label">Users</div>
            {searchResults.map(user => (
              <div 
                key={user._id} 
                className="bm-search-result-item"
                onClick={() => handleStartConversation(user)}
              >
                <img 
                  src={user.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                  alt={user.username} 
                />
                <div className="bm-search-result-info">
                  <h5>{user.username}</h5>
                  <span>@{user.username}</span>
                </div>
                <i className="fa-solid fa-paper-plane"></i>
              </div>
            ))}
            {filteredConversations.length > 0 && <div className="bm-search-label">Conversations</div>}
          </div>
        )}
        
        {isSearching && (
          <div className="bm-searching">
            <i className="fa-solid fa-spinner fa-spin"></i> Searching...
          </div>
        )}
        
        {filteredConversations.length === 0 ? (
          <div className="bm-empty">
            <i className="fa-solid fa-inbox"></i>
            <p>No messages yet</p>
          </div>
        ) : (
          <div className="bm-conversation-list">
            {filteredConversations.map(conv => (
              <div 
                key={conv._id} 
                className={`bm-conversation-item ${selectedConversation?._id === conv._id ? 'active' : ''} ${conv.unread > 0 ? 'unread' : ''}`}
                onClick={() => {
                  console.log('Clicked conversation:', conv);
                  setSelectedConversation(conv);
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="bm-avatar">
                  <img src={conv.customer.avatar} alt={conv.customer.name} />
                  {conv.status === 'active' && <span className="bm-online-dot"></span>}
                </div>
                <div className="bm-conversation-info">
                  <div className="bm-conversation-header">
                    <h5>{conv.customer.name}</h5>
                    <span className="bm-time">{formatTime(conv.timestamp)}</span>
                  </div>
                  <p className="bm-last-message">{conv.lastMessage}</p>
                  <div className="bm-conversation-meta">
                    <span className={`bm-status ${conv.status}`}>{conv.status}</span>
                    {conv.unread > 0 && <span className="bm-unread-badge">{conv.unread}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render chat view
  const renderChatView = () => {
    if (!selectedConversation) {
      return (
        <div className="bm-no-chat">
          <i className="fa-solid fa-comments"></i>
          <h4>Select a conversation</h4>
          <p>Choose a conversation from the list to start messaging</p>
        </div>
      );
    }

    return (
      <div className="bm-chat">
        <div className="bm-chat-header">
          <button className="bm-back-mobile" onClick={() => setSelectedConversation(null)}>
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div className="bm-chat-customer">
            <img src={selectedConversation.customer.avatar} alt={selectedConversation.customer.name} />
            <div>
              <h5>{selectedConversation.customer.name}</h5>
              <span>{selectedConversation.customer.username}</span>
            </div>
          </div>
          <div className="bm-chat-actions">
            {selectedConversation.status !== 'resolved' && (
              <button onClick={() => handleMarkResolved(selectedConversation._id)} title="Mark as Resolved">
                <i className="fa-solid fa-check-circle"></i>
              </button>
            )}
            <button title="More Options">
              <i className="fa-solid fa-ellipsis-v"></i>
            </button>
          </div>
        </div>

        <div className="bm-messages">
          {selectedConversation.messages.map(msg => (
            <div key={msg.id} className={`bm-message ${msg.sender}`}>
              <div className="bm-message-content">
                <p>{msg.text}</p>
                <span className="bm-message-time">{formatTime(msg.time)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bm-quick-replies-bar">
          {quickReplies.slice(0, 3).map((reply, index) => (
            <button key={reply._id || index} onClick={() => handleQuickReply(reply)}>
              {reply.title}
            </button>
          ))}
        </div>

        <div className="bm-input-area">
          <button className="bm-attach-btn">
            <i className="fa-solid fa-paperclip"></i>
          </button>
          <input
            type="text"
            value={messageInput}
            onChange={e => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
          />
          <button 
            className="bm-send-btn" 
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
          >
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </div>
      </div>
    );
  };

  // Render Quick Replies tab
  const renderQuickReplies = () => (
    <div className="bm-quick-replies-section">
      <div className="bm-section-header">
        <h3>Quick Replies ({quickReplies.length})</h3>
        <button className="bm-add-btn" onClick={() => setShowQuickReplyForm(true)}>
          <i className="fa-solid fa-plus"></i> Add New
        </button>
      </div>
      <p className="bm-section-desc">Create saved responses for common questions</p>
      
      {quickReplies.length === 0 ? (
        <div className="bm-empty-replies">
          <i className="fa-solid fa-bolt"></i>
          <h4>No quick replies yet</h4>
          <p>Create quick replies to respond faster to common questions</p>
          <button className="bm-create-btn" onClick={() => setShowQuickReplyForm(true)}>
            <i className="fa-solid fa-plus"></i> Create Reply
          </button>
        </div>
      ) : (
        <div className="bm-replies-list">
          {quickReplies.map(reply => (
            <div key={reply._id} className="bm-reply-card">
              <div className="bm-reply-header">
                <h5>{reply.title}</h5>
                <div className="bm-reply-actions">
                  <button onClick={() => handleDeleteQuickReply(reply._id)} title="Delete">
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
              <p>{reply.message}</p>
            </div>
          ))}
        </div>
      )}
      
      </div>
  );

  // Render Settings tab
  const renderSettings = () => (
    <div className="bm-settings">
      <div className="bm-section">
        <div className="bm-settings-header">
          <h3>Messaging Settings</h3>
          {savingSettings && <span className="bm-saving"><i className="fa-solid fa-spinner fa-spin"></i> Saving...</span>}
        </div>
        <div className="bm-settings-list">
          <div className="bm-settings-item">
            <div className="bm-settings-icon"><i className="fa-solid fa-bell"></i></div>
            <div className="bm-settings-info">
              <h5>Notifications</h5>
              <p>Get notified for new messages</p>
            </div>
            <label className="bm-switch">
              <input 
                type="checkbox" 
                checked={messagingSettings.notifications}
                onChange={(e) => handleSettingChange('notifications', e.target.checked)}
              />
              <span className="bm-slider"></span>
            </label>
          </div>
          <div className="bm-settings-item">
            <div className="bm-settings-icon"><i className="fa-solid fa-clock"></i></div>
            <div className="bm-settings-info">
              <h5>Auto-Reply</h5>
              <p>Send automatic responses when away</p>
            </div>
            <label className="bm-switch">
              <input 
                type="checkbox" 
                checked={messagingSettings.autoReply}
                onChange={(e) => handleSettingChange('autoReply', e.target.checked)}
              />
              <span className="bm-slider"></span>
            </label>
          </div>
          
          {/* Auto-Reply Message Input */}
          {messagingSettings.autoReply && (
            <div className="bm-settings-item bm-auto-reply-input">
              <div className="bm-settings-icon"><i className="fa-solid fa-message"></i></div>
              <div className="bm-settings-info bm-full-width">
                <h5>Auto-Reply Message</h5>
                <textarea
                  value={messagingSettings.autoReplyMessage || ''}
                  onChange={(e) => setMessagingSettings({...messagingSettings, autoReplyMessage: e.target.value})}
                  onBlur={(e) => handleSettingChange('autoReplyMessage', e.target.value)}
                  placeholder="Thanks for your message! I'll get back to you soon."
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <div className="bm-settings-item">
            <div className="bm-settings-icon"><i className="fa-solid fa-robot"></i></div>
            <div className="bm-settings-info">
              <h5>AI Assistant</h5>
              <p>Use AI to suggest responses</p>
            </div>
            <label className="bm-switch">
              <input 
                type="checkbox" 
                checked={messagingSettings.aiAssistant}
                onChange={(e) => handleSettingChange('aiAssistant', e.target.checked)}
              />
              <span className="bm-slider"></span>
            </label>
          </div>
          <div className="bm-settings-item">
            <div className="bm-settings-icon"><i className="fa-solid fa-filter"></i></div>
            <div className="bm-settings-info">
              <h5>Message Filtering</h5>
              <p>Filter spam and promotional messages</p>
            </div>
            <label className="bm-switch">
              <input 
                type="checkbox" 
                checked={messagingSettings.messageFiltering}
                onChange={(e) => handleSettingChange('messageFiltering', e.target.checked)}
              />
              <span className="bm-slider"></span>
            </label>
          </div>
        </div>
        
        <div className="bm-settings-footer">
          <p><i className="fa-solid fa-check-circle"></i> All settings are automatically saved to your account</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="business-messaging-overlay">
        <div className="bm-loading">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="business-messaging-overlay">
      <div className="business-messaging-container">
        {/* Header */}
        <header className="bm-header">
          <button className="bm-back-btn" onClick={onClose || (() => navigate('/profile'))}>
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h1>Business Messages</h1>
          <div className="bm-header-stats">
            <span><strong>{conversations.filter(c => c.unread > 0).length}</strong> unread</span>
          </div>
        </header>

        {/* Tabs */}
        <nav className="bm-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`bm-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={`fa-solid ${tab.icon}`}></i>
              <span>{tab.label}</span>
              {tab.count > 0 && <span className="bm-tab-badge">{tab.count}</span>}
            </button>
          ))}
        </nav>

        {/* Content */}
        <main className="bm-content">
          {(activeTab === 'inbox' || activeTab === 'all') && (
            <div className="bm-messaging-layout">
              {renderConversationList()}
              {renderChatView()}
            </div>
          )}
          {activeTab === 'quick-replies' && renderQuickReplies()}
          {activeTab === 'settings' && renderSettings()}
        </main>

        {/* New Chat Modal */}
        {showNewChatModal && (
          <div className="bm-modal-overlay" onClick={() => setShowNewChatModal(false)}>
            <div className="bm-modal bm-new-chat-modal" onClick={e => e.stopPropagation()}>
              <div className="bm-modal-header">
                <h3>New Message</h3>
                <button className="bm-modal-close" onClick={() => setShowNewChatModal(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="bm-modal-body">
                <div className="bm-form-group">
                  <label>Search User</label>
                  <div className="bm-search-input-wrapper">
                    <i className="fa-solid fa-search"></i>
                    <input
                      type="text"
                      placeholder="Search by username..."
                      value={searchQuery}
                      onChange={(e) => handleSearchUsers(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                
                {isSearching && (
                  <div className="bm-modal-searching">
                    <i className="fa-solid fa-spinner fa-spin"></i> Searching...
                  </div>
                )}
                
                {searchResults.length > 0 && (
                  <div className="bm-modal-results">
                    {searchResults.map(user => (
                      <div 
                        key={user._id} 
                        className="bm-modal-user-item"
                        onClick={() => handleStartConversation(user)}
                      >
                        <img 
                          src={user.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                          alt={user.username} 
                        />
                        <div className="bm-modal-user-info">
                          <h5>{user.username}</h5>
                          <span>@{user.username}</span>
                        </div>
                        <button className="bm-send-to-btn">
                          <i className="fa-solid fa-paper-plane"></i> Message
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                  <div className="bm-no-results">
                    <i className="fa-solid fa-user-slash"></i>
                    <p>No users found for "{searchQuery}"</p>
                  </div>
                )}
                
                {searchQuery.length < 2 && (
                  <div className="bm-search-hint">
                    <i className="fa-solid fa-lightbulb"></i>
                    <p>Type at least 2 characters to search for users</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Reply Form Modal */}
        {showQuickReplyForm && (
          <div className="bm-modal-overlay" onClick={() => setShowQuickReplyForm(false)}>
            <div className="bm-modal" onClick={e => e.stopPropagation()}>
              <div className="bm-modal-header">
                <h3>Add Quick Reply</h3>
                <button className="bm-modal-close" onClick={() => setShowQuickReplyForm(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="bm-modal-body">
                <div className="bm-form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={quickReplyForm.title}
                    onChange={e => setQuickReplyForm({...quickReplyForm, title: e.target.value})}
                    placeholder="e.g., Thank You, Price Info, Available"
                  />
                </div>
                <div className="bm-form-group">
                  <label>Message *</label>
                  <textarea
                    value={quickReplyForm.message}
                    onChange={e => setQuickReplyForm({...quickReplyForm, message: e.target.value})}
                    placeholder="Type your quick reply message here..."
                    rows={4}
                  />
                </div>
              </div>
              <div className="bm-modal-footer">
                <button className="bm-secondary-btn" onClick={() => setShowQuickReplyForm(false)}>
                  Cancel
                </button>
                <button 
                  className="bm-primary-btn" 
                  onClick={handleCreateQuickReply}
                  disabled={!quickReplyForm.title || !quickReplyForm.message}
                >
                  <i className="fa-solid fa-plus"></i> Create Reply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`bm-toast ${toast.type}`}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessMessaging;

