import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSupportResources, createSupportTicket, getUserTickets, getTicketDetails, sendTicketMessage } from '../../api/more';
import { useAuth } from '../../context/AuthContext';
import './MorePages.css';

const SupportCenter = ({ onClose = () => {} }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [support, setSupport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showTicketsModal, setShowTicketsModal] = useState(false);
  const [reportIssueType, setReportIssueType] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  
  // Chat interface states
  const [view, setView] = useState('list'); // 'list' or 'chat'
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    window.dispatchEvent(new Event('sidebar:close'));
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.classList.add('page-open');
    }
    return () => {
      if (sidebar) {
        sidebar.classList.remove('page-open');
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchSupportResources();
        if (!active) return;
        setSupport(data);
        setErrorMessage('');
      } catch (error) {
        console.error('Failed to load support resources', error);
        if (!active) return;
        setErrorMessage('We could not load support resources.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  // Load user tickets if authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const loadTickets = async () => {
      try {
        setLoadingTickets(true);
        const response = await getUserTickets();
        if (response.success) {
          setTickets(response.tickets || []);
        }
      } catch (error) {
        console.error('Failed to load tickets:', error);
      } finally {
        setLoadingTickets(false);
      }
    };

    loadTickets();
    
    // Refresh tickets every 30 seconds
    const interval = setInterval(loadTickets, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Load ticket details when selected
  useEffect(() => {
    if (!selectedTicket || view !== 'chat') return;

    const loadTicketDetails = async () => {
      try {
        const response = await getTicketDetails(selectedTicket.id);
        if (response.success) {
          setChatMessages(response.ticket.messages || []);
          // Auto scroll to bottom
          setTimeout(() => {
            const container = document.getElementById('chat-messages-container');
            if (container) {
              container.scrollTop = container.scrollHeight;
            }
          }, 100);
        }
      } catch (error) {
        console.error('Failed to load ticket details:', error);
      }
    };

    loadTicketDetails();
    
    // Refresh messages every 5 seconds when in chat view
    const interval = setInterval(loadTicketDetails, 5000);
    return () => clearInterval(interval);
  }, [selectedTicket, view]);

  // Toast notification auto-dismiss
  useEffect(() => {
    if (toast) {
      const timeout = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [toast]);

  const handleOpenTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setView('chat');
    try {
      const response = await getTicketDetails(ticket.id);
      if (response.success) {
        setChatMessages(response.ticket.messages || []);
      }
    } catch (error) {
      console.error('Failed to load ticket:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || sendingMessage) return;

    const messageToSend = newMessage.trim();
    setSendingMessage(true);
    
    // Optimistically add message to UI
    const tempMessage = {
      sender: 'user',
      senderId: null,
      message: messageToSend,
      timestamp: new Date(),
      read: false
    };
    setChatMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    
    // Auto scroll to bottom
    setTimeout(() => {
      const container = document.getElementById('chat-messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);

    try {
      const response = await sendTicketMessage(selectedTicket.id, messageToSend);
      if (response.success) {
        // Refresh messages to get server response
        const ticketResponse = await getTicketDetails(selectedTicket.id);
        if (ticketResponse.success) {
          setChatMessages(ticketResponse.ticket.messages || []);
          // Auto scroll to bottom after refresh
          setTimeout(() => {
            const container = document.getElementById('chat-messages-container');
            if (container) {
              container.scrollTop = container.scrollHeight;
            }
          }, 100);
        }
        // Refresh tickets list
        const ticketsResponse = await getUserTickets();
        if (ticketsResponse.success) {
          setTickets(ticketsResponse.tickets || []);
        }
      } else {
        // Remove optimistic message on error
        setChatMessages(prev => prev.filter((msg, idx) => idx !== prev.length - 1 || msg.sender !== 'user'));
        setNewMessage(messageToSend);
        setToast({
          type: 'error',
          message: 'Failed to send message. Please try again.'
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic message on error
      setChatMessages(prev => prev.filter((msg, idx) => idx !== prev.length - 1 || msg.sender !== 'user'));
      setNewMessage(messageToSend);
      setToast({
        type: 'error',
        message: 'Failed to send message. Please try again.'
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCreateTicketSuccess = async () => {
    // Refresh tickets list
    try {
      const response = await getUserTickets();
      if (response.success) {
        setTickets(response.tickets || []);
        // Open the newly created ticket
        if (response.tickets && response.tickets.length > 0) {
          const newTicket = response.tickets[0];
          handleOpenTicket(newTicket);
        }
      }
    } catch (error) {
      console.error('Failed to refresh tickets:', error);
    }
  };

  const handleClose = () => {
    onClose();
    // Navigate back to More page
    navigate('/more');
  };

  return (
    <div className="more-page">
      {/* Custom Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 10000,
            background: toast.type === 'success' 
              ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
              : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '300px',
            maxWidth: '500px',
            animation: 'slideInRight 0.3s ease-out'
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            flexShrink: 0
          }}>
            {toast.type === 'success' ? (
              <i className="fa-solid fa-check-circle"></i>
            ) : (
              <i className="fa-solid fa-exclamation-circle"></i>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px' }}>
              {toast.type === 'success' ? 'Successfully Sent!' : 'Error'}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.95, lineHeight: '1.4' }}>
              {toast.message}
            </div>
            {toast.ticketId && (
              <div style={{ 
                marginTop: '8px', 
                fontSize: '12px', 
                opacity: 0.9,
                padding: '6px 10px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '6px',
                display: 'inline-block'
              }}>
                Ticket: {toast.ticketId}
              </div>
            )}
          </div>
          <button
            onClick={() => setToast(null)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            ×
          </button>
        </div>
      )}

      <div className="more-page__container">
        <header className="more-page__header">
          <h1>
            <i className="fa-solid fa-headset"></i>
            Creator Support
          </h1>
          <button className="more-page__close" type="button" onClick={handleClose} aria-label="Close Support Center">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </header>

        <div className="more-page__toolbar">
          <div className="more-page__toolbar-info">
            <span className="more-page__badge">
              <i className="fa-solid fa-clock-rotate-left"></i>
              Average reply time under 12 hours
            </span>
            {loading ? (
              <span className="more-page__toolbar-sync more-page__toolbar-sync--live">
                <i className="fa-solid fa-spinner fa-spin"></i>
                Connecting you with support…
              </span>
            ) : (
              <span className="more-page__toolbar-sync">Latest updates from the support team</span>
            )}
          </div>
          <div className="more-page__toolbar-actions" style={{ display: 'flex', gap: '0.5rem' }}>
            {isAuthenticated && (
              <button
                className="more-page__button more-page__button--primary"
                type="button"
                onClick={() => {
                  setShowTicketsModal(true);
                }}
              >
                <i className="fa-solid fa-list"></i>
                My Tickets ({tickets.length})
              </button>
            )}
            <button
              className="more-page__button more-page__button--primary"
              type="button"
              onClick={() => setShowReportModal(true)}
            >
              <i className="fa-solid fa-plus"></i>
              {isAuthenticated ? 'New Ticket' : 'Report Issue'}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="more-page__banner more-page__banner--warning" role="status">
            <div className="more-page__banner-content">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{errorMessage}</span>
            </div>
            <div className="more-page__banner-actions">
              <button
                className="more-page__button more-page__button--ghost"
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setLoading(true);
                  fetchSupportResources()
                    .then((data) => {
                      setSupport(data);
                      setErrorMessage('');
                    })
                    .catch((error) => {
                      console.error('Retry support fetch failed', error);
                      setErrorMessage('Support service still unavailable. Try again later.');
                    })
                    .finally(() => setLoading(false));
                }}
              >
                <i className="fa-solid fa-rotate"></i>
                Retry
              </button>
            </div>
          </div>
        )}

        <main className="more-page__content">
          {loading ? (
            <div className="more-page__empty" role="status">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <p>Loading help resources…</p>
            </div>
          ) : view === 'chat' && selectedTicket ? (
            // Chatbot Style Chat View
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              height: 'calc(100vh - 200px)',
              maxHeight: '800px',
              background: '#FFFFFF',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              {/* Chat Header - Chatbot Style */}
              <div style={{ 
                padding: '1.25rem 1.5rem', 
                borderBottom: '2px solid #E0F2FE', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setView('list');
                      setSelectedTicket(null);
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      cursor: 'pointer',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                    }}
                  >
                    <i className="fa-solid fa-arrow-left"></i>
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px'
                    }}>
                      <i className="fa-solid fa-headset"></i>
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>
                        Support Chat
                      </h3>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
                        {selectedTicket.subject} • {selectedTicket.ticketId}
                      </p>
                    </div>
                  </div>
                </div>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  background: selectedTicket.status === 'open' ? 'rgba(255,255,255,0.3)' : 
                             selectedTicket.status === 'resolved' ? 'rgba(40, 167, 69, 0.3)' : 'rgba(108, 117, 125, 0.3)',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  {selectedTicket.status}
                </div>
              </div>

              {/* Messages Container - Chatbot Style */}
              <div 
                id="chat-messages-container"
                style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  background: 'linear-gradient(to bottom, #F8FAFC 0%, #FFFFFF 100%)'
                }}
              >
                {chatMessages.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '3rem 2rem', 
                    color: '#666',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      color: 'white',
                      marginBottom: '1rem'
                    }}>
                      <i className="fa-solid fa-comments"></i>
                    </div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#212529' }}>
                      Start the conversation!
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#6c757d' }}>
                      Type your message below and our support team will respond soon.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg, index) => {
                    const isUser = msg.sender === 'user';
                    return (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          justifyContent: isUser ? 'flex-end' : 'flex-start',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          animation: 'fadeIn 0.3s ease-in'
                        }}
                      >
                        {!isUser && (
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '16px',
                            flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                          }}>
                            <i className="fa-solid fa-headset"></i>
                          </div>
                        )}
                        <div style={{
                          maxWidth: '75%',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem'
                        }}>
                          <div style={{
                            padding: '0.875rem 1.125rem',
                            borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            background: isUser 
                              ? 'linear-gradient(135deg, #FF0050 0%, #FF1744 100%)' 
                              : '#FFFFFF',
                            color: isUser ? '#FFF' : '#212529',
                            boxShadow: isUser 
                              ? '0 2px 8px rgba(255, 0, 80, 0.2)' 
                              : '0 2px 8px rgba(0,0,0,0.08)',
                            border: !isUser ? '1px solid #E9ECEF' : 'none',
                            wordWrap: 'break-word',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {!isUser && (
                              <div style={{ 
                                fontSize: '0.75rem', 
                                fontWeight: '700',
                                marginBottom: '0.5rem',
                                color: '#667eea',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                👨‍💼 Admin Support
                              </div>
                            )}
                            <div style={{ 
                              fontSize: '0.95rem', 
                              lineHeight: '1.5',
                              wordBreak: 'break-word'
                            }}>
                              {msg.message}
                            </div>
                          </div>
                          <div style={{ 
                            fontSize: '0.7rem', 
                            color: '#6c757d',
                            paddingLeft: isUser ? '0' : '0.5rem',
                            paddingRight: isUser ? '0.5rem' : '0',
                            textAlign: isUser ? 'right' : 'left'
                          }}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                        {isUser && (
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #FF0050 0%, #FF1744 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '16px',
                            flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(255, 0, 80, 0.3)'
                          }}>
                            <i className="fa-solid fa-user"></i>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input - Chatbot Style */}
              <div style={{ 
                padding: '1.25rem 1.5rem', 
                borderTop: '2px solid #E0F2FE',
                background: '#FFFFFF',
                boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  gap: '0.75rem',
                  alignItems: 'flex-end',
                  background: '#F8FAFC',
                  padding: '0.75rem',
                  borderRadius: '24px',
                  border: '2px solid #E0F2FE',
                  transition: 'all 0.2s'
                }}>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type your message here..."
                    style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      border: 'none',
                      borderRadius: '20px',
                      fontSize: '0.95rem',
                      fontFamily: 'inherit',
                      resize: 'none',
                      minHeight: '50px',
                      maxHeight: '120px',
                      background: 'transparent',
                      outline: 'none',
                      color: '#212529'
                    }}
                    rows={1}
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: newMessage.trim() && !sendingMessage 
                        ? 'linear-gradient(135deg, #FF0050 0%, #FF1744 100%)' 
                        : '#CBD5E1',
                      color: '#FFF',
                      border: 'none',
                      cursor: newMessage.trim() && !sendingMessage ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      transition: 'all 0.2s',
                      boxShadow: newMessage.trim() && !sendingMessage 
                        ? '0 4px 12px rgba(255, 0, 80, 0.3)' 
                        : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (newMessage.trim() && !sendingMessage) {
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {sendingMessage ? (
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fa-solid fa-paper-plane"></i>
                    )}
                  </button>
                </div>
                <div style={{
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#6c757d',
                  textAlign: 'center'
                }}>
                  Press Enter to send, Shift+Enter for new line
                </div>
              </div>
            </div>
          ) : view === 'list' && isAuthenticated ? (
            // Tickets List View
            <div>
              {loadingTickets ? (
                <div className="more-page__empty" role="status">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <p>Loading your tickets…</p>
                </div>
              ) : tickets.length === 0 ? (
                <div className="more-page__empty">
                  <i className="fa-solid fa-inbox" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}></i>
                  <p>No tickets yet. Create your first support ticket!</p>
                  <button
                    className="more-page__button more-page__button--primary"
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    style={{ marginTop: '1rem' }}
                  >
                    <i className="fa-solid fa-plus"></i>
                    Create New Ticket
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => handleOpenTicket(ticket)}
                      style={{
                        padding: '1rem',
                        border: '1px solid #E0F2FE',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: '#FFF',
                        transition: 'all 0.2s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F8FAFC';
                        e.currentTarget.style.borderColor = '#FF0050';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#FFF';
                        e.currentTarget.style.borderColor = '#E0F2FE';
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                            {ticket.subject}
                          </h4>
                          {ticket.unreadCount > 0 && (
                            <span style={{
                              background: '#FF0050',
                              color: '#FFF',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem',
                              fontWeight: '600'
                            }}>
                              {ticket.unreadCount}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>
                          Ticket ID: {ticket.ticketId} • {new Date(ticket.lastActivityAt).toLocaleDateString()}
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            background: ticket.status === 'open' ? '#D1FAE5' : 
                                       ticket.status === 'resolved' ? '#E0E7FF' : '#FEE2E2',
                            color: ticket.status === 'open' ? '#065F46' : 
                                   ticket.status === 'resolved' ? '#3730A3' : '#991B1B',
                            fontWeight: '600'
                          }}>
                            {ticket.status}
                          </span>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            background: '#F1F5F9',
                            color: '#475569'
                          }}>
                            {ticket.category}
                          </span>
                        </div>
                      </div>
                      <i className="fa-solid fa-chevron-right" style={{ color: '#CBD5E1', fontSize: '1.2rem' }}></i>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : !support ? (
            <div className="more-page__empty">
              <i className="fa-solid fa-headset"></i>
              <p>No support content is available yet.</p>
            </div>
          ) : (
            <>
              <div className="more-page__grid more-page__grid--two">
                <div className="more-page__card">
                  <h2>Contact options</h2>
                  <div className="more-page__list">
                    {support.contactChannels?.map((channel) => (
                      <div 
                        key={channel.id} 
                        className="more-page__list-item"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          if (channel.id === 'report-issue') {
                            alert('Report Issue: Please describe your problem (account issues, monetization, video problems) and our team will help you.');
                          } else {
                            alert(`${channel.title}: ${channel.description || channel.availability}`);
                          }
                        }}
                      >
                        <h3>{channel.title}</h3>
                        <p>{channel.description || channel.availability}</p>
                        {channel.averageResponseMinutes > 0 && (
                          <p className="more-page__stat-label">
                            Avg response time: {Math.round(channel.averageResponseMinutes / 60)} hrs
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="more-page__card">
                  <h2>Latest updates</h2>
                  <div className="more-page__timeline">
                    {support.recentUpdates?.map((update) => (
                      <div key={update.id} className="more-page__timeline-item">
                        <h3>{update.title}</h3>
                        <p>{update.detail}</p>
                        <p className="more-page__stat-label">
                          {new Date(update.publishedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="more-page__card">
                <h2>Popular help topics</h2>
                <div className="more-page__faq">
                  {support.helpTopics?.map((topic) => (
                    <div 
                      key={topic.id} 
                      className="more-page__faq-item"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        alert(`${topic.title}\n\nAvailable articles:\n${topic.articles.map((a, i) => `${i + 1}. ${a}`).join('\n')}`);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        {topic.icon && <i className={`fa-solid ${topic.icon}`} style={{ color: '#FF0050' }}></i>}
                        <h4 style={{ margin: 0 }}>{topic.title}</h4>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {topic.articles.map((article, index) => (
                          <span 
                            key={index}
                            className="more-page__tag"
                            style={{
                              padding: '0.25rem 0.75rem',
                              background: 'rgba(255, 0, 80, 0.1)',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              color: '#FF0050',
                              wordBreak: 'break-word',
                              maxWidth: '100%'
                            }}
                          >
                            {article}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Guides Section */}
              {support.quickGuides && support.quickGuides.length > 0 && (
                <div className="more-page__card">
                  <h2>Step-by-step guides</h2>
                  <div className="more-page__list">
                    {support.quickGuides.map((guide) => (
                      <div key={guide.id} className="more-page__list-item">
                        <h3>{guide.title}</h3>
                        <ol style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                          {guide.steps.map((step, index) => (
                            <li key={index} style={{ marginBottom: '0.5rem', color: '#666' }}>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* My Tickets Modal - Small Form */}
      {showTicketsModal && (
        <div
          className="more-page__modal-overlay"
          onClick={() => {
            setShowTicketsModal(false);
            setSelectedTicket(null);
          }}
        >
          <div 
            className="more-page__modal" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px', maxHeight: '80vh' }}
          >
            <div className="more-page__modal-header">
              <h2>
                <i className="fa-solid fa-ticket"></i>
                My Tickets ({tickets.length})
              </h2>
              <button
                className="more-page__modal-close"
                onClick={() => {
                  setShowTicketsModal(false);
                  setSelectedTicket(null);
                }}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <div className="more-page__modal-content" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {loadingTickets ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#FF0050' }}></i>
                  <p>Loading your tickets…</p>
                </div>
              ) : tickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <i className="fa-solid fa-inbox" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3, color: '#FF0050' }}></i>
                  <p>No tickets yet. Create your first support ticket!</p>
                  <button
                    className="more-page__button more-page__button--primary"
                    type="button"
                    onClick={() => {
                      setShowTicketsModal(false);
                      setShowReportModal(true);
                    }}
                    style={{ marginTop: '1rem' }}
                  >
                    <i className="fa-solid fa-plus"></i>
                    Create New Ticket
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => {
                        handleOpenTicket(ticket);
                        setShowTicketsModal(false);
                        setView('chat');
                      }}
                      style={{
                        padding: '1rem',
                        border: '1px solid #E0F2FE',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: '#FFF',
                        transition: 'all 0.2s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F8FAFC';
                        e.currentTarget.style.borderColor = '#FF0050';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#FFF';
                        e.currentTarget.style.borderColor = '#E0F2FE';
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '0.25rem' }}>
                          {ticket.subject}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#666', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span>{ticket.ticketId}</span>
                          <span>•</span>
                          <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: ticket.status === 'resolved' || ticket.status === 'closed' 
                              ? '#D1FAE5' 
                              : ticket.status === 'in-progress' 
                              ? '#DBEAFE' 
                              : '#FEF3C7',
                            color: ticket.status === 'resolved' || ticket.status === 'closed' 
                              ? '#065F46' 
                              : ticket.status === 'in-progress' 
                              ? '#1E40AF' 
                              : '#92400E'
                          }}
                        >
                          {ticket.status === 'resolved' ? 'Solved' : ticket.status === 'closed' ? 'Closed' : ticket.status === 'in-progress' ? 'In Progress' : 'Open'}
                        </span>
                        <i className="fa-solid fa-chevron-right" style={{ color: '#999' }}></i>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Issue Modal */}
      {showReportModal && (
        <div 
          className="more-page__modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowReportModal(false);
            }
          }}
        >
          <div className="more-page__modal" onClick={(e) => e.stopPropagation()}>
            <div className="more-page__modal-header">
              <h2>Report an Issue</h2>
              <button
                className="more-page__modal-close"
                type="button"
                onClick={() => {
                  setShowReportModal(false);
                  setReportIssueType('');
                  setReportDescription('');
                }}
                aria-label="Close"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="more-page__modal-content">
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#0F172A' }}>
                  What issue are you facing?
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { id: 'account', label: 'Account Issues', icon: 'fa-user-shield' },
                    { id: 'monetization', label: 'Monetization Problems', icon: 'fa-dollar-sign' },
                    { id: 'video', label: 'Video Problems', icon: 'fa-video' }
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      className={`more-page__button ${reportIssueType === type.id ? 'more-page__button--primary' : 'more-page__button--ghost'}`}
                      onClick={() => setReportIssueType(type.id)}
                      style={{ 
                        textAlign: 'left', 
                        justifyContent: 'flex-start',
                        width: '100%'
                      }}
                    >
                      <i className={`fa-solid ${type.icon}`} style={{ marginRight: '0.5rem' }}></i>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#0F172A' }}>
                  Please describe your issue:
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Describe your issue in detail. Include any error messages, steps to reproduce, or relevant information..."
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '0.75rem',
                    border: '1px solid #E0F2FE',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  className="more-page__button more-page__button--ghost"
                  type="button"
                  onClick={() => {
                    setShowReportModal(false);
                    setReportIssueType('');
                    setReportDescription('');
                  }}
                  disabled={reportSubmitting}
                >
                  Cancel
                </button>
                <button
                  className="more-page__button more-page__button--primary"
                  type="button"
                  onClick={async () => {
                    if (!reportIssueType || !reportDescription.trim()) {
                      setToast({
                        type: 'error',
                        message: 'Please select an issue type and provide a description.'
                      });
                      return;
                    }

                    setReportSubmitting(true);
                    try {
                      // Map issue types to categories
                      const categoryMap = {
                        'account': 'account',
                        'monetization': 'monetization',
                        'video': 'video'
                      };

                      const subjectMap = {
                        'account': 'Account Issue',
                        'monetization': 'Monetization Problem',
                        'video': 'Video Problem'
                      };

                      const ticketData = {
                        category: categoryMap[reportIssueType] || 'other',
                        subject: subjectMap[reportIssueType] || 'Support Request',
                        description: reportDescription.trim(),
                        priority: 'medium'
                      };

                      const response = await createSupportTicket(ticketData);
                      
                      if (response.success) {
                        // Show success toast
                        setToast({
                          type: 'success',
                          message: `Your issue has been logged successfully. Our support team will contact you within 12 hours.`,
                          ticketId: response.ticket.ticketId
                        });
                        
                        setShowReportModal(false);
                        setReportIssueType('');
                        setReportDescription('');
                        
                        // Refresh tickets and open the new ticket
                        if (isAuthenticated) {
                          await handleCreateTicketSuccess();
                        }
                      } else {
                        throw new Error(response.message || 'Failed to create ticket');
                      }
                    } catch (error) {
                      console.error('Failed to submit report:', error);
                      setToast({
                        type: 'error',
                        message: error.response?.data?.message || error.message || 'Failed to submit report. Please try again.'
                      });
                    } finally {
                      setReportSubmitting(false);
                    }
                  }}
                  disabled={reportSubmitting || !reportIssueType || !reportDescription.trim()}
                >
                  {reportSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane"></i>
                      Submit Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportCenter;













