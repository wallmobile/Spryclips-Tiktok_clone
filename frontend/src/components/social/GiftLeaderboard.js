import React, { useState, useEffect } from 'react';
import { getGiftsReceived } from '../../api/monetization';
import './GiftLeaderboard.css';

const GiftLeaderboard = ({ gifts = [], onClose }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeframe, setTimeframe] = useState('session'); // 'session', 'today', 'all-time'
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const buildLeaderboard = (source) => {
      const giftMap = new Map();
      source.forEach(gift => {
        const username = gift.username || gift.sender?.username || 'anonymous';
        if (!giftMap.has(username)) {
          giftMap.set(username, {
            username,
            totalCoins: 0,
            totalGifts: 0,
            gifts: [],
          });
        }
        const userEntry = giftMap.get(username);
        const value = gift.gift?.price || gift.value || 0;
        userEntry.totalCoins += value;
        userEntry.totalGifts += 1;
        userEntry.gifts.push(gift);
      });

      const sorted = Array.from(giftMap.values())
        .sort((a, b) => b.totalCoins - a.totalCoins)
        .slice(0, 10);

      setLeaderboard(sorted);
    };

    if (gifts.length) {
      buildLeaderboard(gifts);
      return;
    }

    let cancelled = false;
    const loadGifts = async () => {
      setLoading(true);
      try {
        const response = await getGiftsReceived(100);
        if (!cancelled) {
          const received = (response?.gifts || []).map((gift) => ({
            username: gift.sender?.username || 'anonymous',
            value: gift.value || 0,
            gift,
          }));
          buildLeaderboard(received);
        }
      } catch (err) {
        console.error('Failed to load gifts for leaderboard:', err);
        if (!cancelled) {
          setLeaderboard([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadGifts();

    return () => {
      cancelled = true;
    };
  }, [gifts]);

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const formatCoins = (coins) => {
    if (coins >= 1000) {
      return `${(coins / 1000).toFixed(1)}K`;
    }
    return coins.toString();
  };

  return (
    <div className="gift-leaderboard-overlay" onClick={onClose}>
      <div className="gift-leaderboard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="leaderboard-header">
          <button className="leaderboard-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>
            <i className="fa-solid fa-trophy"></i>
            Gift Leaderboard
          </h2>
          <div className="leaderboard-header-placeholder"></div>
        </div>

        {/* Timeframe Filter */}
        <div className="leaderboard-filters">
          <button
            className={`filter-btn ${timeframe === 'session' ? 'active' : ''}`}
            onClick={() => setTimeframe('session')}
          >
            Session
          </button>
          <button
            className={`filter-btn ${timeframe === 'today' ? 'active' : ''}`}
            onClick={() => setTimeframe('today')}
          >
            Today
          </button>
          <button
            className={`filter-btn ${timeframe === 'all-time' ? 'active' : ''}`}
            onClick={() => setTimeframe('all-time')}
          >
            All Time
          </button>
        </div>

        {/* Leaderboard List */}
        <div className="leaderboard-content">
          {loading ? (
            <div className="leaderboard-loading">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <p>Loading top supporters...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="empty-leaderboard">
              <i className="fa-solid fa-gift"></i>
              <p>No gifts sent yet</p>
              <span>Be the first to send a gift!</span>
            </div>
          ) : (
            <div className="leaderboard-list">
              {leaderboard.map((user, index) => (
                <div key={user.username} className={`leaderboard-item ${index < 3 ? `rank-${index + 1}` : ''}`}>
                  <div className="rank-badge">
                    <span className="rank-icon">{getRankIcon(index + 1)}</span>
                  </div>
                  <div className="user-avatar">
                    <img
                      src={`https://ui-avatars.com/api/?name=${user.username}&background=2563EB&color=fff&size=128`}
                      alt={user.username}
                    />
                    {index < 3 && <div className="crown-badge">
                      <i className="fa-solid fa-crown"></i>
                    </div>}
                  </div>
                  <div className="user-info">
                    <div className="username">@{user.username}</div>
                    <div className="user-stats">
                      <span>
                        <i className="fa-solid fa-gift"></i>
                        {user.totalGifts} gifts
                      </span>
                      <span>
                        <i className="fa-solid fa-coins"></i>
                        {formatCoins(user.totalCoins)} coins
                      </span>
                    </div>
                  </div>
                  <div className="user-rank-value">
                    <div className="rank-coins">{formatCoins(user.totalCoins)}</div>
                    <div className="rank-label">coins</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GiftLeaderboard;
