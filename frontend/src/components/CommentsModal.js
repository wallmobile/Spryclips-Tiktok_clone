import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactPicker from './ReactPicker';
import { useAuth } from '../context/AuthContext';
import { getComments, addComment } from '../api/comments';
import './CommentsModal.css';

const CommentsModal = ({ videoId, onClose, videoOwner, onCommentCountChange }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'likes'
    const [expandedReplies, setExpandedReplies] = useState(new Set());            
  const commentsEndRef = useRef(null);
  const inputRef = useRef(null);
  const [commentReactions, setCommentReactions] = useState(new Map()); // Map of comment/reply ID to reaction
  const [showReactPicker, setShowReactPicker] = useState(null); // Track which comment/reply shows picker: { type: 'comment'|'reply', id: string, parentId?: string }
  const reactButtonRefs = useRef(new Map()); // Store refs for reaction buttons

  const prevCommentCountRef = useRef(comments.length);
  
  useEffect(() => {
    if (comments.length !== prevCommentCountRef.current) {
      prevCommentCountRef.current = comments.length;
      if (typeof onCommentCountChange === 'function') {
        onCommentCountChange(comments.length);
      }
    }
  }, [comments.length, onCommentCountChange]);

  // Get current user from auth context
  const currentUser = user ? {
    id: user.id || user._id,
    username: user.username,
    avatar: user.profile?.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=E50914&color=fff`
  } : null;

  const formatTimestamp = (date) => {
    if (!date) return 'just now';
    const now = new Date();
    const commentDate = new Date(date);
    const diffMs = now - commentDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return commentDate.toLocaleDateString();
  };

  const fetchComments = useCallback(async () => {
    if (!videoId) return;
    
    setLoading(true);
    try {
      const response = await getComments(videoId);
      let fetchedComments = [];
      
      if (response.comments && Array.isArray(response.comments)) {
        // Transform API response to component format
        fetchedComments = response.comments.map(comment => ({
          id: comment._id || comment.id,
          userId: comment.user?._id || comment.user?.id || comment.user,
          username: comment.user?.username || 'user',
          avatar: comment.user?.profile?.avatar || `https://ui-avatars.com/api/?name=${comment.user?.username || 'User'}&background=E50914&color=fff`,
          text: comment.text || '',
          likes: comment.likes || 0,
          isLiked: comment.likedBy?.includes(currentUser?.id) || false,
          timestamp: formatTimestamp(comment.createdAt),
          createdAt: new Date(comment.createdAt),
          replies: comment.replies || [],
          replyCount: comment.replies?.length || 0,
          parentComment: comment.parentComment
        }));
      }

      // Sort comments based on sortBy
      let sortedComments = [...fetchedComments];
      if (sortBy === 'newest') {
        sortedComments.sort((a, b) => b.createdAt - a.createdAt);
      } else if (sortBy === 'oldest') {
        sortedComments.sort((a, b) => a.createdAt - b.createdAt);
      } else if (sortBy === 'likes') {
        sortedComments.sort((a, b) => b.likes - a.likes);
      }

      setComments(sortedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [videoId, sortBy, currentUser?.id]);

  // Fetch comments from API
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser || !videoId) return;

    const commentText = newComment.trim();
    setNewComment('');
    
    // Optimistic update
    const optimisticComment = {
      id: `temp_${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      avatar: currentUser.avatar,
      text: commentText,
      likes: 0,
      isLiked: false,
      timestamp: 'just now',
      createdAt: new Date(),
      replies: [],
      replyCount: 0
    };

    setComments(prev => {
      const sorted = [...prev, optimisticComment];
      if (sortBy === 'newest') {
        sorted.sort((a, b) => b.createdAt - a.createdAt);
      } else if (sortBy === 'oldest') {
        sorted.sort((a, b) => a.createdAt - b.createdAt);
      }
      return sorted;
    });

    // Scroll to new comment
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    // API call
    try {
      const response = await addComment(videoId, commentText);
      if (response.comment) {
        const newComment = {
          id: response.comment._id || response.comment.id,
          userId: response.comment.user?._id || response.comment.user?.id || currentUser.id,
          username: response.comment.user?.username || currentUser.username,
          avatar: response.comment.user?.profile?.avatar || currentUser.avatar,
          text: response.comment.text,
          likes: response.comment.likes || 0,
          isLiked: false,
          timestamp: 'just now',
          createdAt: new Date(response.comment.createdAt),
          replies: [],
          replyCount: 0
        };

        // Replace optimistic comment with real one
        setComments(prev => {
          const filtered = prev.filter(c => c.id !== optimisticComment.id);
          const sorted = [...filtered, newComment];
          if (sortBy === 'newest') {
            sorted.sort((a, b) => b.createdAt - a.createdAt);
          } else if (sortBy === 'oldest') {
            sorted.sort((a, b) => a.createdAt - b.createdAt);
          }
          return sorted;
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      // Remove optimistic comment on error
      setComments(prev => prev.filter(c => c.id !== optimisticComment.id));
      
      // Better error message
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          'Failed to add comment. Please try again.';
      
      // Show error toast or alert
      if (typeof window.showToast === 'function') {
        window.showToast(errorMessage, 'error');
      } else {
        alert(errorMessage);
      }
    }
  };

  const handleAddReply = async (commentId) => {
    if (!replyText.trim() || !currentUser || !videoId) return;

    const replyTextValue = replyText.trim();
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    setReplyText('');
    const replyingToUser = replyingTo;
    setReplyingTo(null);

    // Optimistic update
    const optimisticReply = {
      id: `temp_reply_${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      avatar: currentUser.avatar,
      text: replyTextValue,
      likes: 0,
      isLiked: false,
      timestamp: 'just now',
      createdAt: new Date(),
      replyTo: replyingToUser?.username
    };

    setComments(prev =>
      prev.map(c =>
        c.id === commentId
          ? {
              ...c,
              replies: [...(c.replies || []), optimisticReply],
              replyCount: (c.replyCount || 0) + 1
            }
          : c
      )
    );

    setExpandedReplies(prev => new Set([...prev, commentId]));

    // API call
    try {
      const response = await addComment(videoId, replyTextValue, commentId);
      if (response.comment) {
        const newReply = {
          id: response.comment._id || response.comment.id,
          userId: response.comment.user?._id || response.comment.user?.id || currentUser.id,
          username: response.comment.user?.username || currentUser.username,
          avatar: response.comment.user?.profile?.avatar || currentUser.avatar,
          text: response.comment.text,
          likes: response.comment.likes || 0,
          isLiked: false,
          timestamp: 'just now',
          createdAt: new Date(response.comment.createdAt),
          replyTo: replyingToUser?.username
        };

        // Replace optimistic reply with real one
        setComments(prev =>
          prev.map(c =>
            c.id === commentId
              ? {
                  ...c,
                  replies: (c.replies || []).map(r => r.id === optimisticReply.id ? newReply : r),
                }
              : c
          )
        );
      }
    } catch (error) {
      console.error('Error adding reply:', error);
      // Remove optimistic reply on error
      setComments(prev =>
        prev.map(c =>
          c.id === commentId
            ? {
                ...c,
                replies: (c.replies || []).filter(r => r.id !== optimisticReply.id),
                replyCount: (c.replyCount || 0) - 1
              }
            : c
        )
      );
      // Better error message
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          'Failed to add reply. Please try again.';
      
      // Show error toast or alert
      if (typeof window.showToast === 'function') {
        window.showToast(errorMessage, 'error');
      } else {
        alert(errorMessage);
      }
    }
  };

    const handleLikeComment = (commentId, isReply = false, parentId = null) => {  
    setComments(prev =>
      prev.map(comment => {
        if (isReply && comment.id === parentId) {
          return {
            ...comment,
            replies: comment.replies.map(reply =>
              reply.id === commentId
                ? {
                    ...reply,
                    isLiked: !reply.isLiked,
                    likes: reply.isLiked ? reply.likes - 1 : reply.likes + 1    
                  }
                : reply
            )
          };
        } else if (!isReply && comment.id === commentId) {
          return {
            ...comment,
            isLiked: !comment.isLiked,
            likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1      
          };
        }
        return comment;
      })
    );
  };

  const handleCommentReaction = useCallback((commentId, isReply = false, parentId = null) => (reaction) => {
    const key = isReply ? `reply_${parentId}_${commentId}` : `comment_${commentId}`;
    
    // Update reaction state
    setCommentReactions(prev => {
      const newMap = new Map(prev);
      if (reaction) {
        newMap.set(key, reaction);
      } else {
        newMap.delete(key);
      }
      return newMap;
    });

    // Update comment/reply likes
    if (reaction) {
      // Adding reaction - increment likes if not already liked
      setComments(prev =>
        prev.map(comment => {
          if (isReply && comment.id === parentId) {
            return {
              ...comment,
              replies: comment.replies.map(reply =>
                reply.id === commentId && !reply.isLiked
                  ? {
                      ...reply,
                      isLiked: true,
                      likes: reply.likes + 1
                    }
                  : reply
              )
            };
          } else if (!isReply && comment.id === commentId && !comment.isLiked) {
            return {
              ...comment,
              isLiked: true,
              likes: comment.likes + 1
            };
          }
          return comment;
        })
      );
    } else {
      // Removing reaction - decrement likes if currently liked
      setComments(prev =>
        prev.map(comment => {
          if (isReply && comment.id === parentId) {
            return {
              ...comment,
              replies: comment.replies.map(reply =>
                reply.id === commentId && reply.isLiked
                  ? {
                      ...reply,
                      isLiked: false,
                      likes: reply.likes - 1
                    }
                  : reply
              )
            };
          } else if (!isReply && comment.id === commentId && comment.isLiked) {
            return {
              ...comment,
              isLiked: false,
              likes: comment.likes - 1
            };
          }
          return comment;
        })
      );
    }

    // Close picker after selection
    setShowReactPicker(null);
  }, []);

  const handleLongPress = useCallback((commentId, isReply = false, parentId = null) => {
    setShowReactPicker({ type: isReply ? 'reply' : 'comment', id: commentId, parentId });
  }, []);

  const handleDeleteComment = (commentId, isReply = false, parentId = null) => {
    if (isReply) {
      setComments(prev =>
        prev.map(comment =>
          comment.id === parentId
            ? {
                ...comment,
                replies: comment.replies.filter(reply => reply.id !== commentId),
                replyCount: Math.max(0, comment.replyCount - 1)
              }
            : comment
        )
      );
    } else {
      setComments(prev => prev.filter(comment => comment.id !== commentId));
    }
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    // Focus input when modal opens
    inputRef.current?.focus();
  }, []);

  if (!videoId) return null;

  return (
    <div className="comments-modal-overlay" onClick={onClose}>
      <div className="comments-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="comments-modal-header">
          <h2>Comments</h2>
          <button className="comments-modal-close" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        {/* Sort Options */}
        <div className="comments-sort-container">
          <button
            className={`sort-btn ${sortBy === 'newest' ? 'active' : ''}`}
            onClick={() => setSortBy('newest')}
          >
            Newest
          </button>
          <button
            className={`sort-btn ${sortBy === 'oldest' ? 'active' : ''}`}
            onClick={() => setSortBy('oldest')}
          >
            Oldest
          </button>
          <button
            className={`sort-btn ${sortBy === 'likes' ? 'active' : ''}`}
            onClick={() => setSortBy('likes')}
          >
            Most Liked
          </button>
        </div>

        {/* Comments List */}
        <div className="comments-list">
          {loading ? (
            <div className="comments-loading">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <p>Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="comments-empty">
              <i className="fa-solid fa-comment-slash"></i>
              <p>No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            <>
              {comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <img
                    src={comment.avatar}
                    alt={comment.username}
                    className="comment-avatar"
                  />
                  <div className="comment-content">
                    <div className="comment-header">
                      <span className="comment-username">@{comment.username}</span>
                      {comment.userId === videoOwner && (
                        <span className="comment-badge">OP</span>
                      )}
                      <span className="comment-time">{comment.timestamp}</span>
                    </div>
                    <p className="comment-text">{comment.text}</p>
                                        <div className="comment-actions">
                      <div className="comment-react-item" style={{ position: 'relative' }}>
                        <button
                          ref={(el) => {
                            if (el) reactButtonRefs.current.set(`comment_${comment.id}`, el);
                          }}
                          className={`comment-action-btn ${comment.isLiked || commentReactions.get(`comment_${comment.id}`) ? 'liked' : ''}`}                                                                      
                          onClick={() => handleLikeComment(comment.id)}
                          onMouseDown={(e) => {
                            const timer = setTimeout(() => {
                              handleLongPress(comment.id, false, null);
                            }, 500);
                            const cleanup = () => {
                              clearTimeout(timer);
                              document.removeEventListener('mouseup', cleanup);
                              document.removeEventListener('mouseleave', cleanup);
                            };
                            document.addEventListener('mouseup', cleanup);
                            document.addEventListener('mouseleave', cleanup);
                          }}
                          onTouchStart={(e) => {
                            const timer = setTimeout(() => {
                              handleLongPress(comment.id, false, null);
                            }, 500);
                            const cleanup = () => {
                              clearTimeout(timer);
                              document.removeEventListener('touchend', cleanup);
                            };
                            document.addEventListener('touchend', cleanup);
                          }}
                        >
                          {commentReactions.get(`comment_${comment.id}`) ? (
                            <span className="comment-reaction-emoji">{commentReactions.get(`comment_${comment.id}`).emoji}</span>
                          ) : (
                            <i className="fa-solid fa-heart"></i>
                          )}
                          <span>{comment.likes > 0 ? comment.likes : ''}</span>   
                        </button>
                        {showReactPicker?.type === 'comment' && showReactPicker?.id === comment.id && (
                          <ReactPicker
                            onReaction={handleCommentReaction(comment.id, false, null)}
                            currentReaction={commentReactions.get(`comment_${comment.id}`) || null}
                            position="top"
                          />
                        )}
                      </div>
                      <button
                        className="comment-action-btn"
                        onClick={() => {
                          setReplyingTo({ id: comment.id, username: comment.username });
                          setExpandedReplies(prev => new Set([...prev, comment.id]));
                        }}
                      >
                        <i className="fa-solid fa-reply"></i>
                        <span>Reply</span>
                      </button>
                      {comment.userId === currentUser?.id && (
                        <button
                          className="comment-action-btn delete-btn"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      )}
                    </div>

                    {/* Replies */}
                    {comment.replyCount > 0 && (
                      <>
                        <button
                          className="view-replies-btn"
                          onClick={() => toggleReplies(comment.id)}
                        >
                          {expandedReplies.has(comment.id) ? (
                            <>
                              <i className="fa-solid fa-chevron-up"></i>
                              <span>Hide {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}</span>
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-chevron-down"></i>
                              <span>View {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}</span>
                            </>
                          )}
                        </button>
                        {expandedReplies.has(comment.id) && (
                          <div className="replies-list">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="reply-item">
                                <img
                                  src={reply.avatar}
                                  alt={reply.username}
                                  className="reply-avatar"
                                />
                                <div className="reply-content">
                                  <div className="reply-header">
                                    <span className="reply-username">@{reply.username}</span>
                                    {reply.userId === videoOwner && (
                                      <span className="reply-badge">OP</span>
                                    )}
                                    {reply.replyTo && reply.replyTo !== reply.username && (
                                      <>
                                        <span className="reply-to">Replying to</span>
                                        <span className="reply-to-username">@{reply.replyTo}</span>
                                      </>
                                    )}
                                    <span className="reply-time">{reply.timestamp}</span>
                                  </div>
                                  <p className="reply-text">{reply.text}</p>
                                                                    <div className="reply-actions">
                                    <div className="comment-react-item" style={{ position: 'relative' }}>
                                      <button
                                        ref={(el) => {
                                          if (el) reactButtonRefs.current.set(`reply_${comment.id}_${reply.id}`, el);
                                        }}
                                        className={`comment-action-btn ${reply.isLiked || commentReactions.get(`reply_${comment.id}_${reply.id}`) ? 'liked' : ''}`}                                                          
                                        onClick={() => handleLikeComment(reply.id, true, comment.id)}
                                        onMouseDown={(e) => {
                                          const timer = setTimeout(() => {
                                            handleLongPress(reply.id, true, comment.id);
                                          }, 500);
                                          const cleanup = () => {
                                            clearTimeout(timer);
                                            document.removeEventListener('mouseup', cleanup);
                                            document.removeEventListener('mouseleave', cleanup);
                                          };
                                          document.addEventListener('mouseup', cleanup);
                                          document.removeEventListener('mouseleave', cleanup);
                                        }}
                                        onTouchStart={(e) => {
                                          const timer = setTimeout(() => {
                                            handleLongPress(reply.id, true, comment.id);
                                          }, 500);
                                          const cleanup = () => {
                                            clearTimeout(timer);
                                            document.removeEventListener('touchend', cleanup);
                                          };
                                          document.addEventListener('touchend', cleanup);
                                        }}
                                      >
                                        {commentReactions.get(`reply_${comment.id}_${reply.id}`) ? (
                                          <span className="comment-reaction-emoji">{commentReactions.get(`reply_${comment.id}_${reply.id}`).emoji}</span>
                                        ) : (
                                          <i className="fa-solid fa-heart"></i>
                                        )}
                                        <span>{reply.likes > 0 ? reply.likes : ''}</span>                                                                         
                                      </button>
                                      {showReactPicker?.type === 'reply' && showReactPicker?.id === reply.id && showReactPicker?.parentId === comment.id && (
                                        <ReactPicker
                                          onReaction={handleCommentReaction(reply.id, true, comment.id)}
                                          currentReaction={commentReactions.get(`reply_${comment.id}_${reply.id}`) || null}
                                          position="top"
                                        />
                                      )}
                                    </div>
                                    <button
                                      className="comment-action-btn"
                                      onClick={() => {
                                        setReplyingTo({ id: comment.id, username: reply.username });
                                      }}
                                    >
                                      <i className="fa-solid fa-reply"></i>
                                      <span>Reply</span>
                                    </button>
                                    {reply.userId === currentUser?.id && (
                                      <button
                                        className="comment-action-btn delete-btn"
                                        onClick={() => handleDeleteComment(reply.id, true, comment.id)}
                                      >
                                        <i className="fa-solid fa-trash"></i>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* Reply Input */}
                    {replyingTo && replyingTo.id === comment.id && (
                      <div className="reply-input-container">
                        <img
                          src={currentUser?.avatar}
                          alt={currentUser?.username}
                          className="reply-input-avatar"
                        />
                        <div className="reply-input-wrapper">
                          <input
                            type="text"
                            placeholder={`Reply to @${replyingTo.username}...`}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddReply(comment.id);
                              }
                            }}
                            className="reply-input"
                          />
                          <button
                            className="reply-send-btn"
                            onClick={() => handleAddReply(comment.id)}
                            disabled={!replyText.trim()}
                          >
                            <i className="fa-solid fa-paper-plane"></i>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={commentsEndRef} />
            </>
          )}
        </div>

        {/* New Comment Input */}
        <div className="comments-input-container">
          <img
            src={currentUser?.avatar}
            alt={currentUser?.username}
            className="comments-input-avatar"
          />
          <div className="comments-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
              className="comments-input"
            />
            <button
              className="comments-send-btn"
              onClick={handleAddComment}
              disabled={!newComment.trim()}
            >
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentsModal;













