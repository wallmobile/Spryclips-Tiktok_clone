import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './BusinessTools.css';

const BusinessTools = ({ onClose }) => {
  const navigate = useNavigate();
  useAuth(); // Get auth context but don't need to destructure user
  
  const [businessStats] = useState({
    totalReach: 850000,
    adSpend: 1250.50,
    conversions: 342,
    partnerships: 8,
    promoCodesUsed: 156
  });

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
      status: 'Available'
    },
    {
      id: 'catalog',
      title: 'Product Catalog',
      description: 'Showcase your products',
      icon: 'fa-solid fa-store',
      status: 'Setup Required'
    },
    {
      id: 'messaging',
      title: 'Business Messaging',
      description: 'Professional customer support',
      icon: 'fa-solid fa-comments-dollar',
      status: 'Active'
    },
    {
      id: 'insights',
      title: 'Audience Insights',
      description: 'Understand your audience',
      icon: 'fa-solid fa-users-viewfinder',
      status: 'Available'
    }
  ];

  const handleSectionClick = (sectionId) => {
    switch (sectionId) {
      case 'suite':
        // Navigate to business suite or show business dashboard
        onClose();
        navigate('/more/growth-tools?section=business-suite');
        break;
      case 'ads':
        // Navigate to ad manager
        onClose();
        navigate('/more/growth-tools?section=ad-manager');
        break;
      case 'biolink':
        // Navigate to profile settings for bio link
        onClose();
        navigate('/profile?tab=bio-link');
        break;
      case 'promo':
        // Navigate to promotional codes
        onClose();
        navigate('/more/growth-tools?section=promo-codes');
        break;
      case 'partnerships':
        // Navigate to brand partnerships
        onClose();
        navigate('/more/growth-tools?section=partnerships');
        break;
      case 'analytics':
        // Navigate to business analytics
        onClose();
        navigate('/more/growth-tools?section=analytics');
        break;
      default:
        break;
    }
  };

  const handleFeatureClick = (featureId) => {
    switch (featureId) {
      case 'verification':
        // Navigate to verification page
        onClose();
        navigate('/profile?tab=verification');
        break;
      case 'catalog':
        // Navigate to product catalog setup
        onClose();
        navigate('/more/shop?setup=catalog');
        break;
      case 'messaging':
        // Navigate to business messaging (message center)
        onClose();
        navigate('/more?section=messaging');
        break;
      case 'insights':
        // Navigate to audience insights
        onClose();
        navigate('/more/growth-tools?section=insights');
        break;
      default:
        break;
    }
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

        {/* Full Page Scrollable Content */}
        <div className="business-tools-content">
          {/* Business Stats Overview */}
          <div className="business-stats-overview">
            <div className="business-stats-card">
              <div className="business-stat-item">
                <span className="business-stat-number">{(businessStats.totalReach / 1000).toFixed(0)}K</span>
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
                <span className="business-stat-number">{businessStats.partnerships}</span>
                <span className="business-stat-label">Partnerships</span>
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
                    <span className={`status-badge ${feature.status.toLowerCase().replace(' ', '-')}`}>
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
      </div>
    </div>
  );
};

export default BusinessTools;














