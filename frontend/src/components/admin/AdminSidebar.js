import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AdminSidebar.css';

const AdminSidebar = ({ activeTab, setActiveTab, activeSubTab, setActiveSubTab, onClose }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const menuItems = [
    { id: 'dashboard', icon: 'fa-chart-line', label: 'Dashboard', subItems: [] },
    { id: 'users', icon: 'fa-users', label: 'Users', subItems: [] },
    { id: 'videos', icon: 'fa-video', label: 'Videos', subItems: [] },
    { id: 'stories', icon: 'fa-book', label: 'Stories', subItems: [] },
    { id: 'comments', icon: 'fa-comments', label: 'Comments', subItems: [] },
    {
      id: 'moderation',
      icon: 'fa-shield-halved',
      label: 'Moderation',
      subItems: [
        { id: 'videos', label: 'Videos' },
        { id: 'comments', label: 'Comments' },
        { id: 'ai-flags', label: 'AI Flags' },
        { id: 'live-streams', label: 'Live Streams' },
        { id: 'copyright', label: 'Copyright' }
      ]
    },
    {
      id: 'safety',
      icon: 'fa-shield',
      label: 'Reports & Safety',
      subItems: [
        { id: 'reports', label: 'Abuse Reports' },
        { id: 'high-risk', label: 'High Risk' },
        { id: 'spam', label: 'Spam Alerts' },
        { id: 'child-safety', label: 'Child Safety' },
        { id: 'bot-detection', label: 'Bot Detection' },
        { id: 'takeover', label: 'Takeover Alerts' }
      ]
    },
    {
      id: 'monetization',
      icon: 'fa-dollar-sign',
      label: 'Monetization',
      subItems: [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'creators', label: 'Creators' },
        { id: 'ad-revenue', label: 'Ad Revenue' },
        { id: 'gifts-coins', label: 'Gifts & Coins' },
        { id: 'withdrawals', label: 'Withdrawals' },
        { id: 'tax-documents', label: 'Tax Documents' },
        { id: 'brand-deals', label: 'Brand Deals' }
      ]
    },
    {
      id: 'analytics',
      icon: 'fa-chart-bar',
      label: 'Analytics',
      subItems: [
        { id: 'overview', label: 'Overview' },
        { id: 'active-users', label: 'Active Users' },
        { id: 'retention', label: 'Retention' },
        { id: 'completion', label: 'Completion Rate' },
        { id: 'hashtags', label: 'Trending Hashtags' },
        { id: 'categories', label: 'Categories' },
        { id: 'regions', label: 'Regions' },
        { id: 'devices', label: 'Devices' }
      ]
    },
    {
      id: 'search',
      icon: 'fa-search',
      label: 'Search & Rec',
      subItems: [
        { id: 'blacklist', label: 'Blacklist' },
        { id: 'boosted', label: 'Boost Content' },
        { id: 'hashtags', label: 'Hashtag Control' },
        { id: 'ab-tests', label: 'A/B Tests' },
        { id: 'discovery-control', label: 'Discovery Control' }
      ]
    },
    {
      id: 'policy',
      icon: 'fa-gavel',
      label: 'Policy Compliance',
      subItems: [
        { id: 'age-restrictions', label: 'Age Restrictions' },
        { id: 'regional-laws', label: 'Regional Laws' },
        { id: 'legal-hold', label: 'Legal Hold' },
        { id: 'law-enforcement', label: 'Law Enforcement Requests' },
        { id: 'data-privacy', label: 'Data Privacy Audits' }
      ]
    },
    {
      id: 'security',
      icon: 'fa-shield-halved',
      label: 'Security',
      subItems: [
        { id: '2fa', label: 'Two-Factor Auth' },
        { id: 'roles', label: 'Role-Based Access' },
        { id: 'activity-logs', label: 'Activity Logs' },
        { id: 'sessions', label: 'Session Tracking' }
      ]
    },
    {
      id: 'system',
      icon: 'fa-server',
      label: 'Technical System',
      subItems: [
        { id: 'video-processing', label: 'Video Processing' },
        { id: 'cdn-health', label: 'CDN Health' },
        { id: 'server-health', label: 'Server Health' },
        { id: 'error-logs', label: 'Error Logs' },
        { id: 'api-requests', label: 'API Requests' },
        { id: 'storage', label: 'Storage' }
      ]
    },
    {
      id: 'support',
      icon: 'fa-headset',
      label: 'Support & Help',
      subItems: [
        { id: 'tickets', label: 'User Tickets' },
        { id: 'login-issues', label: 'Login Issues' },
        { id: 'payment-issues', label: 'Payment Issues' },
        { id: 'video-upload', label: 'Upload Issues' },
        { id: 'shadowban', label: 'Shadowban Cases' },
        { id: 'comment-appeals', label: 'Comment Appeals' }
      ]
    },
    {
      id: 'app-store',
      icon: 'fa-mobile-screen',
      label: 'App Store Compliance',
      subItems: [
        { id: 'violations', label: 'Policy Violations' },
        { id: 'ratings', label: 'Ratings & Reviews' }
      ]
    },
    {
      id: 'experiments',
      icon: 'fa-flask',
      label: 'Experiment Features',
      subItems: [
        { id: 'feature-flags', label: 'Feature Flags' },
        { id: 'ui-testing', label: 'UI Testing' }
      ]
    },
    {
      id: 'notifications',
      icon: 'fa-bell',
      label: 'Notifications Control',
      subItems: [
        { id: 'push-campaigns', label: 'Push Campaigns' },
        { id: 'warnings', label: 'Warning Messages' }
      ]
    },
    {
      id: 'backup',
      icon: 'fa-database',
      label: 'Backup & Recovery',
      subItems: [
        { id: 'archives', label: 'Audit Archives' },
        { id: 'restore', label: 'Restore Content' }
      ]
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
    if (onClose) onClose();
  };

  const handleBackToApp = () => {
    navigate('/');
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="admin-sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle sidebar"
      >
        <i className={`fa-solid ${isOpen ? 'fa-times' : 'fa-bars'}`}></i>
      </button>

      {/* Sidebar */}
      <div className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-logo">
            <i className="fa-solid fa-shield-halved"></i>
            <span>Admin Panel</span>
          </div>
          <button className="admin-sidebar-close" onClick={() => setIsOpen(false)}>
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        <div className="admin-sidebar-content">
          <nav className="admin-sidebar-nav">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              const hasSubItems = item.subItems && item.subItems.length > 0;

              return (
                <div key={item.id} className="admin-sidebar-item">
                  <button
                    className={`admin-sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      if (!hasSubItems) {
                        setActiveTab(item.id);
                        setIsOpen(false);
                      } else {
                        // Toggle submenu for items with sub-items
                        if (isActive) {
                          setActiveTab(null);
                        } else {
                          setActiveTab(item.id);
                        }
                      }
                    }}
                  >
                    <i className={`fa-solid ${item.icon}`}></i>
                    <span>{item.label}</span>
                    {hasSubItems && (
                      <i className={`fa-solid fa-chevron-${isActive ? 'down' : 'right'} admin-sidebar-chevron`}></i>
                    )}
                  </button>

                  {hasSubItems && isActive && (
                    <div className="admin-sidebar-submenu">
                      {item.subItems.map((subItem) => {
                        // Disable auto-highlighting from main content tabs
                        // Sidebar items will only be highlighted when clicked directly from sidebar
                        const isSubActive = false;
                        
                        // Handle navigation for new separate pages
                        const handleSubItemClick = (e) => {
                          e.stopPropagation(); // Prevent parent click
                          
                          if (subItem.id === 'discovery-control') {
                            navigate('/admin/search-discovery');
                            setIsOpen(false);
                            return;
                          }
                          if (subItem.id === 'age-restrictions' || subItem.id === 'regional-laws' || subItem.id === 'legal-hold' || subItem.id === 'law-enforcement') {
                            navigate('/admin/policy-compliance');
                            setIsOpen(false);
                            return;
                          }
                          if (subItem.id === 'data-privacy') {
                            navigate('/admin/data-privacy-audits');
                            setIsOpen(false);
                            return;
                          }
                          if (subItem.id === '2fa' || subItem.id === 'roles' || subItem.id === 'activity-logs' || subItem.id === 'sessions') {
                            navigate('/admin/security-settings');
                            setIsOpen(false);
                            return;
                          }
                          if (subItem.id === 'violations' || subItem.id === 'ratings') {
                            navigate('/admin/app-store-compliance');
                            setIsOpen(false);
                            return;
                          }
                          if (subItem.id === 'feature-flags' || subItem.id === 'ui-testing') {
                            navigate('/admin/experiment-features');
                            setIsOpen(false);
                            return;
                          }
                          if (subItem.id === 'push-campaigns' || subItem.id === 'warnings') {
                            navigate('/admin/notifications-control');
                            setIsOpen(false);
                            return;
                          }
                          if (subItem.id === 'archives' || subItem.id === 'restore') {
                            navigate('/admin/backup-recovery');
                            setIsOpen(false);
                            return;
                          }
                          
                          // Default behavior for other sub-items
                          setActiveTab(item.id);
                          const subTabId = item.id === 'moderation' || item.id === 'safety' || item.id === 'monetization' || item.id === 'analytics' || item.id === 'search' 
                            ? subItem.id 
                            : null;
                          if (setActiveSubTab && subTabId) {
                            setActiveSubTab(subTabId);
                          }
                          setIsOpen(false);
                        };
                        
                        return (
                          <button
                            key={subItem.id}
                            className={`admin-sidebar-sublink ${isSubActive ? 'active' : ''}`}
                            onClick={handleSubItemClick}
                            type="button"
                          >
                            {subItem.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="admin-sidebar-footer">
          <button className="admin-sidebar-action" onClick={handleBackToApp}>
            <i className="fa-solid fa-home"></i>
            <span>Back to App</span>
          </button>
          <button className="admin-sidebar-action" onClick={handleLogout}>
            <i className="fa-solid fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="admin-sidebar-overlay" onClick={() => setIsOpen(false)}></div>
      )}
    </>
  );
};

export default AdminSidebar;

