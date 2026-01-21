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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState('smileys');
  const [emojiSearchQuery, setEmojiSearchQuery] = useState('');
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = React.useRef(null);
  const pollIntervalRef = React.useRef(null);
  const lastMessageIdRef = React.useRef(null);
  const fileInputRef = React.useRef(null);

  // Emoji categories
  const emojiCategories = {
    smileys: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕'],
    animals: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐽','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🕸️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐓','🦃','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦦','🦥','🐁','🐀','🐿️','🦔'],
    food: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🌽','🥕','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🥪','🥙','🧆','🌮','🌯','🥗','🥘','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🥛','🍼','☕','🍵','🧃','🥤','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊','🥄','🍴','🍽️','🥣','🥡','🥢','🧂'],
    activities: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','🤺','⛹️','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🪕','🎻','🎲','♟️','🎯','🎳','🎮','🎰','🧩'],
    travel: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🚚','🚛','🚜','🦯','🦽','🦼','🛴','🚲','🛵','🏍️','🛺','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️','🛫','🛬','🛩️','💺','🛰️','🚀','🛸','🚁','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢','⚓','⛽','🚧','🚦','🚥','🚏','🗺️','🗿','🗽','🗼','🏰','🏯','🏟️','🎡','🎢','🎠','⛲','⛱️','🏖️','🏝️','🏜️','🌋','⛰️','🏔️','🗻','🏕️','⛺','🏠','🏡','🏘️','🏚️','🏗️','🏭','🏢','🏬','🏣','🏤','🏥','🏦','🏨','🏪','🏫','🏩','💒','🏛️','⛪','🕌','🕍','🛕','🕋','⛩️','🛤️','🛣️'],
    objects: ['⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','🕹️','🗜️','💾','💿','📀','📼','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🔌','💡','🔦','🕯️','🪔','🧯','🛢️','💸','💵','💴','💶','💷','💰','💳','💎','⚖️','🧰','🔧','🔨','⚒️','🛠️','⛏️','🔩','⚙️','🧱','⛓️','🧲','🔫','💣','🧨','🪓','🔪','🗡️','⚔️','🛡️','🚬','⚰️','⚱️','🏺','🔮','📿','🧿','💈','⚗️','🔭','🔬','🕳️','🩹','🩺','💊','💉','🩸','🧬','🦠','🧫','🧪','🌡️','🧹','🧺','🧻','🚽','🚰','🚿','🛁','🛀','🧼','🪒','🧽','🧴','🛎️','🔑','🗝️','🚪','🪑','🛋️','🛏️','🧸','🖼️','🛍️','🛒','🎁','🎈','🎏','🎀','🎊','🎉'],
    symbols: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🚭','❗','❕','❓','❔','‼️','⁉️','🔅','🔆','〽️','⚠️','🚸','🔱','⚜️','🔰','♻️','✅','🈯','💹','❇️','✳️','❎','🌐','💠','Ⓜ️','🌀','💤','🏧','🚾','♿','🅿️','🈳','🈂️','🛂','🛃','🛄','🛅','🚹','🚺','🚼','🚻','🚮','🎦','📶','🈁','🔣'],
    flags: ['🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️']
  };

  // Filter emojis based on search
  const getFilteredEmojis = () => {
    if (!emojiSearchQuery) {
      return emojiCategories[emojiCategory] || [];
    }
    
    // Search across all categories
    const allEmojis = Object.values(emojiCategories).flat();
    return allEmojis;
  };
  
  const { socket, isConnected } = useSocket();

  // ==================== SOCKET LISTENERS FOR REAL-TIME MESSAGING ====================
  useEffect(() => {
    if (!socket || !isConnected || !user) {
      console.log('[MessageCenter] Socket not ready:', { socket: !!socket, isConnected, user: !!user });
      return;
    }

    console.log('[MessageCenter] Setting up socket listeners, socket ID:', socket.id);

    // Listen for new messages
    const handleNewMessage = (data) => {
      const { conversationId, message } = data;
      console.log('[MessageCenter] ✉️ NEW MESSAGE RECEIVED:', {
        conversationId,
        messageId: message?._id || message?.id,
        messageText: message?.content?.text || message?.text,
        sender: message?.sender?.username || message?.sender,
        activeChat: activeChat?.id,
        matches: activeChat?.id === conversationId
      });
      
      // If this is the active conversation, add message immediately
      if (activeChat && activeChat.id === conversationId) {
        const convertedMessage = convertMessage(message, user);
        setMessages((prev) => {
          // Avoid duplicates - check both id and _id
          const exists = prev.some(m => 
            m.id === convertedMessage.id || 
            m.id === message._id || 
            m.id === message.id ||
            (m.optimistic && m.text === convertedMessage.text && 
             Math.abs(m.id - Date.now()) < 5000) // Optimistic message within 5 seconds
          );
          if (exists) {
            // Update existing message (replace optimistic with real)
            return prev.map(m => 
              (m.optimistic && m.text === convertedMessage.text && 
               Math.abs(m.id - Date.now()) < 5000) 
                ? convertedMessage 
                : m
            );
          }
          return [...prev, convertedMessage];
        });
        
        // Mark as read immediately if conversation is open and not from current user
        if (message._id && message.sender?._id !== user._id && message.sender?.id !== user.id) {
          markMessageAsRead(message._id).catch(err => 
            console.error('Failed to mark message as read:', err)
          );
        }
      }
      
      // Update conversation list with new message
      setConversations((prev) => {
        const convertedMessage = convertMessage(message, user);
        const isFromCurrentUser = message.sender?._id === user._id || message.sender?.id === user.id;
        
        return prev.map((conv) => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              lastMessage: convertedMessage,
              unreadCount: (activeChat?.id === conversationId || isFromCurrentUser) ? 0 : (conv.unreadCount || 0) + 1
            };
          }
          return conv;
        });
      });
    };

    // Listen for read receipts (double tick)
    const handleMessageRead = (data) => {
      const { messageId, conversationId, readAt } = data;
      console.log('[MessageCenter] Message read receipt:', data);
      
      // Update message read status in current conversation
      if (activeChat && activeChat.id === conversationId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, isRead: true, readAt } : msg
          )
        );
      }
    };

    // Listen for typing indicators
    const handleTyping = (data) => {
      const { conversationId, userId, username, isTyping } = data;
      
      // Only show typing if it's not from current user and is active chat
      if (activeChat && activeChat.id === conversationId && userId !== user._id) {
        setIsOtherUserTyping(isTyping);
        
        // Auto-hide typing indicator after 3 seconds
        if (isTyping) {
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          typingTimeoutRef.current = setTimeout(() => {
            setIsOtherUserTyping(false);
          }, 3000);
        }
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:received', handleNewMessage);
    socket.on('message:sent', handleNewMessage); // Listen for sent confirmation
    socket.on('message:read', handleMessageRead);
    socket.on('message:typing', handleTyping);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:received', handleNewMessage);
      socket.off('message:sent', handleNewMessage);
      socket.off('message:read', handleMessageRead);
      socket.off('message:typing', handleTyping);
    };
  }, [socket, isConnected, user, activeChat]);

  // Join conversation room when active chat changes
  useEffect(() => {
    if (!socket || !isConnected || !activeChat) {
      console.log('[MessageCenter] Cannot join room:', { socket: !!socket, isConnected, activeChat: !!activeChat });
      return;
    }

    console.log('[MessageCenter] 🚪 JOINING conversation room:', activeChat.id);
    socket.emit('join:conversation', activeChat.id);
    
    // Verify socket is listening
    console.log('[MessageCenter] Socket listeners active:', socket.listeners('message:new').length);
    
    // Listen for join confirmation
    const handleJoinConfirmation = (data) => {
      console.log('[MessageCenter] ✅ JOINED room:', data);
    };
    
    socket.on('conversation:joined', handleJoinConfirmation);

    return () => {
      console.log('[MessageCenter] 🚪 LEAVING conversation:', activeChat.id);
      socket.emit('leave:conversation', activeChat.id);
      socket.off('conversation:joined', handleJoinConfirmation);
    };
  }, [socket, isConnected, activeChat]);

  // Fallback polling mechanism - check for new messages every 3 seconds
  useEffect(() => {
    if (!activeChat || !user) return;

    console.log('[MessageCenter] 🔄 Starting fallback polling for:', activeChat.id);
    
    const pollMessages = async () => {
      try {
        const response = await getMessages(activeChat.id, { limit: 10, skip: 0 });
        const latestMessages = response?.messages || [];
        
        if (latestMessages.length > 0) {
          const latestMessage = latestMessages[latestMessages.length - 1];
          const latestId = latestMessage._id || latestMessage.id;
          
          // Check if this is a new message
          if (lastMessageIdRef.current && lastMessageIdRef.current !== latestId) {
            console.log('[MessageCenter] 📨 New message detected via polling:', latestMessage);
            
            const convertedMessage = convertMessage(latestMessage, user);
            setMessages((prev) => {
              const exists = prev.some(m => m.id === convertedMessage.id);
              if (!exists) {
                // Play notification sound (optional)
                try {
                  new Audio('/notification.mp3').play().catch(() => {});
                } catch (e) {}
                
                // Mark as read if from other user
                if (latestMessage.sender?._id !== user._id && latestMessage.sender?.id !== user.id) {
                  markMessageAsRead(latestId).catch(err => 
                    console.error('Failed to mark as read:', err)
                  );
                }
                return [...prev, convertedMessage];
              }
              return prev;
            });
            
            // Update conversation list
            setConversations((prev) =>
              prev.map((conv) =>
                conv.id === activeChat.id
                  ? { ...conv, lastMessage: convertedMessage, unreadCount: 0 }
                  : conv
              )
            );
          }
          
          lastMessageIdRef.current = latestId;
        }
      } catch (error) {
        console.error('[MessageCenter] Polling error:', error);
      }
    };

    // Initial poll
    pollMessages();
    
    // Poll every 3 seconds
    pollIntervalRef.current = setInterval(pollMessages, 3000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        console.log('[MessageCenter] 🛑 Stopped polling');
      }
    };
  }, [activeChat, user]);

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

    // Stop typing indicator
    if (socket && isConnected && activeChat) {
      socket.emit('message:typing', {
        conversationId: activeChat.id,
        isTyping: false
      });
    }

    const optimisticMessage = {
      id: Date.now(),
      sender: 'me',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isRead: false, // Changed to false - will be updated by socket
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
                    {/* Call buttons hidden - uncomment to enable */}
                    {/* <button 
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
                    </button> */}
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
                    <>
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`message ${message.sender === 'me' ? 'sent' : 'received'}`}
                        >
                          <div className="message-content">
                            <p>{message.text}</p>
                            <div className="message-footer">
                              <span className="message-time">{message.time}</span>
                              {message.sender === 'me' && (
                                <span className="message-status">
                                  {message.isRead ? (
                                    // Double tick for read
                                    <i className="fa-solid fa-check-double" style={{ color: '#00a884' }} title="Read"></i>
                                  ) : (
                                    // Single tick for delivered
                                    <i className="fa-solid fa-check" style={{ color: '#667781' }} title="Delivered"></i>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Typing Indicator */}
                      {isOtherUserTyping && (
                        <div className="message received">
                          <div className="message-content typing-indicator">
                            <div className="typing-dots">
                              <span></span>
                              <span></span>
                              <span></span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Message Input */}
                <form className="message-input-form" onSubmit={handleSendMessage}>
                  <div className="message-input-container">
                      <button
                        type="button"
                        className="attachment-btn"
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        title="Attach file"
                      >
                        <i className="fa-solid fa-paperclip"></i>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,audio/*"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files && e.target.files[0];
                          if (!file || !activeChat) return;
                          try {
                            const reader = new FileReader();
                            reader.onload = async () => {
                              const dataUrl = reader.result;
                              // Send message with media inline (data URL). Backend accepts mediaUrl/mediaType
                              setIsSending(true);
                              try {
                                const payload = {
                                  content: {
                                    text: '',
                                    mediaUrl: dataUrl,
                                    mediaType: file.type
                                  },
                                  messageType: 'media'
                                };
                                const resp = await sendMessage(activeChat.id, payload);
                                // append delivered message
                                const delivered = convertMessage(resp?.message || resp, user);
                                setMessages(prev => [...prev, delivered]);
                                setConversations(prev => prev.map(conv => conv.id === activeChat.id ? { ...conv, lastMessage: delivered } : conv));
                              } catch (err) {
                                console.error('Attachment send error:', err);
                                if (typeof window.showToast === 'function') window.showToast('Failed to send attachment', 'error');
                              } finally {
                                setIsSending(false);
                                e.target.value = '';
                              }
                            };
                            reader.readAsDataURL(file);
                          } catch (err) {
                            console.error('Failed to read file:', err);
                          }
                        }}
                      />
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value);
                        
                        // Emit typing indicator
                        if (socket && isConnected && activeChat) {
                          socket.emit('message:typing', {
                            conversationId: activeChat.id,
                            isTyping: e.target.value.length > 0
                          });
                        }
                      }}
                      onBlur={() => {
                        // Stop typing indicator when input loses focus
                        if (socket && isConnected && activeChat) {
                          socket.emit('message:typing', {
                            conversationId: activeChat.id,
                            isTyping: false
                          });
                        }
                      }}
                      className="message-input"
                    />
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        className="emoji-btn"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        title="Emoji"
                      >
                        <i className="fa-solid fa-face-smile"></i>
                      </button>
                      {showEmojiPicker && (
                        <div className="emoji-picker-popover">
                          <div className="emoji-search">
                            <i className="fa-solid fa-magnifying-glass"></i>
                            <input
                              type="text"
                              placeholder="Search emoji"
                              value={emojiSearchQuery}
                              onChange={(e) => setEmojiSearchQuery(e.target.value)}
                              className="emoji-search-input"
                            />
                          </div>
                          
                          <div className="emoji-categories">
                            <button
                              type="button"
                              className={`emoji-category-btn ${emojiCategory === 'smileys' ? 'active' : ''}`}
                              onClick={() => { setEmojiCategory('smileys'); setEmojiSearchQuery(''); }}
                              title="Smileys & People"
                            >
                              😊
                            </button>
                            <button
                              type="button"
                              className={`emoji-category-btn ${emojiCategory === 'animals' ? 'active' : ''}`}
                              onClick={() => { setEmojiCategory('animals'); setEmojiSearchQuery(''); }}
                              title="Animals & Nature"
                            >
                              🐶
                            </button>
                            <button
                              type="button"
                              className={`emoji-category-btn ${emojiCategory === 'food' ? 'active' : ''}`}
                              onClick={() => { setEmojiCategory('food'); setEmojiSearchQuery(''); }}
                              title="Food & Drink"
                            >
                              🍕
                            </button>
                            <button
                              type="button"
                              className={`emoji-category-btn ${emojiCategory === 'activities' ? 'active' : ''}`}
                              onClick={() => { setEmojiCategory('activities'); setEmojiSearchQuery(''); }}
                              title="Activities"
                            >
                              ⚽
                            </button>
                            <button
                              type="button"
                              className={`emoji-category-btn ${emojiCategory === 'travel' ? 'active' : ''}`}
                              onClick={() => { setEmojiCategory('travel'); setEmojiSearchQuery(''); }}
                              title="Travel & Places"
                            >
                              🚗
                            </button>
                            <button
                              type="button"
                              className={`emoji-category-btn ${emojiCategory === 'objects' ? 'active' : ''}`}
                              onClick={() => { setEmojiCategory('objects'); setEmojiSearchQuery(''); }}
                              title="Objects"
                            >
                              💡
                            </button>
                            <button
                              type="button"
                              className={`emoji-category-btn ${emojiCategory === 'symbols' ? 'active' : ''}`}
                              onClick={() => { setEmojiCategory('symbols'); setEmojiSearchQuery(''); }}
                              title="Symbols"
                            >
                              ❤️
                            </button>
                            <button
                              type="button"
                              className={`emoji-category-btn ${emojiCategory === 'flags' ? 'active' : ''}`}
                              onClick={() => { setEmojiCategory('flags'); setEmojiSearchQuery(''); }}
                              title="Flags"
                            >
                              🏁
                            </button>
                          </div>

                          <div className="emoji-grid">
                            {getFilteredEmojis().map((emoji, index) => (
                              <button
                                key={`${emoji}-${index}`}
                                type="button"
                                className="emoji-picker-item"
                                onClick={() => {
                                  setMessageText((t) => (t || '') + emoji);
                                }}
                                aria-label={`Insert ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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














