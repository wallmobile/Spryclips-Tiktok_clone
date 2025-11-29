import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getBusinessDashboard } from '../api/business';
import './BusinessTools.css';

const BusinessTools = ({ onClose }) => {
  const navigate = useNavigate();
  useAuth(); // Auth check
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  const [businessStats, setBusinessStats] = useState({
    totalReach: 0,
    adSpend: 0,
    conversions: 0,
    partnerships: 0,
    promoCodesUsed: 0
  });
  
  // Feature statuses from backend
  const [featureStatuses, setFeatureStatuses] = useState({
    verification: { status: 'Loading...', type: 'pending' },
    catalog: { status: 'Loading...', type: 'pending' },
    messaging: { status: 'Loading...', type: 'pending' },
    insights: { status: 'Loading...', type: 'pending' }
  });

  // Fetch business dashboard data
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await getBusinessDashboard();
        if (response.success) {
          const dashboard = response.dashboard;
          
          setBusinessStats({
            totalReach: dashboard.stats?.totalReach || 0,
            adSpend: dashboard.stats?.adSpend || 0,
            conversions: dashboard.stats?.totalConversions || 0,
            partnerships: dashboard.campaigns?.active || 0,
            promoCodesUsed: dashboard.promoCodes?.totalUses || 0
          });
          
          // Set real feature statuses based on backend data
          setFeatureStatuses({
            verification: {
              status: dashboard.profile?.verificationStatus === 'approved' ? 'Verified' :
                      dashboard.profile?.verificationStatus === 'pending' ? 'Pending' :
                      dashboard.profile?.verificationStatus === 'rejected' ? 'Rejected' : 'Available',
              type: dashboard.profile?.verificationStatus === 'approved' ? 'success' :
                    dashboard.profile?.verificationStatus === 'pending' ? 'warning' :
                    dashboard.profile?.verificationStatus === 'rejected' ? 'error' : 'info'
            },
            catalog: {
              status: dashboard.products?.count > 0 ? `${dashboard.products?.count} Products` : 'Setup Required',
              type: dashboard.products?.count > 0 ? 'success' : 'warning'
            },
            messaging: {
              status: dashboard.messaging?.unread > 0 ? `${dashboard.messaging?.unread} Unread` : 
                      dashboard.messaging?.enabled ? 'Active' : 'Setup Required',
              type: dashboard.messaging?.unread > 0 ? 'alert' : 
                    dashboard.messaging?.enabled ? 'success' : 'warning'
            },
            insights: {
              status: dashboard.stats?.totalReach > 0 ? 'Data Available' : 'Available',
              type: dashboard.stats?.totalReach > 0 ? 'success' : 'info'
            }
          });
        }
      } catch (error) {
        console.error('Failed to fetch business dashboard:', error);
        setToast({ type: 'error', message: 'Failed to load business data' });
        setTimeout(() => setToast(null), 3000);
        
        // Set default statuses on error
        setFeatureStatuses({
          verification: { status: 'Available', type: 'info' },
          catalog: { status: 'Setup Required', type: 'warning' },
          messaging: { status: 'Available', type: 'info' },
          insights: { status: 'Available', type: 'info' }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const businessSections = [
    {
      id: 'suite',
      title: 'Business Suite',
      description: 'Complete business dashboard and content management',
      icon: 'fa-solid fa-briefcase',
      color: 'business-primary',
      stats: 'Manage Business',
      featured: true
    },
    {
      id: 'ads',
      title: 'Ad Manager',
      description: 'Create and manage advertising campaigns',
      icon: 'fa-solid fa-bullseye',
      color: 'business-secondary',
      stats: `$${businessStats.adSpend.toFixed(0)} Spent`
    },
    {
      id: 'biolink',
      title: 'Website Link in Bio',
      description: 'Drive traffic to your website and landing pages',
      icon: 'fa-solid fa-link',
      color: 'business-tertiary',
      stats: 'Add Link'
    },
    {
      id: 'promo',
      title: 'Promotional Codes',
      description: 'Create discount codes and track usage',
      icon: 'fa-solid fa-ticket',
      color: 'business-quaternary',
      stats: `${businessStats.promoCodesUsed} Used`
    },
    {
      id: 'partnerships',
      title: 'Brand Partnerships',
      description: 'Connect with brands and manage collaborations',
      icon: 'fa-solid fa-handshake',
      color: 'business-quinary',
      stats: `${businessStats.partnerships} Active`
    },
    {
      id: 'analytics',
      title: 'Business Analytics',
      description: 'Advanced insights and performance metrics',
      icon: 'fa-solid fa-chart-pie',
      color: 'business-primary',
      stats: `${(businessStats.totalReach / 1000).toFixed(0)}K Reach`
    }
  ];

  const businessFeatures = [
    {
      id: 'verification',
      title: 'Business Verification',
      description: 'Get verified business badge',
      icon: 'fa-solid fa-certificate',
      status: featureStatuses.verification.status,
      statusType: featureStatuses.verification.type
    },
    {
      id: 'catalog',
      title: 'Product Catalog',
      description: 'Showcase your products',
      icon: 'fa-solid fa-store',
      status: featureStatuses.catalog.status,
      statusType: featureStatuses.catalog.type
    },
    {
      id: 'messaging',
      title: 'Business Messaging',
      description: 'Professional customer support',
      icon: 'fa-solid fa-comments-dollar',
      status: featureStatuses.messaging.status,
      statusType: featureStatuses.messaging.type
    },
    {
      id: 'insights',
      title: 'Audience Insights',
      description: 'Understand your audience',
      icon: 'fa-solid fa-users-viewfinder',
      status: featureStatuses.insights.status,
      statusType: featureStatuses.insights.type
    }
  ];

  const handleSectionClick = (sectionId) => {
    switch (sectionId) {
      case 'suite':
        // Navigate to business suite
        onClose();
        navigate('/more/business-suite');
        break;
      case 'ads':
        // Navigate to ad manager
        onClose();
        navigate('/more/ad-manager');
        break;
      case 'biolink':
        // Navigate to Business Suite bio link tab
        onClose();
        navigate('/more/business-suite?tab=biolink');
        break;
      case 'promo':
        // Navigate to Business Suite promo codes tab
        onClose();
        navigate('/more/business-suite?tab=promo');
        break;
      case 'partnerships':
        // Navigate to Business Suite partnerships tab
        onClose();
        navigate('/more/business-suite?tab=partnerships');
        break;
      case 'analytics':
        // Navigate to Business Suite analytics tab
        onClose();
        navigate('/more/business-suite?tab=analytics');
        break;
      default:
        break;
    }
  };

  const handleFeatureClick = (featureId) => {
    switch (featureId) {
      case 'verification':
        // Navigate to Business Suite settings for verification
        onClose();
        navigate('/more/business-suite?tab=settings');
        break;
      case 'catalog':
        // Navigate to Product Catalog page
        onClose();
        navigate('/more/product-catalog');
        break;
      case 'messaging':
        // Navigate to Business Messaging page
        onClose();
        navigate('/more/business-messaging');
        break;
      case 'insights':
        // Navigate to Audience Insights (analytics tab)
        onClose();
        navigate('/more/business-suite?tab=analytics');
        break;
      default:
        break;
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="business-tools-overlay" onClick={onClose}>
      <div className="business-tools-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="business-tools-header">
          <button className="business-tools-close-btn" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-x"></i>
          </button>
          <h2>Business Tools</h2>
          <div className="business-tools-header-placeholder"></div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className={`business-toast ${toast.type}`}>
            {toast.message}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="business-loading">
            <i className="fa-solid fa-spinner"></i>
            <p>Loading business data...</p>
          </div>
        ) : (
        /* Full Page Scrollable Content */
        <div className="business-tools-content">
          {/* Business Stats Overview */}
          <div className="business-stats-overview">
            <div className="business-stats-card">
              <div className="business-stat-item">
                <span className="business-stat-number">{formatNumber(businessStats.totalReach)}</span>
                <span className="business-stat-label">Total Reach</span>
              </div>
              <div className="business-stat-item">
                <span className="business-stat-number">${businessStats.adSpend.toFixed(0)}</span>
                <span className="business-stat-label">Ad Spend</span>
              </div>
              <div className="business-stat-item">
                <span className="business-stat-number">{businessStats.conversions}</span>
                <span className="business-stat-label">Conversions</span>
              </div>
              <div className="business-stat-item">
                <span className="business-stat-number">{businessStats.promoCodesUsed}</span>
                <span className="business-stat-label">Promo Uses</span>
              </div>
            </div>
          </div>
          {/* Main Business Tools */}
          <div className="business-section">
            <h3>Business Management</h3>
            <div className="business-tools-grid">
              {businessSections.map(section => (
                <div
                  key={section.id}
                  className={`business-tool-card ${section.color} ${section.featured ? 'featured' : ''}`}
                  onClick={() => handleSectionClick(section.id)}
                >
                  <div className="business-card-header">
                    <div className="business-tool-icon">
                      <i className={section.icon}></i>
                    </div>
                    <div className="business-tool-stats">
                      {section.stats}
                    </div>
                  </div>
                  <div className="business-card-content">
                    <h4>{section.title}</h4>
                    <p>{section.description}</p>
                  </div>
                  <div className="business-card-footer">
                    <span className="open-business-tool">
                      Open <i className="fa-solid fa-arrow-right"></i>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Business Features */}
          <div className="business-section">
            <h3>Additional Features</h3>
            <div className="business-features-grid">
              {businessFeatures.map(feature => (
                <div
                  key={feature.id}
                  className="business-feature-card"
                  onClick={() => handleFeatureClick(feature.id)}
                >
                  <div className="business-feature-icon">
                    <i className={feature.icon}></i>
                  </div>
                  <div className="business-feature-content">
                    <h5>{feature.title}</h5>
                    <p>{feature.description}</p>
                  </div>
                  <div className="business-feature-status">
                    <span className={`status-badge ${feature.statusType || 'info'}`}>
                      {feature.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Business Growth Tips */}
          <div className="business-section">
            <h3>Growth Tips</h3>
            <div className="business-tips-grid">
              <div className="business-tip-card">
                <i className="fa-solid fa-rocket"></i>
                <div className="business-tip-content">
                  <h5>Boost Engagement</h5>
                  <p>Use trending sounds and hashtags to increase visibility</p>
                </div>
              </div>
              <div className="business-tip-card">
                <i className="fa-solid fa-target"></i>
                <div className="business-tip-content">
                  <h5>Target Audience</h5>
                  <p>Use detailed targeting in ads for better ROI</p>
                </div>
              </div>
              <div className="business-tip-card">
                <i className="fa-solid fa-chart-line"></i>
                <div className="business-tip-content">
                  <h5>Track Performance</h5>
                  <p>Monitor analytics daily to optimize content strategy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default BusinessTools;














