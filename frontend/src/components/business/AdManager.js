import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCampaigns,
  createCampaign,
  updateCampaignStatus,
  deleteCampaign,
  getBusinessAnalytics,
  getAudiences,
  createAudience,
  deleteAudience,
  exportCSV,
  exportExcel,
  exportPDF
} from '../../api/business';
import './AdManager.css';

const AdManager = ({ onClose = () => {} }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [campaigns, setCampaigns] = useState([]);
  const [audiences, setAudiences] = useState([]);
  const [, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState(7); // 7, 30, 90 days
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Form states
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    objective: 'awareness',
    budget: '',
    dailyBudget: '',
    duration: 7,
    targetAudience: {
      ageMin: 18,
      ageMax: 65,
      gender: 'all',
      interests: [],
      locations: []
    },
    adCreative: {
      headline: '',
      description: '',
      callToAction: 'learn_more'
    }
  });

  const [interestInput, setInterestInput] = useState('');
  const [locationInput, setLocationInput] = useState('');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [campaignsRes, analyticsRes, audiencesRes] = await Promise.all([
        getCampaigns(),
        getBusinessAnalytics(30),
        getAudiences()
      ]);
      
      if (campaignsRes.success) {
        setCampaigns(campaignsRes.campaigns);
      }
      if (analyticsRes.success) {
        setAnalytics(analyticsRes.analytics);
      }
      if (audiencesRes.success) {
        setAudiences(audiencesRes.audiences);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Audience form state
  const [audienceForm, setAudienceForm] = useState({
    name: '',
    description: '',
    demographics: { ageMin: 18, ageMax: 65, gender: 'all' },
    interests: [],
    locations: []
  });
  const [audienceInterest, setAudienceInterest] = useState('');
  const [audienceLocation, setAudienceLocation] = useState('');

  // Save audience
  const handleSaveAudience = async () => {
    if (!audienceForm.name.trim()) {
      showToast('Please enter audience name', 'error');
      return;
    }
    try {
      const response = await createAudience(audienceForm);
      if (response.success) {
        setAudiences([response.audience, ...audiences]);
        setAudienceForm({
          name: '',
          description: '',
          demographics: { ageMin: 18, ageMax: 65, gender: 'all' },
          interests: [],
          locations: []
        });
        showToast('Audience saved successfully! 🎯');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to save audience', 'error');
    }
  };

  // Delete audience
  const handleDeleteAudience = async (id) => {
    if (!window.confirm('Delete this audience?')) return;
    try {
      await deleteAudience(id);
      setAudiences(audiences.filter(a => a._id !== id));
      showToast('Audience deleted');
    } catch (error) {
      showToast('Failed to delete', 'error');
    }
  };

  // Export handlers
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      await exportCSV();
      showToast('CSV exported successfully! 📄');
    } catch (error) {
      showToast('Failed to export CSV', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      await exportPDF();
      showToast('Report exported! Open and print as PDF 📑');
    } catch (error) {
      showToast('Failed to export', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      await exportExcel();
      showToast('Excel data exported! 📊');
    } catch (error) {
      showToast('Failed to export', 'error');
    } finally {
      setExporting(false);
    }
  };

  // Audience helpers
  const addAudienceInterest = () => {
    if (audienceInterest.trim() && !audienceForm.interests.includes(audienceInterest.trim())) {
      setAudienceForm({
        ...audienceForm,
        interests: [...audienceForm.interests, audienceInterest.trim()]
      });
      setAudienceInterest('');
    }
  };

  const removeAudienceInterest = (interest) => {
    setAudienceForm({
      ...audienceForm,
      interests: audienceForm.interests.filter(i => i !== interest)
    });
  };

  const addAudienceLocation = () => {
    if (audienceLocation.trim() && !audienceForm.locations.includes(audienceLocation.trim())) {
      setAudienceForm({
        ...audienceForm,
        locations: [...audienceForm.locations, audienceLocation.trim()]
      });
      setAudienceLocation('');
    }
  };

  const removeAudienceLocation = (location) => {
    setAudienceForm({
      ...audienceForm,
      locations: audienceForm.locations.filter(l => l !== location)
    });
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateCampaign = async () => {
    if (!campaignForm.name || !campaignForm.budget) {
      showToast('Please fill in required fields', 'error');
      return;
    }

    try {
      const response = await createCampaign(campaignForm);
      if (response.success) {
        setCampaigns([response.campaign, ...campaigns]);
        setShowCreateModal(false);
        setCampaignForm({
          name: '',
          objective: 'awareness',
          budget: '',
          dailyBudget: '',
          duration: 7,
          targetAudience: {
            ageMin: 18,
            ageMax: 65,
            gender: 'all',
            interests: [],
            locations: []
          },
          adCreative: {
            headline: '',
            description: '',
            callToAction: 'learn_more'
          }
        });
        showToast('Campaign created successfully! 🚀');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to create campaign', 'error');
    }
  };

  const handleToggleCampaign = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const response = await updateCampaignStatus(id, newStatus);
      if (response.success) {
        setCampaigns(campaigns.map(c => c._id === id ? response.campaign : c));
        showToast(`Campaign ${newStatus === 'active' ? 'activated' : 'paused'}`);
      }
    } catch (error) {
      showToast('Failed to update campaign', 'error');
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    
    try {
      const response = await deleteCampaign(id);
      if (response.success) {
        setCampaigns(campaigns.filter(c => c._id !== id));
        showToast('Campaign deleted');
      }
    } catch (error) {
      showToast('Failed to delete campaign', 'error');
    }
  };

  const addInterest = () => {
    if (interestInput.trim() && !campaignForm.targetAudience.interests.includes(interestInput.trim())) {
      setCampaignForm({
        ...campaignForm,
        targetAudience: {
          ...campaignForm.targetAudience,
          interests: [...campaignForm.targetAudience.interests, interestInput.trim()]
        }
      });
      setInterestInput('');
    }
  };

  const removeInterest = (interest) => {
    setCampaignForm({
      ...campaignForm,
      targetAudience: {
        ...campaignForm.targetAudience,
        interests: campaignForm.targetAudience.interests.filter(i => i !== interest)
      }
    });
  };

  const addLocation = () => {
    if (locationInput.trim() && !campaignForm.targetAudience.locations.includes(locationInput.trim())) {
      setCampaignForm({
        ...campaignForm,
        targetAudience: {
          ...campaignForm.targetAudience,
          locations: [...campaignForm.targetAudience.locations, locationInput.trim()]
        }
      });
      setLocationInput('');
    }
  };

  const removeLocation = (location) => {
    setCampaignForm({
      ...campaignForm,
      targetAudience: {
        ...campaignForm.targetAudience,
        locations: campaignForm.targetAudience.locations.filter(l => l !== location)
      }
    });
  };

  const handleClose = () => {
    onClose();
    navigate('/profile');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'paused': return '#F59E0B';
      case 'completed': return '#6B7280';
      case 'draft': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  // Filter campaigns by date range
  const getFilteredCampaigns = () => {
    if (dateRange === 0) return campaigns; // All time
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dateRange);
    return campaigns.filter(c => new Date(c.createdAt) >= cutoffDate);
  };

  const filteredCampaigns = getFilteredCampaigns();

  // Calculate totals based on filtered campaigns
  const totalSpend = filteredCampaigns.reduce((sum, c) => sum + (c.performance?.spend || 0), 0);
  const totalImpressions = filteredCampaigns.reduce((sum, c) => sum + (c.performance?.impressions || 0), 0);
  const totalClicks = filteredCampaigns.reduce((sum, c) => sum + (c.performance?.clicks || 0), 0);
  const totalConversions = filteredCampaigns.reduce((sum, c) => sum + (c.performance?.conversions || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  if (loading) {
    return (
      <div className="ad-manager">
        <div className="am-loading">
          <div className="am-spinner"></div>
          <p>Loading Ad Manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ad-manager">
      {/* Toast Notification */}
      {toast && (
        <div className={`am-toast ${toast.type}`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="am-header">
        <div className="am-header-left">
          <button className="am-back-btn" onClick={handleClose}>
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div className="am-title">
            <i className="fa-solid fa-bullseye"></i>
            <h1>Ad Manager</h1>
          </div>
        </div>
        <div className="am-header-right">
          <button className="am-create-btn" onClick={() => setShowCreateModal(true)}>
            <i className="fa-solid fa-plus"></i>
            Create Campaign
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="am-tabs">
        <button 
          className={`am-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <i className="fa-solid fa-chart-pie"></i>
          Overview
        </button>
        <button 
          className={`am-tab ${activeTab === 'campaigns' ? 'active' : ''}`}
          onClick={() => setActiveTab('campaigns')}
        >
          <i className="fa-solid fa-rectangle-ad"></i>
          Campaigns
          {campaigns.length > 0 && <span className="am-tab-badge">{campaigns.length}</span>}
        </button>
        <button 
          className={`am-tab ${activeTab === 'audiences' ? 'active' : ''}`}
          onClick={() => setActiveTab('audiences')}
        >
          <i className="fa-solid fa-users"></i>
          Audiences
        </button>
        <button 
          className={`am-tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          <i className="fa-solid fa-file-lines"></i>
          Reports
        </button>
      </div>

      {/* Content */}
      <div className="am-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="am-overview">
            {/* Stats Grid */}
            <div className="am-stats-grid">
              <div className="am-stat-card">
                <div className="am-stat-icon" style={{ background: 'linear-gradient(135deg, #FF0050, #FF4081)' }}>
                  <i className="fa-solid fa-play"></i>
                </div>
                <div className="am-stat-info">
                  <h3>{activeCampaigns}</h3>
                  <p>Active Campaigns</p>
                </div>
              </div>
              <div className="am-stat-card">
                <div className="am-stat-icon" style={{ background: 'linear-gradient(135deg, #00C6FF, #0072FF)' }}>
                  <i className="fa-solid fa-eye"></i>
                </div>
                <div className="am-stat-info">
                  <h3>{formatNumber(totalImpressions)}</h3>
                  <p>Total Impressions</p>
                </div>
              </div>
              <div className="am-stat-card">
                <div className="am-stat-icon" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                  <i className="fa-solid fa-mouse-pointer"></i>
                </div>
                <div className="am-stat-info">
                  <h3>{formatNumber(totalClicks)}</h3>
                  <p>Total Clicks</p>
                </div>
              </div>
              <div className="am-stat-card">
                <div className="am-stat-icon" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                  <i className="fa-solid fa-dollar-sign"></i>
                </div>
                <div className="am-stat-info">
                  <h3>{formatCurrency(totalSpend)}</h3>
                  <p>Total Spend</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="am-section">
              <h2>Quick Actions</h2>
              <div className="am-quick-actions">
                <button className="am-action-card" onClick={() => setShowCreateModal(true)}>
                  <div className="am-action-icon">
                    <i className="fa-solid fa-plus"></i>
                  </div>
                  <span>New Campaign</span>
                </button>
                <button className="am-action-card" onClick={() => setActiveTab('campaigns')}>
                  <div className="am-action-icon">
                    <i className="fa-solid fa-rectangle-ad"></i>
                  </div>
                  <span>View Campaigns</span>
                </button>
                <button className="am-action-card" onClick={() => setActiveTab('audiences')}>
                  <div className="am-action-icon">
                    <i className="fa-solid fa-users-gear"></i>
                  </div>
                  <span>Create Audience</span>
                </button>
                <button className="am-action-card" onClick={() => setActiveTab('reports')}>
                  <div className="am-action-icon">
                    <i className="fa-solid fa-download"></i>
                  </div>
                  <span>Export Report</span>
                </button>
              </div>
            </div>

            {/* Recent Campaigns */}
            <div className="am-section">
              <h2>Recent Campaigns</h2>
              {campaigns.length === 0 ? (
                <div className="am-empty-state">
                  <div className="am-empty-state-icon">
                    <i className="fa-solid fa-rectangle-ad"></i>
                  </div>
                  <h3>No campaigns yet</h3>
                  <p>Create your first ad campaign to start reaching more customers</p>
                  <button className="am-primary-btn" onClick={() => setShowCreateModal(true)}>
                    <i className="fa-solid fa-plus"></i>
                    Create Campaign
                  </button>
                </div>
              ) : (
                <div className="am-campaigns-list">
                  {campaigns.slice(0, 3).map(campaign => (
                    <div key={campaign._id} className="am-campaign-item">
                      <div className="am-campaign-info">
                        <div className="am-campaign-status" style={{ background: getStatusColor(campaign.status) }}></div>
                        <div>
                          <h4>{campaign.name}</h4>
                          <p>{campaign.objective} • {formatCurrency(campaign.budget)} budget</p>
                        </div>
                      </div>
                      <div className="am-campaign-metrics">
                        <div className="am-metric">
                          <span>{formatNumber(campaign.performance?.impressions || 0)}</span>
                          <small>Impressions</small>
                        </div>
                        <div className="am-metric">
                          <span>{formatNumber(campaign.performance?.clicks || 0)}</span>
                          <small>Clicks</small>
                        </div>
                        <div className="am-metric">
                          <span>{formatCurrency(campaign.performance?.spend || 0)}</span>
                          <small>Spent</small>
                        </div>
                      </div>
                      <div className="am-campaign-actions">
                        <button 
                          className={`am-toggle-btn ${campaign.status === 'active' ? 'active' : ''}`}
                          onClick={() => handleToggleCampaign(campaign._id, campaign.status)}
                        >
                          {campaign.status === 'active' ? 'Pause' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Performance Tips */}
            <div className="am-section">
              <h2>Performance Tips</h2>
              <div className="am-tips-grid">
                <div className="am-tip-card">
                  <i className="fa-solid fa-lightbulb"></i>
                  <h4>Target Right Audience</h4>
                  <p>Use detailed targeting to reach people most likely to convert</p>
                </div>
                <div className="am-tip-card">
                  <i className="fa-solid fa-clock"></i>
                  <h4>Optimal Timing</h4>
                  <p>Schedule ads when your audience is most active</p>
                </div>
                <div className="am-tip-card">
                  <i className="fa-solid fa-video"></i>
                  <h4>Video First</h4>
                  <p>Video ads typically perform 3x better than static images</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div className="am-campaigns">
            <div className="am-campaigns-header">
              <div className="am-search-box">
                <i className="fa-solid fa-search"></i>
                <input type="text" placeholder="Search campaigns..." />
              </div>
              <div className="am-filters">
                <select className="am-select">
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
                <select className="am-select">
                  <option value="all">All Objectives</option>
                  <option value="awareness">Awareness</option>
                  <option value="traffic">Traffic</option>
                  <option value="conversions">Conversions</option>
                </select>
              </div>
            </div>

            {campaigns.length === 0 ? (
              <div className="am-empty-state">
                <div className="am-empty-state-icon">
                  <i className="fa-solid fa-rectangle-ad"></i>
                </div>
                <h3>No campaigns yet</h3>
                <p>Create your first ad campaign to start reaching more customers</p>
                <button className="am-primary-btn" onClick={() => setShowCreateModal(true)}>
                  <i className="fa-solid fa-plus"></i>
                  Create Campaign
                </button>
              </div>
            ) : (
              <div className="am-campaigns-table">
                <div className="am-table-header">
                  <div className="am-th">Campaign</div>
                  <div className="am-th">Status</div>
                  <div className="am-th">Budget</div>
                  <div className="am-th">Impressions</div>
                  <div className="am-th">Clicks</div>
                  <div className="am-th">CTR</div>
                  <div className="am-th">Spent</div>
                  <div className="am-th">Actions</div>
                </div>
                {campaigns.map(campaign => {
                  const ctr = campaign.performance?.impressions > 0 
                    ? ((campaign.performance.clicks / campaign.performance.impressions) * 100).toFixed(2)
                    : '0.00';
                  
                  return (
                    <div key={campaign._id} className="am-table-row">
                      <div className="am-td">
                        <div className="am-campaign-name">
                          <strong>{campaign.name}</strong>
                          <small>{campaign.objective}</small>
                        </div>
                      </div>
                      <div className="am-td">
                        <span className="am-status-badge" style={{ 
                          background: `${getStatusColor(campaign.status)}20`,
                          color: getStatusColor(campaign.status)
                        }}>
                          {campaign.status}
                        </span>
                      </div>
                      <div className="am-td">{formatCurrency(campaign.budget)}</div>
                      <div className="am-td">{formatNumber(campaign.performance?.impressions || 0)}</div>
                      <div className="am-td">{formatNumber(campaign.performance?.clicks || 0)}</div>
                      <div className="am-td">{ctr}%</div>
                      <div className="am-td">{formatCurrency(campaign.performance?.spend || 0)}</div>
                      <div className="am-td am-actions">
                        <button 
                          className="am-icon-btn"
                          onClick={() => handleToggleCampaign(campaign._id, campaign.status)}
                          title={campaign.status === 'active' ? 'Pause' : 'Activate'}
                        >
                          <i className={`fa-solid ${campaign.status === 'active' ? 'fa-pause' : 'fa-play'}`}></i>
                        </button>
                        <button 
                          className="am-icon-btn delete"
                          onClick={() => handleDeleteCampaign(campaign._id)}
                          title="Delete"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Audiences Tab */}
        {activeTab === 'audiences' && (
          <div className="am-audiences">
            <div className="am-audience-builder">
              <h2>Audience Builder</h2>
              <p>Create custom audiences to target the right people</p>
              
              <div className="am-audience-form">
                <div className="am-form-group">
                  <label>Audience Name *</label>
                  <input 
                    type="text" 
                    placeholder="Enter audience name"
                    value={audienceForm.name}
                    onChange={e => setAudienceForm({...audienceForm, name: e.target.value})}
                  />
                </div>

                <div className="am-form-group">
                  <label>Description</label>
                  <textarea 
                    placeholder="Describe this audience..."
                    value={audienceForm.description}
                    onChange={e => setAudienceForm({...audienceForm, description: e.target.value})}
                  />
                </div>

                <div className="am-form-section">
                  <h3><i className="fa-solid fa-users"></i> Demographics</h3>
                  <div className="am-form-row">
                    <div className="am-form-group">
                      <label>Age Range</label>
                      <div className="am-range-inputs">
                        <input 
                          type="number" 
                          value={audienceForm.demographics.ageMin}
                          onChange={e => setAudienceForm({
                            ...audienceForm, 
                            demographics: {...audienceForm.demographics, ageMin: parseInt(e.target.value) || 18}
                          })}
                          min={13} 
                          max={65} 
                        />
                        <span>to</span>
                        <input 
                          type="number" 
                          value={audienceForm.demographics.ageMax}
                          onChange={e => setAudienceForm({
                            ...audienceForm, 
                            demographics: {...audienceForm.demographics, ageMax: parseInt(e.target.value) || 65}
                          })}
                          min={13} 
                          max={65} 
                        />
                      </div>
                    </div>
                    <div className="am-form-group">
                      <label>Gender</label>
                      <select 
                        className="am-select"
                        value={audienceForm.demographics.gender}
                        onChange={e => setAudienceForm({
                          ...audienceForm, 
                          demographics: {...audienceForm.demographics, gender: e.target.value}
                        })}
                      >
                        <option value="all">All</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="am-form-section">
                  <h3><i className="fa-solid fa-heart"></i> Interests</h3>
                  <div className="am-tags-container">
                    {audienceForm.interests.map(interest => (
                      <div key={interest} className="am-tag">
                        {interest} <button onClick={() => removeAudienceInterest(interest)}>×</button>
                      </div>
                    ))}
                    <input 
                      type="text" 
                      placeholder="Add interest..." 
                      className="am-tag-input"
                      value={audienceInterest}
                      onChange={e => setAudienceInterest(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && addAudienceInterest()}
                    />
                  </div>
                </div>

                <div className="am-form-section">
                  <h3><i className="fa-solid fa-location-dot"></i> Locations</h3>
                  <div className="am-tags-container">
                    {audienceForm.locations.map(location => (
                      <div key={location} className="am-tag">
                        {location} <button onClick={() => removeAudienceLocation(location)}>×</button>
                      </div>
                    ))}
                    <input 
                      type="text" 
                      placeholder="Add location..." 
                      className="am-tag-input"
                      value={audienceLocation}
                      onChange={e => setAudienceLocation(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && addAudienceLocation()}
                    />
                  </div>
                </div>

                <button className="am-primary-btn" onClick={handleSaveAudience}>
                  <i className="fa-solid fa-save"></i>
                  Save Audience
                </button>
              </div>

              {/* Saved Audiences List */}
              {audiences.length > 0 && (
                <div className="am-saved-audiences">
                  <h3>Saved Audiences ({audiences.length})</h3>
                  <div className="am-audiences-list">
                    {audiences.map(audience => (
                      <div key={audience._id} className="am-audience-item">
                        <div className="am-audience-info">
                          <h4>{audience.name}</h4>
                          <p>
                            Age: {audience.demographics?.ageMin}-{audience.demographics?.ageMax} • 
                            Gender: {audience.demographics?.gender} • 
                            {audience.interests?.length || 0} interests • 
                            {audience.locations?.length || 0} locations
                          </p>
                          <span className="am-audience-size">
                            {formatNumber(audience.estimatedSize?.min || 0)} - {formatNumber(audience.estimatedSize?.max || 0)} people
                          </span>
                        </div>
                        <button 
                          className="am-icon-btn delete"
                          onClick={() => handleDeleteAudience(audience._id)}
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="am-reports">
            <div className="am-report-header">
              <h2>Campaign Reports</h2>
              <div className="am-date-range">
                <button 
                  className={`am-date-btn ${dateRange === 7 ? 'active' : ''}`}
                  onClick={() => setDateRange(7)}
                >
                  Last 7 days
                </button>
                <button 
                  className={`am-date-btn ${dateRange === 30 ? 'active' : ''}`}
                  onClick={() => setDateRange(30)}
                >
                  Last 30 days
                </button>
                <button 
                  className={`am-date-btn ${dateRange === 90 ? 'active' : ''}`}
                  onClick={() => setDateRange(90)}
                >
                  Last 90 days
                </button>
                <button 
                  className={`am-date-btn ${dateRange === 0 ? 'active' : ''}`}
                  onClick={() => setDateRange(0)}
                >
                  All Time
                </button>
              </div>
            </div>

            <div className="am-report-summary">
              <div className="am-report-card">
                <h3>Total Performance {dateRange > 0 ? `(Last ${dateRange} days)` : '(All Time)'}</h3>
                <div className="am-report-stats">
                  <div className="am-report-stat">
                    <span className="am-report-value">{formatNumber(totalImpressions)}</span>
                    <span className="am-report-label">Impressions</span>
                  </div>
                  <div className="am-report-stat">
                    <span className="am-report-value">{formatNumber(totalClicks)}</span>
                    <span className="am-report-label">Clicks</span>
                  </div>
                  <div className="am-report-stat">
                    <span className="am-report-value">{formatNumber(totalConversions)}</span>
                    <span className="am-report-label">Conversions</span>
                  </div>
                  <div className="am-report-stat">
                    <span className="am-report-value">{formatCurrency(totalSpend)}</span>
                    <span className="am-report-label">Spent</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="am-export-section">
              <h3>Export Reports</h3>
              <div className="am-export-options">
                <button className="am-export-btn" onClick={handleExportCSV} disabled={exporting}>
                  <i className={`fa-solid ${exporting ? 'fa-spinner fa-spin' : 'fa-file-csv'}`}></i>
                  Export CSV
                </button>
                <button className="am-export-btn" onClick={handleExportPDF} disabled={exporting}>
                  <i className={`fa-solid ${exporting ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i>
                  Export PDF
                </button>
                <button className="am-export-btn" onClick={handleExportExcel} disabled={exporting}>
                  <i className={`fa-solid ${exporting ? 'fa-spinner fa-spin' : 'fa-file-excel'}`}></i>
                  Export Excel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="am-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="am-modal" onClick={e => e.stopPropagation()}>
            <div className="am-modal-header">
              <h2>Create New Campaign</h2>
              <button className="am-modal-close" onClick={() => setShowCreateModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="am-modal-body">
              <div className="am-form-group">
                <label>Campaign Name *</label>
                <input 
                  type="text" 
                  placeholder="Enter campaign name"
                  value={campaignForm.name}
                  onChange={e => setCampaignForm({...campaignForm, name: e.target.value})}
                />
              </div>

              <div className="am-form-group">
                <label>Objective</label>
                <select 
                  className="am-select"
                  value={campaignForm.objective}
                  onChange={e => setCampaignForm({...campaignForm, objective: e.target.value})}
                >
                  <option value="awareness">Brand Awareness</option>
                  <option value="traffic">Website Traffic</option>
                  <option value="engagement">Engagement</option>
                  <option value="conversions">Conversions</option>
                  <option value="app_installs">App Installs</option>
                </select>
              </div>

              <div className="am-form-row">
                <div className="am-form-group">
                  <label>Total Budget ($) *</label>
                  <input 
                    type="number" 
                    placeholder="1000"
                    value={campaignForm.budget}
                    onChange={e => setCampaignForm({...campaignForm, budget: e.target.value})}
                  />
                </div>
                <div className="am-form-group">
                  <label>Daily Budget ($)</label>
                  <input 
                    type="number" 
                    placeholder="50"
                    value={campaignForm.dailyBudget}
                    onChange={e => setCampaignForm({...campaignForm, dailyBudget: e.target.value})}
                  />
                </div>
              </div>

              <div className="am-form-group">
                <label>Duration (days)</label>
                <input 
                  type="number" 
                  placeholder="7"
                  value={campaignForm.duration}
                  onChange={e => setCampaignForm({...campaignForm, duration: parseInt(e.target.value)})}
                />
              </div>

              <div className="am-form-section">
                <h4>Target Audience</h4>
                <div className="am-form-row">
                  <div className="am-form-group">
                    <label>Age Range</label>
                    <div className="am-range-inputs">
                      <input 
                        type="number" 
                        value={campaignForm.targetAudience.ageMin}
                        onChange={e => setCampaignForm({
                          ...campaignForm, 
                          targetAudience: {...campaignForm.targetAudience, ageMin: parseInt(e.target.value)}
                        })}
                      />
                      <span>to</span>
                      <input 
                        type="number" 
                        value={campaignForm.targetAudience.ageMax}
                        onChange={e => setCampaignForm({
                          ...campaignForm, 
                          targetAudience: {...campaignForm.targetAudience, ageMax: parseInt(e.target.value)}
                        })}
                      />
                    </div>
                  </div>
                  <div className="am-form-group">
                    <label>Gender</label>
                    <select 
                      className="am-select"
                      value={campaignForm.targetAudience.gender}
                      onChange={e => setCampaignForm({
                        ...campaignForm, 
                        targetAudience: {...campaignForm.targetAudience, gender: e.target.value}
                      })}
                    >
                      <option value="all">All</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>

                <div className="am-form-group">
                  <label>Interests</label>
                  <div className="am-tags-container">
                    {campaignForm.targetAudience.interests.map(interest => (
                      <div key={interest} className="am-tag">
                        {interest} 
                        <button onClick={() => removeInterest(interest)}>×</button>
                      </div>
                    ))}
                    <input 
                      type="text" 
                      placeholder="Add interest..." 
                      className="am-tag-input"
                      value={interestInput}
                      onChange={e => setInterestInput(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && addInterest()}
                    />
                  </div>
                </div>

                <div className="am-form-group">
                  <label>Locations</label>
                  <div className="am-tags-container">
                    {campaignForm.targetAudience.locations.map(location => (
                      <div key={location} className="am-tag">
                        {location} 
                        <button onClick={() => removeLocation(location)}>×</button>
                      </div>
                    ))}
                    <input 
                      type="text" 
                      placeholder="Add location..." 
                      className="am-tag-input"
                      value={locationInput}
                      onChange={e => setLocationInput(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && addLocation()}
                    />
                  </div>
                </div>
              </div>

              <div className="am-form-section">
                <h4>Ad Creative</h4>
                <div className="am-form-group">
                  <label>Headline</label>
                  <input 
                    type="text" 
                    placeholder="Enter headline"
                    value={campaignForm.adCreative.headline}
                    onChange={e => setCampaignForm({
                      ...campaignForm, 
                      adCreative: {...campaignForm.adCreative, headline: e.target.value}
                    })}
                  />
                </div>
                <div className="am-form-group">
                  <label>Description</label>
                  <textarea 
                    placeholder="Enter ad description"
                    value={campaignForm.adCreative.description}
                    onChange={e => setCampaignForm({
                      ...campaignForm, 
                      adCreative: {...campaignForm.adCreative, description: e.target.value}
                    })}
                  />
                </div>
                <div className="am-form-group">
                  <label>Call to Action</label>
                  <select 
                    className="am-select"
                    value={campaignForm.adCreative.callToAction}
                    onChange={e => setCampaignForm({
                      ...campaignForm, 
                      adCreative: {...campaignForm.adCreative, callToAction: e.target.value}
                    })}
                  >
                    <option value="learn_more">Learn More</option>
                    <option value="shop_now">Shop Now</option>
                    <option value="sign_up">Sign Up</option>
                    <option value="download">Download</option>
                    <option value="contact_us">Contact Us</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="am-modal-footer">
              <button className="am-secondary-btn" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="am-primary-btn" onClick={handleCreateCampaign}>
                <i className="fa-solid fa-rocket"></i>
                Launch Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdManager;

