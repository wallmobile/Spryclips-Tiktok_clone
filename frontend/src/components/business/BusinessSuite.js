import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getBusinessDashboard,
  getBusinessProfile,
  updateBusinessProfile,
  applyForVerification,
  updateBioLink,
  getCampaigns,
  createCampaign,
  updateCampaignStatus,
  deleteCampaign,
  getPromoCodes,
  createPromoCode,
  togglePromoCode,
  deletePromoCode,
  getBusinessAnalytics,
  getPartnerships,
  createPartnershipApplication
} from '../../api/business';
import './BusinessSuite.css';

const BusinessSuite = ({ onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  // Dashboard Data
  const [dashboard, setDashboard] = useState(null);
  const [profile, setProfile] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [partnerships, setPartnerships] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  
  // Form States
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [showPartnershipForm, setShowPartnershipForm] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  
  // Partnership form
  const [partnershipForm, setPartnershipForm] = useState({
    brandName: '',
    contactEmail: '',
    campaignType: 'sponsored_post',
    budget: '',
    description: '',
    deliverables: ''
  });
  
  // Form Data
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    objective: 'awareness',
    budget: 50,
    dailyBudget: 10,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    targeting: { ageMin: 18, ageMax: 65, gender: 'all' },
    creative: { headline: '', description: '', callToAction: 'Learn More', destinationUrl: '' }
  });
  
  const [promoForm, setPromoForm] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: 10,
    maxUses: 100,
    minPurchase: 0,
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  
  const [profileForm, setProfileForm] = useState({
    businessName: '',
    businessType: 'individual',
    industry: '',
    description: '',
    website: ''
  });
  
  const [bioLinkForm, setBioLinkForm] = useState({
    enabled: false,
    url: '',
    title: ''
  });

  // Show Toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch Dashboard Data
  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, profileRes, campaignsRes, promoRes, partnershipsRes, analyticsRes] = await Promise.all([
        getBusinessDashboard(),
        getBusinessProfile(),
        getCampaigns(),
        getPromoCodes(),
        getPartnerships(),
        getBusinessAnalytics(30)
      ]);
      
      if (dashRes.success) setDashboard(dashRes.dashboard);
      if (profileRes.success) {
        setProfile(profileRes.profile);
        setProfileForm({
          businessName: profileRes.profile.businessName || '',
          businessType: profileRes.profile.businessType || 'individual',
          industry: profileRes.profile.industry || '',
          description: profileRes.profile.description || '',
          website: profileRes.profile.website || ''
        });
        setBioLinkForm({
          enabled: profileRes.profile.bioLink?.enabled || false,
          url: profileRes.profile.bioLink?.url || '',
          title: profileRes.profile.bioLink?.title || ''
        });
      }
      if (campaignsRes.success) setCampaigns(campaignsRes.campaigns);
      if (promoRes.success) setPromoCodes(promoRes.promoCodes);
      if (partnershipsRes.success) setPartnerships(partnershipsRes.partnerships);
      if (analyticsRes.success) setAnalytics(analyticsRes);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      showToast('Failed to load business data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Profile Actions
  const handleUpdateProfile = async () => {
    try {
      const response = await updateBusinessProfile(profileForm);
      if (response.success) {
        setProfile(response.profile);
        setShowProfileForm(false);
        showToast('Profile updated successfully!');
      }
    } catch (error) {
      showToast('Failed to update profile', 'error');
    }
  };

  const handleApplyVerification = async () => {
    try {
      const response = await applyForVerification();
      if (response.success) {
        setProfile(response.profile);
        showToast('Verification application submitted!');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to apply', 'error');
    }
  };

  const handleUpdateBioLink = async () => {
    try {
      const response = await updateBioLink(bioLinkForm);
      if (response.success) {
        showToast('Bio link updated!');
        fetchDashboard();
      }
    } catch (error) {
      showToast('Failed to update bio link', 'error');
    }
  };

  // Campaign Actions
  const handleCreateCampaign = async () => {
    try {
      if (!campaignForm.name || campaignForm.budget < 10) {
        showToast('Please fill all required fields', 'error');
        return;
      }
      const response = await createCampaign(campaignForm);
      if (response.success) {
        setCampaigns([response.campaign, ...campaigns]);
        setShowCampaignForm(false);
        resetCampaignForm();
        showToast('Campaign created successfully!');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to create campaign', 'error');
    }
  };

  const handleCampaignStatus = async (id, status) => {
    try {
      const response = await updateCampaignStatus(id, status);
      if (response.success) {
        setCampaigns(campaigns.map(c => c._id === id ? response.campaign : c));
        showToast(`Campaign ${status}!`);
      }
    } catch (error) {
      showToast('Failed to update campaign', 'error');
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    try {
      const response = await deleteCampaign(id);
      if (response.success) {
        setCampaigns(campaigns.filter(c => c._id !== id));
        showToast(`Campaign deleted. Refunded: $${response.refunded?.toFixed(2) || 0}`);
      }
    } catch (error) {
      showToast('Failed to delete campaign', 'error');
    }
  };

  const resetCampaignForm = () => {
    setCampaignForm({
      name: '',
      objective: 'awareness',
      budget: 50,
      dailyBudget: 10,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      targeting: { ageMin: 18, ageMax: 65, gender: 'all' },
      creative: { headline: '', description: '', callToAction: 'Learn More', destinationUrl: '' }
    });
  };

  // Promo Code Actions
  const handleCreatePromoCode = async () => {
    try {
      if (!promoForm.code || promoForm.discountValue <= 0) {
        showToast('Please fill all required fields', 'error');
        return;
      }
      const response = await createPromoCode(promoForm);
      if (response.success) {
        setPromoCodes([response.promoCode, ...promoCodes]);
        setShowPromoForm(false);
        resetPromoForm();
        showToast('Promo code created!');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to create promo code', 'error');
    }
  };

  const handleTogglePromo = async (id) => {
    try {
      const response = await togglePromoCode(id);
      if (response.success) {
        setPromoCodes(promoCodes.map(p => p._id === id ? response.promoCode : p));
        showToast(response.message);
      }
    } catch (error) {
      showToast('Failed to toggle promo code', 'error');
    }
  };

  const handleDeletePromo = async (id) => {
    if (!window.confirm('Delete this promo code?')) return;
    try {
      const response = await deletePromoCode(id);
      if (response.success) {
        setPromoCodes(promoCodes.filter(p => p._id !== id));
        showToast('Promo code deleted');
      }
    } catch (error) {
      showToast('Failed to delete promo code', 'error');
    }
  };

  // Partnership handlers
  const handleCreatePartnership = async () => {
    if (!partnershipForm.brandName) {
      showToast('Please enter brand name', 'error');
      return;
    }
    try {
      const response = await createPartnershipApplication(partnershipForm);
      if (response.success) {
        setPartnerships([response.partnership, ...partnerships]);
        setShowPartnershipForm(false);
        setPartnershipForm({
          brandName: '',
          contactEmail: '',
          campaignType: 'sponsored_post',
          budget: '',
          description: '',
          deliverables: ''
        });
        showToast('Partnership application submitted! 🤝');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to submit', 'error');
    }
  };

  const resetPromoForm = () => {
    setPromoForm({
      code: '',
      discountType: 'percentage',
      discountValue: 10,
      maxUses: 100,
      minPurchase: 0,
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  };

  const generatePromoCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPromoForm({ ...promoForm, code });
  };

  // Helpers
  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: '#9CA3AF',
      pending: '#F59E0B',
      active: '#10B981',
      paused: '#6366F1',
      completed: '#3B82F6',
      rejected: '#EF4444'
    };
    return colors[status] || '#9CA3AF';
  };

  // Tabs
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-home' },
    { id: 'campaigns', label: 'Campaigns', icon: 'fa-bullseye' },
    { id: 'promo', label: 'Promo Codes', icon: 'fa-ticket' },
    { id: 'partnerships', label: 'Partnerships', icon: 'fa-handshake' },
    { id: 'biolink', label: 'Bio Link', icon: 'fa-link' },
    { id: 'analytics', label: 'Analytics', icon: 'fa-chart-line' },
    { id: 'settings', label: 'Settings', icon: 'fa-cog' }
  ];

  // Render Dashboard Tab
  const renderDashboard = () => (
    <div className="bs-dashboard">
      {/* Stats Cards */}
      <div className="bs-stats-grid">
        <div className="bs-stat-card primary">
          <div className="bs-stat-icon"><i className="fa-solid fa-eye"></i></div>
          <div className="bs-stat-info">
            <span className="bs-stat-value">{formatNumber(dashboard?.stats?.totalReach || 0)}</span>
            <span className="bs-stat-label">Total Reach</span>
          </div>
        </div>
        <div className="bs-stat-card secondary">
          <div className="bs-stat-icon"><i className="fa-solid fa-mouse-pointer"></i></div>
          <div className="bs-stat-info">
            <span className="bs-stat-value">{formatNumber(dashboard?.stats?.totalClicks || 0)}</span>
            <span className="bs-stat-label">Total Clicks</span>
          </div>
        </div>
        <div className="bs-stat-card tertiary">
          <div className="bs-stat-icon"><i className="fa-solid fa-shopping-cart"></i></div>
          <div className="bs-stat-info">
            <span className="bs-stat-value">{formatNumber(dashboard?.stats?.totalConversions || 0)}</span>
            <span className="bs-stat-label">Conversions</span>
          </div>
        </div>
        <div className="bs-stat-card quaternary">
          <div className="bs-stat-icon"><i className="fa-solid fa-dollar-sign"></i></div>
          <div className="bs-stat-info">
            <span className="bs-stat-value">${(dashboard?.stats?.adSpend || 0).toFixed(0)}</span>
            <span className="bs-stat-label">Ad Spend</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bs-section">
        <h3>Quick Actions</h3>
        <div className="bs-quick-actions">
          <button className="bs-action-btn" onClick={() => { setActiveTab('campaigns'); setShowCampaignForm(true); }}>
            <i className="fa-solid fa-plus"></i>
            <span>New Campaign</span>
          </button>
          <button className="bs-action-btn" onClick={() => { setActiveTab('promo'); setShowPromoForm(true); }}>
            <i className="fa-solid fa-ticket"></i>
            <span>Create Promo</span>
          </button>
          <button className="bs-action-btn" onClick={() => setActiveTab('biolink')}>
            <i className="fa-solid fa-link"></i>
            <span>Edit Bio Link</span>
          </button>
          <button className="bs-action-btn" onClick={() => setActiveTab('analytics')}>
            <i className="fa-solid fa-chart-pie"></i>
            <span>View Analytics</span>
          </button>
        </div>
      </div>

      {/* Profile Summary */}
      <div className="bs-section">
        <h3>Business Profile</h3>
        <div className="bs-profile-card">
          <div className="bs-profile-header">
            <div className="bs-profile-avatar">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="Profile" />
              ) : (
                <i className="fa-solid fa-building"></i>
              )}
              {profile?.isVerified && (
                <div className="bs-verified-badge">
                  <i className="fa-solid fa-check"></i>
                </div>
              )}
            </div>
            <div className="bs-profile-info">
              <h4>{profile?.businessName || user?.username || 'Business Name'}</h4>
              <span className="bs-profile-type">{profile?.businessType?.replace('_', ' ') || 'Individual'}</span>
              {profile?.industry && <span className="bs-profile-industry">{profile.industry}</span>}
            </div>
            <div className="bs-verification-status">
              {profile?.isVerified ? (
                <span className="bs-badge verified"><i className="fa-solid fa-certificate"></i> Verified</span>
              ) : profile?.verificationStatus === 'pending' ? (
                <span className="bs-badge pending"><i className="fa-solid fa-clock"></i> Pending</span>
              ) : (
                <button className="bs-verify-btn" onClick={handleApplyVerification}>
                  <i className="fa-solid fa-certificate"></i> Get Verified
                </button>
              )}
            </div>
          </div>
          {profile?.description && (
            <p className="bs-profile-desc">{profile.description}</p>
          )}
          <div className="bs-profile-actions">
            <button onClick={() => setShowProfileForm(true)}>
              <i className="fa-solid fa-edit"></i> Edit Profile
            </button>
          </div>
          {profile?.verificationStatus === 'pending' && (
            <div className="bs-verification-pending-notice">
              <i className="fa-solid fa-hourglass-half"></i>
              <div>
                <strong>Verification Under Review</strong>
                <p>Our team is reviewing your application. This usually takes 2-3 business days.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="bs-section">
        <div className="bs-section-header">
          <h3>Recent Campaigns</h3>
          <button onClick={() => setActiveTab('campaigns')}>View All <i className="fa-solid fa-arrow-right"></i></button>
        </div>
        {campaigns.length > 0 ? (
          <div className="bs-campaign-list">
            {campaigns.slice(0, 3).map(campaign => (
              <div key={campaign._id} className="bs-campaign-item">
                <div className="bs-campaign-status" style={{ backgroundColor: getStatusColor(campaign.status) }}></div>
                <div className="bs-campaign-info">
                  <h5>{campaign.name}</h5>
                  <span>{campaign.objective} • ${campaign.spent?.toFixed(2) || 0} / ${campaign.budget}</span>
                </div>
                <div className="bs-campaign-metrics">
                  <span><i className="fa-solid fa-eye"></i> {formatNumber(campaign.performance?.impressions || 0)}</span>
                  <span><i className="fa-solid fa-mouse-pointer"></i> {formatNumber(campaign.performance?.clicks || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bs-empty-state">
            <i className="fa-solid fa-bullseye"></i>
            <p>No campaigns yet. Create your first campaign!</p>
            <button onClick={() => { setActiveTab('campaigns'); setShowCampaignForm(true); }}>
              Create Campaign
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Render Campaigns Tab
  const renderCampaigns = () => (
    <div className="bs-campaigns">
      <div className="bs-section-header">
        <h3>Ad Campaigns ({campaigns.length})</h3>
        <button className="bs-primary-btn" onClick={() => setShowCampaignForm(true)}>
          <i className="fa-solid fa-plus"></i> New Campaign
        </button>
      </div>

      {/* Campaign Form Modal */}
      {showCampaignForm && (
        <div className="bs-modal-overlay" onClick={() => setShowCampaignForm(false)}>
          <div className="bs-modal" onClick={e => e.stopPropagation()}>
            <div className="bs-modal-header">
              <h3>Create Campaign</h3>
              <button onClick={() => setShowCampaignForm(false)}><i className="fa-solid fa-times"></i></button>
            </div>
            <div className="bs-modal-body">
              <div className="bs-form-group">
                <label>Campaign Name *</label>
                <input
                  type="text"
                  value={campaignForm.name}
                  onChange={e => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  placeholder="My Awesome Campaign"
                />
              </div>
              <div className="bs-form-row">
                <div className="bs-form-group">
                  <label>Objective</label>
                  <select
                    value={campaignForm.objective}
                    onChange={e => setCampaignForm({ ...campaignForm, objective: e.target.value })}
                  >
                    <option value="awareness">Brand Awareness</option>
                    <option value="traffic">Website Traffic</option>
                    <option value="engagement">Engagement</option>
                    <option value="conversions">Conversions</option>
                    <option value="app_installs">App Installs</option>
                  </select>
                </div>
                <div className="bs-form-group">
                  <label>Total Budget ($) *</label>
                  <input
                    type="number"
                    min="10"
                    value={campaignForm.budget}
                    onChange={e => setCampaignForm({ ...campaignForm, budget: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="bs-form-row">
                <div className="bs-form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={campaignForm.startDate}
                    onChange={e => setCampaignForm({ ...campaignForm, startDate: e.target.value })}
                  />
                </div>
                <div className="bs-form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={campaignForm.endDate}
                    onChange={e => setCampaignForm({ ...campaignForm, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="bs-form-group">
                <label>Headline</label>
                <input
                  type="text"
                  value={campaignForm.creative.headline}
                  onChange={e => setCampaignForm({
                    ...campaignForm,
                    creative: { ...campaignForm.creative, headline: e.target.value }
                  })}
                  placeholder="Check out our amazing products!"
                />
              </div>
              <div className="bs-form-group">
                <label>Destination URL</label>
                <input
                  type="url"
                  value={campaignForm.creative.destinationUrl}
                  onChange={e => setCampaignForm({
                    ...campaignForm,
                    creative: { ...campaignForm.creative, destinationUrl: e.target.value }
                  })}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
            <div className="bs-modal-footer">
              <button className="bs-secondary-btn" onClick={() => setShowCampaignForm(false)}>Cancel</button>
              <button className="bs-primary-btn" onClick={handleCreateCampaign}>Create Campaign</button>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns List */}
      {campaigns.length > 0 ? (
        <div className="bs-campaigns-grid">
          {campaigns.map(campaign => (
            <div key={campaign._id} className="bs-campaign-card">
              <div className="bs-campaign-card-header">
                <span className="bs-campaign-badge" style={{ backgroundColor: getStatusColor(campaign.status) }}>
                  {campaign.status}
                </span>
                <div className="bs-campaign-actions">
                  <button onClick={() => handleDeleteCampaign(campaign._id)} title="Delete Campaign">
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
              <h4>{campaign.name}</h4>
              <p className="bs-campaign-objective">{campaign.objective?.replace('_', ' ')}</p>
              
              <div className="bs-campaign-budget">
                <div className="bs-budget-bar">
                  <div 
                    className="bs-budget-progress" 
                    style={{ width: `${(campaign.spent / campaign.budget) * 100}%` }}
                  ></div>
                </div>
                <span>${campaign.spent?.toFixed(2) || 0} / ${campaign.budget}</span>
              </div>

              <div className="bs-campaign-stats">
                <div className="bs-stat">
                  <span className="bs-stat-num">{formatNumber(campaign.performance?.impressions || 0)}</span>
                  <span className="bs-stat-lbl">Impressions</span>
                </div>
                <div className="bs-stat">
                  <span className="bs-stat-num">{formatNumber(campaign.performance?.clicks || 0)}</span>
                  <span className="bs-stat-lbl">Clicks</span>
                </div>
                <div className="bs-stat">
                  <span className="bs-stat-num">{(campaign.performance?.ctr || 0).toFixed(2)}%</span>
                  <span className="bs-stat-lbl">CTR</span>
                </div>
              </div>

              <div className="bs-campaign-controls">
                {campaign.status === 'active' ? (
                  <button onClick={() => handleCampaignStatus(campaign._id, 'paused')}>
                    <i className="fa-solid fa-pause"></i> Pause
                  </button>
                ) : campaign.status === 'paused' || campaign.status === 'pending' ? (
                  <button onClick={() => handleCampaignStatus(campaign._id, 'active')}>
                    <i className="fa-solid fa-play"></i> Activate
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bs-empty-state large">
          <i className="fa-solid fa-bullseye"></i>
          <h4>No Campaigns Yet</h4>
          <p>Create your first ad campaign to start reaching more customers</p>
          <button className="bs-primary-btn" onClick={() => setShowCampaignForm(true)}>
            <i className="fa-solid fa-plus"></i> Create Campaign
          </button>
        </div>
      )}
    </div>
  );

  // Render Promo Codes Tab
  const renderPromoCodes = () => (
    <div className="bs-promo">
      <div className="bs-section-header">
        <h3>Promo Codes ({promoCodes.length})</h3>
        <button className="bs-primary-btn" onClick={() => setShowPromoForm(true)}>
          <i className="fa-solid fa-plus"></i> Create Code
        </button>
      </div>

      {/* Promo Form Modal */}
      {showPromoForm && (
        <div className="bs-modal-overlay" onClick={() => setShowPromoForm(false)}>
          <div className="bs-modal" onClick={e => e.stopPropagation()}>
            <div className="bs-modal-header">
              <h3>Create Promo Code</h3>
              <button onClick={() => setShowPromoForm(false)}><i className="fa-solid fa-times"></i></button>
            </div>
            <div className="bs-modal-body">
              <div className="bs-form-group">
                <label>Promo Code *</label>
                <div className="bs-input-with-btn">
                  <input
                    type="text"
                    value={promoForm.code}
                    onChange={e => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                    placeholder="SUMMER2024"
                    maxLength={15}
                  />
                  <button type="button" onClick={generatePromoCode}>Generate</button>
                </div>
              </div>
              <div className="bs-form-row">
                <div className="bs-form-group">
                  <label>Discount Type</label>
                  <select
                    value={promoForm.discountType}
                    onChange={e => setPromoForm({ ...promoForm, discountType: e.target.value })}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>
                <div className="bs-form-group">
                  <label>Discount Value *</label>
                  <input
                    type="number"
                    min="1"
                    max={promoForm.discountType === 'percentage' ? 100 : 1000}
                    value={promoForm.discountValue}
                    onChange={e => setPromoForm({ ...promoForm, discountValue: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="bs-form-row">
                <div className="bs-form-group">
                  <label>Max Uses</label>
                  <input
                    type="number"
                    min="1"
                    value={promoForm.maxUses}
                    onChange={e => setPromoForm({ ...promoForm, maxUses: parseInt(e.target.value) || 100 })}
                  />
                </div>
                <div className="bs-form-group">
                  <label>Min Purchase ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={promoForm.minPurchase}
                    onChange={e => setPromoForm({ ...promoForm, minPurchase: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="bs-form-group">
                <label>Expiry Date *</label>
                <input
                  type="date"
                  value={promoForm.endDate}
                  onChange={e => setPromoForm({ ...promoForm, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="bs-modal-footer">
              <button className="bs-secondary-btn" onClick={() => setShowPromoForm(false)}>Cancel</button>
              <button className="bs-primary-btn" onClick={handleCreatePromoCode}>Create Code</button>
            </div>
          </div>
        </div>
      )}

      {/* Promo Codes List */}
      {promoCodes.length > 0 ? (
        <div className="bs-promo-grid">
          {promoCodes.map(promo => (
            <div key={promo._id} className={`bs-promo-card ${!promo.isActive ? 'inactive' : ''}`}>
              <div className="bs-promo-header">
                <span className={`bs-promo-status ${promo.isActive ? 'active' : 'inactive'}`}>
                  {promo.isActive ? 'Active' : 'Inactive'}
                </span>
                <div className="bs-promo-actions">
                  <button onClick={() => handleTogglePromo(promo._id)} title={promo.isActive ? 'Deactivate' : 'Activate'}>
                    <i className={`fa-solid fa-${promo.isActive ? 'pause' : 'play'}`}></i>
                  </button>
                  <button onClick={() => handleDeletePromo(promo._id)} title="Delete">
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
              <div className="bs-promo-code">
                <span>{promo.code}</span>
                <button onClick={() => { navigator.clipboard.writeText(promo.code); showToast('Copied!'); }}>
                  <i className="fa-solid fa-copy"></i>
                </button>
              </div>
              <div className="bs-promo-discount">
                {promo.discountType === 'percentage' ? `${promo.discountValue}% OFF` : `$${promo.discountValue} OFF`}
              </div>
              <div className="bs-promo-details">
                <span><i className="fa-solid fa-users"></i> {promo.currentUses} / {promo.maxUses} uses</span>
                <span><i className="fa-solid fa-calendar"></i> Expires {formatDate(promo.endDate)}</span>
                {promo.minPurchase > 0 && (
                  <span><i className="fa-solid fa-tag"></i> Min: ${promo.minPurchase}</span>
                )}
              </div>
              <div className="bs-promo-progress">
                <div 
                  className="bs-promo-progress-bar" 
                  style={{ width: `${(promo.currentUses / promo.maxUses) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bs-empty-state large">
          <i className="fa-solid fa-ticket"></i>
          <h4>No Promo Codes Yet</h4>
          <p>Create promotional codes to boost your sales</p>
          <button className="bs-primary-btn" onClick={() => setShowPromoForm(true)}>
            <i className="fa-solid fa-plus"></i> Create Code
          </button>
        </div>
      )}
    </div>
  );

  // Render Bio Link Tab
  const renderBioLink = () => (
    <div className="bs-biolink">
      <div className="bs-section">
        <h3>Website Link in Bio</h3>
        <p className="bs-section-desc">Add a clickable link to your profile that directs visitors to your website</p>
        
        <div className="bs-biolink-card">
          <div className="bs-biolink-preview">
            <div className="bs-biolink-phone">
              <div className="bs-phone-header">
                <div className="bs-phone-notch"></div>
              </div>
              <div className="bs-phone-content">
                <div className="bs-profile-preview">
                  <div className="bs-avatar-preview">
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt="Profile" />
                    ) : (
                      <i className="fa-solid fa-user"></i>
                    )}
                  </div>
                  <h5>@{user?.username || 'username'}</h5>
                  {bioLinkForm.enabled && bioLinkForm.url && (
                    <a className="bs-biolink-btn-preview" href={bioLinkForm.url} target="_blank" rel="noreferrer">
                      <i className="fa-solid fa-link"></i>
                      {bioLinkForm.title || 'Visit Website'}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bs-biolink-form">
            <div className="bs-form-group">
              <label className="bs-toggle-label">
                <span>Enable Bio Link</span>
                <label className="bs-switch">
                  <input
                    type="checkbox"
                    checked={bioLinkForm.enabled}
                    onChange={e => setBioLinkForm({ ...bioLinkForm, enabled: e.target.checked })}
                  />
                  <span className="bs-slider"></span>
                </label>
              </label>
            </div>
            
            <div className="bs-form-group">
              <label>Link Title</label>
              <input
                type="text"
                value={bioLinkForm.title}
                onChange={e => setBioLinkForm({ ...bioLinkForm, title: e.target.value })}
                placeholder="Visit My Website"
                disabled={!bioLinkForm.enabled}
              />
            </div>
            
            <div className="bs-form-group">
              <label>Website URL</label>
              <input
                type="url"
                value={bioLinkForm.url}
                onChange={e => setBioLinkForm({ ...bioLinkForm, url: e.target.value })}
                placeholder="https://yourwebsite.com"
                disabled={!bioLinkForm.enabled}
              />
            </div>
            
            <button 
              className="bs-primary-btn" 
              onClick={handleUpdateBioLink}
              disabled={bioLinkForm.enabled && !bioLinkForm.url}
            >
              <i className="fa-solid fa-save"></i> Save Changes
            </button>

            {profile?.bioLink?.clicks > 0 && (
              <div className="bs-biolink-stats">
                <div className="bs-stat-item">
                  <i className="fa-solid fa-mouse-pointer"></i>
                  <span>{formatNumber(profile.bioLink.clicks)} clicks</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render Partnerships Tab
  const renderPartnerships = () => (
    <div className="bs-partnerships">
      <div className="bs-section-header">
        <h3>Brand Partnerships ({partnerships.length})</h3>
        <button className="bs-add-btn" onClick={() => setShowPartnershipForm(true)}>
          <i className="fa-solid fa-plus"></i> Apply for Partnership
        </button>
      </div>

      {partnerships.length === 0 ? (
        <div className="bs-empty-state">
          <div className="bs-empty-icon">
            <i className="fa-solid fa-handshake"></i>
          </div>
          <h4>No partnerships yet</h4>
          <p>Apply for brand partnerships to collaborate with companies and earn money</p>
          <button className="bs-primary-btn" onClick={() => setShowPartnershipForm(true)}>
            <i className="fa-solid fa-plus"></i> Apply for Partnership
          </button>
        </div>
      ) : (
        <div className="bs-partnerships-list">
          {partnerships.map(partnership => (
            <div key={partnership._id} className="bs-partnership-card">
              <div className="bs-partnership-header">
                <div className="bs-partnership-brand">
                  <div className="bs-brand-avatar">
                    <i className="fa-solid fa-building"></i>
                  </div>
                  <div>
                    <h4>{partnership.brandName}</h4>
                    <span className="bs-partnership-type">{partnership.campaignType?.replace('_', ' ')}</span>
                  </div>
                </div>
                <span className={`bs-badge ${partnership.status}`}>
                  {partnership.status === 'pending' && <i className="fa-solid fa-clock"></i>}
                  {partnership.status === 'active' && <i className="fa-solid fa-check"></i>}
                  {partnership.status === 'completed' && <i className="fa-solid fa-check-double"></i>}
                  {partnership.status === 'rejected' && <i className="fa-solid fa-times"></i>}
                  {partnership.status}
                </span>
              </div>
              <p className="bs-partnership-desc">{partnership.description}</p>
              <div className="bs-partnership-details">
                <div className="bs-detail-item">
                  <i className="fa-solid fa-dollar-sign"></i>
                  <span>${partnership.budget?.toLocaleString() || 0}</span>
                </div>
                <div className="bs-detail-item">
                  <i className="fa-solid fa-calendar"></i>
                  <span>{new Date(partnership.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              {partnership.status === 'pending' && (
                <div className="bs-partnership-actions">
                  <span className="bs-waiting-text">
                    <i className="fa-solid fa-hourglass-half"></i> Waiting for brand approval
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Partnership Application Form Modal */}
      {showPartnershipForm && (
        <div className="bs-modal-overlay" onClick={() => setShowPartnershipForm(false)}>
          <div className="bs-modal" onClick={e => e.stopPropagation()}>
            <div className="bs-modal-header">
              <h3>Apply for Partnership</h3>
              <button className="bs-modal-close" onClick={() => setShowPartnershipForm(false)}>
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <div className="bs-modal-body">
              <div className="bs-form-group">
                <label>Brand/Company Name *</label>
                <input
                  type="text"
                  value={partnershipForm.brandName}
                  onChange={e => setPartnershipForm({...partnershipForm, brandName: e.target.value})}
                  placeholder="Enter brand name"
                />
              </div>
              <div className="bs-form-group">
                <label>Contact Email</label>
                <input
                  type="email"
                  value={partnershipForm.contactEmail}
                  onChange={e => setPartnershipForm({...partnershipForm, contactEmail: e.target.value})}
                  placeholder="brand@company.com"
                />
              </div>
              <div className="bs-form-group">
                <label>Campaign Type</label>
                <select
                  value={partnershipForm.campaignType}
                  onChange={e => setPartnershipForm({...partnershipForm, campaignType: e.target.value})}
                >
                  <option value="sponsored_post">Sponsored Post</option>
                  <option value="product_review">Product Review</option>
                  <option value="brand_ambassador">Brand Ambassador</option>
                  <option value="affiliate">Affiliate Partnership</option>
                  <option value="event">Event Collaboration</option>
                </select>
              </div>
              <div className="bs-form-group">
                <label>Proposed Budget ($)</label>
                <input
                  type="number"
                  value={partnershipForm.budget}
                  onChange={e => setPartnershipForm({...partnershipForm, budget: e.target.value})}
                  placeholder="1000"
                />
              </div>
              <div className="bs-form-group">
                <label>Description</label>
                <textarea
                  value={partnershipForm.description}
                  onChange={e => setPartnershipForm({...partnershipForm, description: e.target.value})}
                  placeholder="Describe the partnership opportunity..."
                  rows={3}
                />
              </div>
              <div className="bs-form-group">
                <label>Deliverables</label>
                <textarea
                  value={partnershipForm.deliverables}
                  onChange={e => setPartnershipForm({...partnershipForm, deliverables: e.target.value})}
                  placeholder="What will you deliver? (e.g., 2 posts, 1 story, etc.)"
                  rows={2}
                />
              </div>
            </div>
            <div className="bs-modal-footer">
              <button className="bs-secondary-btn" onClick={() => setShowPartnershipForm(false)}>
                Cancel
              </button>
              <button 
                className="bs-primary-btn" 
                onClick={handleCreatePartnership}
                disabled={!partnershipForm.brandName}
              >
                <i className="fa-solid fa-paper-plane"></i> Submit Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render Analytics Tab
  const renderAnalytics = () => (
    <div className="bs-analytics">
      <div className="bs-section">
        <h3>Business Analytics</h3>
        <p className="bs-section-desc">Track your business performance over the last 30 days</p>
      </div>

      {/* Overview Stats */}
      <div className="bs-analytics-grid">
        <div className="bs-analytics-card">
          <div className="bs-analytics-icon impressions"><i className="fa-solid fa-eye"></i></div>
          <div className="bs-analytics-data">
            <span className="bs-analytics-value">{formatNumber(analytics?.profile?.totalImpressions || 0)}</span>
            <span className="bs-analytics-label">Total Impressions</span>
          </div>
        </div>
        <div className="bs-analytics-card">
          <div className="bs-analytics-icon reach"><i className="fa-solid fa-users"></i></div>
          <div className="bs-analytics-data">
            <span className="bs-analytics-value">{formatNumber(analytics?.profile?.totalReach || 0)}</span>
            <span className="bs-analytics-label">Total Reach</span>
          </div>
        </div>
        <div className="bs-analytics-card">
          <div className="bs-analytics-icon clicks"><i className="fa-solid fa-hand-pointer"></i></div>
          <div className="bs-analytics-data">
            <span className="bs-analytics-value">{formatNumber(analytics?.profile?.totalClicks || 0)}</span>
            <span className="bs-analytics-label">Total Clicks</span>
          </div>
        </div>
        <div className="bs-analytics-card">
          <div className="bs-analytics-icon conversions"><i className="fa-solid fa-check-circle"></i></div>
          <div className="bs-analytics-data">
            <span className="bs-analytics-value">{formatNumber(analytics?.profile?.totalConversions || 0)}</span>
            <span className="bs-analytics-label">Conversions</span>
          </div>
        </div>
      </div>

      {/* Campaign Performance */}
      <div className="bs-section">
        <h4>Campaign Performance</h4>
        <div className="bs-performance-summary">
          <div className="bs-perf-item">
            <span className="bs-perf-label">Total Campaigns</span>
            <span className="bs-perf-value">{analytics?.campaignStats?.totalCampaigns || 0}</span>
          </div>
          <div className="bs-perf-item">
            <span className="bs-perf-label">Active Campaigns</span>
            <span className="bs-perf-value">{analytics?.campaignStats?.activeCampaigns || 0}</span>
          </div>
          <div className="bs-perf-item">
            <span className="bs-perf-label">Total Budget</span>
            <span className="bs-perf-value">${(analytics?.campaignStats?.totalBudget || 0).toFixed(2)}</span>
          </div>
          <div className="bs-perf-item">
            <span className="bs-perf-label">Total Spent</span>
            <span className="bs-perf-value">${(analytics?.campaignStats?.totalSpent || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Promo Code Stats */}
      <div className="bs-section">
        <h4>Promo Code Performance</h4>
        <div className="bs-performance-summary">
          <div className="bs-perf-item">
            <span className="bs-perf-label">Total Codes</span>
            <span className="bs-perf-value">{analytics?.promoStats?.totalCodes || 0}</span>
          </div>
          <div className="bs-perf-item">
            <span className="bs-perf-label">Active Codes</span>
            <span className="bs-perf-value">{analytics?.promoStats?.activeCodes || 0}</span>
          </div>
          <div className="bs-perf-item">
            <span className="bs-perf-label">Total Redemptions</span>
            <span className="bs-perf-value">{analytics?.promoStats?.totalUses || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Settings Tab
  const renderSettings = () => (
    <div className="bs-settings">
      <div className="bs-section">
        <h3>Business Settings</h3>
      </div>

      {/* Profile Form Modal */}
      {showProfileForm && (
        <div className="bs-modal-overlay" onClick={() => setShowProfileForm(false)}>
          <div className="bs-modal" onClick={e => e.stopPropagation()}>
            <div className="bs-modal-header">
              <h3>Edit Business Profile</h3>
              <button onClick={() => setShowProfileForm(false)}><i className="fa-solid fa-times"></i></button>
            </div>
            <div className="bs-modal-body">
              <div className="bs-form-group">
                <label>Business Name</label>
                <input
                  type="text"
                  value={profileForm.businessName}
                  onChange={e => setProfileForm({ ...profileForm, businessName: e.target.value })}
                  placeholder="Your Business Name"
                />
              </div>
              <div className="bs-form-group">
                <label>Business Type</label>
                <select
                  value={profileForm.businessType}
                  onChange={e => setProfileForm({ ...profileForm, businessType: e.target.value })}
                >
                  <option value="individual">Individual Creator</option>
                  <option value="small_business">Small Business</option>
                  <option value="brand">Brand</option>
                  <option value="agency">Agency</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="bs-form-group">
                <label>Industry</label>
                <input
                  type="text"
                  value={profileForm.industry}
                  onChange={e => setProfileForm({ ...profileForm, industry: e.target.value })}
                  placeholder="e.g., Fashion, Technology, Food"
                />
              </div>
              <div className="bs-form-group">
                <label>Description</label>
                <textarea
                  value={profileForm.description}
                  onChange={e => setProfileForm({ ...profileForm, description: e.target.value })}
                  placeholder="Tell us about your business..."
                  rows={3}
                />
              </div>
              <div className="bs-form-group">
                <label>Website</label>
                <input
                  type="url"
                  value={profileForm.website}
                  onChange={e => setProfileForm({ ...profileForm, website: e.target.value })}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
            <div className="bs-modal-footer">
              <button className="bs-secondary-btn" onClick={() => setShowProfileForm(false)}>Cancel</button>
              <button className="bs-primary-btn" onClick={handleUpdateProfile}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Options */}
      <div className="bs-settings-list">
        <div className="bs-settings-item" onClick={() => setShowProfileForm(true)}>
          <div className="bs-settings-icon"><i className="fa-solid fa-building"></i></div>
          <div className="bs-settings-info">
            <h5>Business Profile</h5>
            <p>Update your business name, type, and description</p>
          </div>
          <i className="fa-solid fa-chevron-right"></i>
        </div>

        <div 
          className={`bs-settings-item ${profile?.verificationStatus === 'pending' ? 'disabled' : ''}`} 
          onClick={profile?.isVerified || profile?.verificationStatus === 'pending' ? null : handleApplyVerification}
        >
          <div className="bs-settings-icon"><i className="fa-solid fa-certificate"></i></div>
          <div className="bs-settings-info">
            <h5>Business Verification</h5>
            <p>{profile?.isVerified ? 'Your business is verified ✓' : profile?.verificationStatus === 'pending' ? 'Under review (2-3 business days)' : 'Get verified to build trust'}</p>
          </div>
          {profile?.isVerified ? (
            <span className="bs-badge verified small"><i className="fa-solid fa-check"></i></span>
          ) : profile?.verificationStatus === 'pending' ? (
            <span className="bs-badge pending small"><i className="fa-solid fa-clock"></i></span>
          ) : (
            <i className="fa-solid fa-chevron-right"></i>
          )}
        </div>

        <div className="bs-settings-item" onClick={() => setActiveTab('biolink')}>
          <div className="bs-settings-icon"><i className="fa-solid fa-link"></i></div>
          <div className="bs-settings-info">
            <h5>Bio Link</h5>
            <p>{profile?.bioLink?.enabled ? 'Bio link is enabled' : 'Add a link to your profile'}</p>
          </div>
          <i className="fa-solid fa-chevron-right"></i>
        </div>

        <div className="bs-settings-item" onClick={() => navigate('/profile')}>
          <div className="bs-settings-icon"><i className="fa-solid fa-user"></i></div>
          <div className="bs-settings-info">
            <h5>Account Settings</h5>
            <p>Manage your account preferences</p>
          </div>
          <i className="fa-solid fa-chevron-right"></i>
        </div>
      </div>
    </div>
  );

  // Main Render
  return (
    <div className="business-suite-overlay">
      <div className="business-suite-container">
        {/* Header */}
        <header className="bs-header">
          <button className="bs-back-btn" onClick={onClose}>
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <h1>Business Suite</h1>
          <div className="bs-header-actions">
            {profile?.isVerified && (
              <span className="bs-verified-icon" title="Verified Business">
                <i className="fa-solid fa-certificate"></i>
              </span>
            )}
          </div>
        </header>

        {/* Toast */}
        {toast && (
          <div className={`bs-toast ${toast.type}`}>
            <i className={`fa-solid fa-${toast.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
            {toast.message}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="bs-loading">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <p>Loading business data...</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <nav className="bs-tabs">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`bs-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <i className={`fa-solid ${tab.icon}`}></i>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* Content */}
            <main className="bs-content">
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'campaigns' && renderCampaigns()}
              {activeTab === 'promo' && renderPromoCodes()}
              {activeTab === 'partnerships' && renderPartnerships()}
              {activeTab === 'biolink' && renderBioLink()}
              {activeTab === 'analytics' && renderAnalytics()}
              {activeTab === 'settings' && renderSettings()}
            </main>
          </>
        )}
      </div>
    </div>
  );
};

export default BusinessSuite;

