// Admin sidebar navigation component with menu items
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AdminSidebar.css';

const AdminSidebar = ({ activeTab, setActiveTab, activeSubTab, setActiveSubTab, onClose }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // On desktop (>= 1025px), sidebar should always be open. On mobile/tablet (< 1025px), it should be closed by default and accessible via hamburger.
  // On refresh, keep sidebar closed on mobile/tablet to show the current page
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const isDesktop = window.innerWidth >= 1025; // Desktop only, tablets and mobile should use hamburger
      // On mobile/tablet, always start closed (even on refresh) to show current page
      // On desktop only, always start open
      const initialState = isDesktop;
      console.log('AdminSidebar: Initial isOpen state:', initialState, 'window width:', window.innerWidth, 'isDesktop:', isDesktop);
      return initialState;
    }
    console.log('AdminSidebar: Defaulting to closed (window undefined)');
    return false; // Default to closed on mobile/tablet
  });
  
  // Keep sidebar open on desktop only when window resizes
  useEffect(() => {
    // Ensure sidebar is open on desktop only on mount
    if (typeof window !== 'undefined') {
      const isDesktop = window.innerWidth >= 1025; // Desktop only (>= 1025px)
      console.log('AdminSidebar: useEffect - isDesktop:', isDesktop, 'window width:', window.innerWidth, 'current isOpen:', isOpen);
      if (isDesktop && !isOpen) {
        console.log('AdminSidebar: Setting isOpen to true (desktop only)');
        setIsOpen(true);
      }
    }
    
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1025; // Desktop only (>= 1025px)
      console.log('AdminSidebar: Resize - isDesktop:', isDesktop, 'window width:', window.innerWidth, 'current isOpen:', isOpen);
      if (isDesktop && !isOpen) {
        // On desktop only, ensure it's open (but don't force if user explicitly closed it)
        console.log('AdminSidebar: Resize - setting isOpen to true');
        setIsOpen(true);
      }
      // On mobile/tablet, allow user to toggle - don't force state
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

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
        { id: 'ab-tests', label: 'A/B Tests' }
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
        { id: 'law-enforcement', label: 'Law Enforcement Requests' }
      ]
    },
    {
      id: 'security',
      icon: 'fa-shield-halved',
      label: 'Security',
      subItems: [
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
        { id: 'api-requests', label: 'API Requests' }
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
      id: 'notifications',
      icon: 'fa-bell',
      label: 'Notifications Control',
      subItems: [
        { id: 'push-campaigns', label: 'Push Campaigns' },
        { id: 'warnings', label: 'Warning Messages' }
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
      {/* Mobile/Tablet Hamburger Toggle Button - Always visible on mobile/tablet (< 1025px), positioned on top right */}
      {typeof window !== 'undefined' && window.innerWidth < 1025 && (
        <button
          className="admin-sidebar-toggle"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Hamburger toggle button clicked, current isOpen:', isOpen);
            setIsOpen(prev => {
              const newState = !prev;
              console.log('Setting isOpen to:', newState);
              return newState;
            });
          }}
          aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
          style={{ 
            zIndex: 100002, 
            pointerEvents: 'auto', 
            cursor: 'pointer',
            display: 'flex',
            position: 'fixed',
            top: '8px',
            right: '8px',
            left: 'auto',
            width: '32px',
            height: '32px',
            margin: 0,
            padding: 0,
            background: 'linear-gradient(135deg, #FF0050 0%, #FE2C55 50%, #25F4EE 100%)',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontSize: '14px',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
          className="admin-sidebar-toggle"
        >
          <i className={isOpen ? "fa-solid fa-times" : "fa-solid fa-bars"}></i>
        </button>
      )}

      {/* Sidebar - Visible on desktop (>= 1025px), toggleable on mobile/tablet */}
      {(() => {
        const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1025; // Desktop only (>= 1025px)
        const shouldShow = isDesktop || isOpen;
        console.log('AdminSidebar: Rendering - isDesktop:', isDesktop, 'isOpen:', isOpen, 'shouldShow:', shouldShow);
        return (
          <div 
            className={`admin-sidebar ${shouldShow ? 'open' : ''}`}
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              width: '280px',
              height: '100vh',
              background: '#ffffff',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              // Let CSS handle transform/visibility for mobile responsiveness
              borderRight: '2px solid #e9ecef',
              boxShadow: '2px 0 8px rgba(0, 0, 0, 0.05)',
              pointerEvents: shouldShow ? 'auto' : 'none'
            }}
          >
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-logo">
            <i className="fa-solid fa-shield-halved"></i>
            <span>Admin Panel</span>
          </div>
        </div>

        <div className="admin-sidebar-content">
          <nav className="admin-sidebar-nav">
            {menuItems.map((item) => {
              // Check if we're on a separate page route
              const isOnSeparatePage = 
                (item.id === 'notifications' && location.pathname === '/admin/notifications-control') ||
                (item.id === 'policy' && location.pathname === '/admin/policy-compliance') ||
                (item.id === 'security' && location.pathname === '/admin/security-settings');
              
              // Show submenu as active if:
              // 1. activeTab matches this item, OR
              // 2. We're on the separate page for this item (so submenu stays visible)
              const isActive = activeTab === item.id || isOnSeparatePage;
              const hasSubItems = item.subItems && item.subItems.length > 0;

              return (
                <div 
                  key={item.id} 
                  className="admin-sidebar-item"
                  onClick={(e) => {
                    // Prevent auto-scroll when clicking on item
                    e.stopPropagation();
                  }}
                >
                    <button
                      className={`admin-sidebar-link ${isActive ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Menu item clicked:', item.id, 'isActive:', isActive, 'hasSubItems:', hasSubItems);
                        const isMobileOrTablet = typeof window !== 'undefined' && window.innerWidth < 1025;
                        if (!hasSubItems) {
                          console.log('No sub-items, setting activeTab to:', item.id);
                          if (setActiveTab) {
                            setActiveTab(item.id);
                          }
                          // Always close sidebar on mobile/tablet when clicking a menu item
                          const isMobileOrTablet = typeof window !== 'undefined' && window.innerWidth < 1025;
                          if (isMobileOrTablet) {
                            console.log('Closing sidebar on mobile/tablet after menu item click');
                            setIsOpen(false);
                          }
                        } else {
                          // Toggle submenu for all items with sub-items
                          const currentActiveTab = activeTab;
                          
                          // Check if we're on a separate page route for this item
                          const isOnThisSeparatePage = 
                            (item.id === 'notifications' && location.pathname === '/admin/notifications-control') ||
                            (item.id === 'policy' && location.pathname === '/admin/policy-compliance') ||
                            (item.id === 'security' && location.pathname === '/admin/security-settings');
                          
                          // Check if this item is currently active (submenu is open)
                          // Either activeTab matches OR we're on the separate page
                          const isCurrentlyActive = currentActiveTab === item.id || isOnThisSeparatePage;
                          
                          if (isCurrentlyActive) {
                            // Close submenu on second click
                            console.log('Closing submenu for:', item.id, 'current activeTab:', currentActiveTab, 'isOnThisSeparatePage:', isOnThisSeparatePage);
                            if (setActiveTab) {
                              setActiveTab(null);
                            }
                            // If on separate page, navigate back to admin panel
                            if (isOnThisSeparatePage) {
                              navigate('/admin');
                            }
                          } else {
                            // Open submenu on first click
                            console.log('Opening submenu for:', item.id, 'current activeTab:', currentActiveTab);
                            if (setActiveTab) {
                              setActiveTab(item.id);
                            }
                            // For separate page routes, also navigate on first click
                            if (item.id === 'notifications') {
                              navigate('/admin/notifications-control?tab=push-campaigns');
                              if (setActiveSubTab) setActiveSubTab('push-campaigns');
                            } else if (item.id === 'policy') {
                              navigate('/admin/policy-compliance?tab=age-restrictions');
                              if (setActiveSubTab) setActiveSubTab('age-restrictions');
                            } else if (item.id === 'security') {
                              navigate('/admin/security-settings?tab=roles');
                              if (setActiveSubTab) setActiveSubTab('roles');
                            }
                            // Always close sidebar on mobile/tablet when opening submenu
                            const isMobileOrTablet = typeof window !== 'undefined' && window.innerWidth < 1025;
                            if (isMobileOrTablet) {
                              console.log('Closing sidebar on mobile/tablet after submenu click');
                              setIsOpen(false);
                            }
                          }
                        }
                      }}
                      type="button"
                      style={{ 
                        pointerEvents: 'auto', 
                        touchAction: 'manipulation',
                        cursor: 'pointer',
                        userSelect: 'none',
                        WebkitUserSelect: 'none'
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
                        // Check if this sub-item is active based on activeSubTab prop
                        const isSubActive = activeSubTab === subItem.id;
                        
                        // Handle navigation for new separate pages
                        const handleSubItemClick = (e) => {
                          e.preventDefault();
                          e.stopPropagation(); // Prevent parent click
                          
                          // Always close sidebar on mobile/tablet when clicking submenu items
                          const isMobileOrTablet = typeof window !== 'undefined' && window.innerWidth < 1025;
                          const isMobile = isMobileOrTablet;
                          
                          try {
                            if (subItem.id === 'age-restrictions' || subItem.id === 'regional-laws' || subItem.id === 'legal-hold' || subItem.id === 'law-enforcement') {
                              navigate(`/admin/policy-compliance?tab=${subItem.id}`);
                              if (setActiveSubTab) setActiveSubTab(subItem.id);
                              if (isMobile) {
                                console.log('Closing sidebar on mobile after submenu navigation');
                                setIsOpen(false);
                              }
                              return;
                            }
                            if (subItem.id === 'roles' || subItem.id === 'activity-logs' || subItem.id === 'sessions') {
                              navigate(`/admin/security-settings?tab=${subItem.id}`);
                              if (setActiveSubTab) setActiveSubTab(subItem.id);
                              if (isMobile) {
                                console.log('Closing sidebar on mobile after submenu navigation');
                                setIsOpen(false);
                              }
                              return;
                            }
                            if (subItem.id === 'push-campaigns' || subItem.id === 'warnings') {
                              navigate(`/admin/notifications-control?tab=${subItem.id}`);
                              if (setActiveSubTab) setActiveSubTab(subItem.id);
                              if (isMobile) {
                                console.log('Closing sidebar on mobile after submenu navigation');
                                setIsOpen(false);
                              }
                              return;
                            }
                            
                            // Default behavior for other sub-items
                            if (setActiveTab) {
                              setActiveTab(item.id);
                            }
                            // Set subTab for tabs that use subTab state (moderation, safety, monetization, analytics, search, system, support)
                            const subTabId = (item.id === 'moderation' || item.id === 'safety' || item.id === 'monetization' || item.id === 'analytics' || item.id === 'search' || item.id === 'system' || item.id === 'support')
                              ? subItem.id 
                              : null;
                            if (setActiveSubTab && subTabId) {
                              setActiveSubTab(subTabId);
                            }
                            // Always close sidebar on mobile/tablet after clicking submenu item
                            if (isMobileOrTablet) {
                              console.log('Closing sidebar on mobile/tablet after submenu item click');
                              setIsOpen(false);
                            }
                          } catch (error) {
                            console.error('Error handling sub-item click:', error);
                          }
                        };
                        
                        return (
                          <button
                            key={subItem.id}
                            className={`admin-sidebar-sublink ${isSubActive ? 'active' : ''}`}
                            onClick={handleSubItemClick}
                            type="button"
                            style={{ 
                              pointerEvents: 'auto', 
                              touchAction: 'manipulation',
                              cursor: 'pointer',
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              width: '100%',
                              textAlign: 'left',
                              background: 'none',
                              border: 'none',
                              position: 'relative',
                              zIndex: 5
                            }}
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
        );
      })()}

      {/* Overlay for mobile - shows when sidebar is open */}
      {isOpen && typeof window !== 'undefined' && window.innerWidth < 1025 && (
        <div 
          className="admin-sidebar-overlay" 
          onClick={() => {
            console.log('Overlay clicked, closing sidebar');
            setIsOpen(false);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 99998,
            backdropFilter: 'blur(4px)',
            display: 'block'
          }}
        ></div>
      )}
    </>
  );
};

export default AdminSidebar;

