import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './RestrictedAccounts.css';

const RestrictedAccounts = ({ onClose }) => {
  const { user } = useAuth();
  const [restrictedUsers, setRestrictedUsers] = useState([
    { id: 1, username: 'user123', avatar: '', restrictedDate: '2024-01-15' },
    { id: 2, username: 'follower456', avatar: '', restrictedDate: '2024-01-10' }
  ]);
  const [restrictUserInput, setRestrictUserInput] = useState('');

  const handleRestrictUser = () => {
    if (restrictUserInput.trim()) {
      const newRestrictedUser = {
        id: Date.now(),
        username: restrictUserInput.trim(),
        avatar: '',
        restrictedDate: new Date().toISOString().split('T')[0]
      };
      setRestrictedUsers([...restrictedUsers, newRestrictedUser]);
      setRestrictUserInput('');
      alert(`User @${restrictUserInput.trim()} has been restricted successfully!`);
    }
  };

  const handleUnrestrictUser = (userId) => {
    setRestrictedUsers(restrictedUsers.filter(user => user.id !== userId));
    alert('User has been unrestricted successfully!');
  };

  const restrictionFeatures = [
    {
      icon: 'fa-solid fa-eye-slash',
      title: 'Limited Visibility',
      description: 'Restricted users can see your public content but not your private videos'
    },
    {
      icon: 'fa-solid fa-comment-slash',
      title: 'No Comments',
      description: 'Restricted users cannot comment on your videos'
    },
    {
      icon: 'fa-solid fa-user-slash',
      title: 'No Direct Messages',
      description: 'Restricted users cannot send you direct messages'
    },
    {
      icon: 'fa-solid fa-bell-slash',
      title: 'No Notifications',
      description: 'You won\'t receive notifications when restricted users interact with your content'
    }
  ];

  return (
    <div className="restricted-accounts-overlay" onClick={onClose}>
      <div className="restricted-accounts-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="restricted-header">
          <button className="restricted-close" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>Restricted Accounts</h2>
          <div className="restricted-header-placeholder"></div>
        </div>

        <div className="restricted-content">
          {/* Info Section */}
          <div className="restricted-info">
            <div className="info-icon">
              <i className="fa-solid fa-lock"></i>
            </div>
            <h3>What is Restricted Mode?</h3>
            <p>
              Restricted accounts can still view your public content, but they cannot comment, 
              send you direct messages, or see when you're online. This is a softer option than 
              blocking someone.
            </p>
          </div>

          {/* Features */}
          <div className="restricted-features">
            <h3>Restrictions Applied</h3>
            <div className="features-grid">
              {restrictionFeatures.map((feature, index) => (
                <div key={index} className="feature-card">
                  <div className="feature-icon">
                    <i className={feature.icon}></i>
                  </div>
                  <h4>{feature.title}</h4>
                  <p>{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Restrict New User */}
          <div className="restrict-user-section">
            <h3>Restrict a User</h3>
            <div className="restrict-user-input-container">
              <input
                type="text"
                placeholder="Enter username to restrict"
                value={restrictUserInput}
                onChange={(e) => setRestrictUserInput(e.target.value)}
                className="restrict-user-input"
              />
              <button onClick={handleRestrictUser} className="restrict-user-btn">
                Restrict
              </button>
            </div>
          </div>

          {/* Restricted Users List */}
          <div className="restricted-users-section">
            <h3>Restricted Users ({restrictedUsers.length})</h3>
            {restrictedUsers.length === 0 ? (
              <div className="empty-restricted">
                <i className="fa-solid fa-user-lock"></i>
                <p>No restricted users</p>
                <span>Users you restrict will appear here</span>
              </div>
            ) : (
              <div className="restricted-users-list">
                {restrictedUsers.map(user => (
                  <div key={user.id} className="restricted-user-item">
                    <div className="restricted-user-info">
                      <div className="restricted-user-avatar">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.username} />
                        ) : (
                          <i className="fa-solid fa-user"></i>
                        )}
                      </div>
                      <div className="restricted-user-details">
                        <span className="restricted-username">@{user.username}</span>
                        <span className="restricted-date">Restricted on {user.restrictedDate}</span>
                      </div>
                    </div>
                    <button
                      className="unrestrict-btn"
                      onClick={() => handleUnrestrictUser(user.id)}
                    >
                      <i className="fa-solid fa-unlock"></i>
                      Unrestrict
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestrictedAccounts;
