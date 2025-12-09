// Policy compliance management page component
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from './AdminSidebar';
import {
  getAgeRestrictions,
  updateAgeRestrictions,
  getRegionalLaws,
  updateRegionalLaws,
  getLegalHolds,
  createLegalHold,
  getLawEnforcementRequests,
  createLawEnforcementRequest
} from '../../api/admin';
import './PolicyCompliance.css';
import './AdminPanel.css';

const PolicyCompliance = ({ onClose }) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'age-restrictions';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  
  // Update activeTab when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab') || 'age-restrictions';
    // Map old tab names to new ones for backward compatibility
    const tabMapping = {
      'regional': 'regional-laws',
      'age-restrictions': 'age-restrictions',
      'legal-hold': 'legal-hold',
      'law-enforcement': 'law-enforcement'
    };
    const mappedTab = tabMapping[tab] || tab;
    setActiveTab(mappedTab);
  }, [searchParams]);
  
  // Law Enforcement Requests State
  const [lawEnforcementRequests, setLawEnforcementRequests] = useState([]);
  const [newRequest, setNewRequest] = useState({
    caseNumber: '',
    requestingAgency: '',
    requestType: 'data_request',
    description: '',
    urgency: 'normal',
    affectedUsers: []
  });
  const [loading, setLoading] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      navigate('/admin/login');
    }
  }, [user, authLoading, navigate]);

  // Don't block rendering - ProtectedRoute handles auth
  // Always render - let ProtectedRoute handle auth

  // Age Restrictions State
  const [ageRestrictions, setAgeRestrictions] = useState({
    minAge: 13,
    restrictedContent: true,
    ageVerification: false,
    parentalControls: true
  });

  // Regional Laws State
  const [regionalLaws, setRegionalLaws] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('US');
  const [regionSettings, setRegionSettings] = useState({
    contentRestrictions: [],
    dataRetention: 365,
    gdprCompliant: false
  });

  // Legal Hold State
  const [legalHolds, setLegalHolds] = useState([]);
  const [newLegalHold, setNewLegalHold] = useState({
    caseId: '',
    description: '',
    affectedContent: [],
    expiryDate: ''
  });

  useEffect(() => {
    loadAgeRestrictions();
    loadRegionalLaws();
    loadLegalHolds();
  }, []);

  const loadAgeRestrictions = async () => {
    try {
      const data = await getAgeRestrictions();
      if (data.success && data.restrictions) {
        setAgeRestrictions({
          minAge: data.restrictions.minAge || 13,
          restrictedContent: data.restrictions.restrictedContent !== undefined ? data.restrictions.restrictedContent : true,
          ageVerification: data.restrictions.ageVerification !== undefined ? data.restrictions.ageVerification : false,
          parentalControls: data.restrictions.parentalControls !== undefined ? data.restrictions.parentalControls : true
        });
      }
    } catch (error) {
      console.error('Error loading age restrictions:', error);
    }
  };

  const loadRegionalLaws = async () => {
    try {
      const data = await getRegionalLaws();
      if (data.success && data.laws) {
        setRegionalLaws(data.laws);
        // Find current region settings
        const currentLaw = data.laws.find(law => law.region === selectedRegion);
        if (currentLaw) {
          setRegionSettings({
            contentRestrictions: currentLaw.contentRestrictions || [],
            dataRetention: currentLaw.dataRetention || 365,
            gdprCompliant: currentLaw.gdprCompliant || false
          });
        }
      }
    } catch (error) {
      console.error('Error loading regional laws:', error);
    }
  };

  const loadLegalHolds = async () => {
    try {
      const data = await getLegalHolds();
      if (data.success && data.holds) {
        setLegalHolds(data.holds);
      }
    } catch (error) {
      console.error('Error loading legal holds:', error);
      setLegalHolds([]);
    }
  };

  const loadLawEnforcementRequests = async () => {
    try {
      const data = await getLawEnforcementRequests();
      if (data.success && data.requests) {
        setLawEnforcementRequests(data.requests);
      }
    } catch (error) {
      console.error('Error loading law enforcement requests:', error);
      setLawEnforcementRequests([]);
    }
  };

  const handleUpdateAgeRestrictions = async () => {
    setLoading(true);
    try {
      const result = await updateAgeRestrictions(ageRestrictions);
      if (result.success) {
        // Show success notification
        const successMsg = document.createElement('div');
        successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #28a745; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000; font-weight: 600; font-size: 14px;';
        successMsg.textContent = '✓ Age restrictions updated successfully!';
        document.body.appendChild(successMsg);
        setTimeout(() => {
          successMsg.style.transition = 'opacity 0.3s';
          successMsg.style.opacity = '0';
          setTimeout(() => successMsg.remove(), 300);
        }, 3000);
      } else {
        throw new Error(result.message || 'Update failed');
      }
    } catch (error) {
      console.error('Error updating age restrictions:', error);
      const errorMsg = document.createElement('div');
      errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000; font-weight: 600; font-size: 14px;';
      errorMsg.textContent = '✗ Failed to update: ' + (error.message || 'Unknown error');
      document.body.appendChild(errorMsg);
      setTimeout(() => {
        errorMsg.style.transition = 'opacity 0.3s';
        errorMsg.style.opacity = '0';
        setTimeout(() => errorMsg.remove(), 300);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRegionalLaws = async () => {
    setLoading(true);
    try {
      const updateData = {
        region: selectedRegion,
        dataRetention: regionSettings.dataRetention,
        gdprCompliant: regionSettings.gdprCompliant,
        contentRestrictions: regionSettings.contentRestrictions
      };
      
      const result = await updateRegionalLaws(updateData);
      if (result.success) {
        // Show success notification
        const successMsg = document.createElement('div');
        successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #28a745; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000; font-weight: 600; font-size: 14px;';
        successMsg.textContent = '✓ Regional settings updated successfully!';
        document.body.appendChild(successMsg);
        setTimeout(() => {
          successMsg.style.transition = 'opacity 0.3s';
          successMsg.style.opacity = '0';
          setTimeout(() => successMsg.remove(), 300);
        }, 3000);
        
        // Reload data
        loadRegionalLaws();
      } else {
        throw new Error(result.message || 'Update failed');
      }
    } catch (error) {
      console.error('Error updating regional laws:', error);
      const errorMsg = document.createElement('div');
      errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000; font-weight: 600; font-size: 14px;';
      errorMsg.textContent = '✗ Failed to update: ' + (error.message || 'Unknown error');
      document.body.appendChild(errorMsg);
      setTimeout(() => {
        errorMsg.style.transition = 'opacity 0.3s';
        errorMsg.style.opacity = '0';
        setTimeout(() => errorMsg.remove(), 300);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLegalHold = async () => {
    if (!newLegalHold.caseId.trim() || !newLegalHold.description.trim()) {
      const errorMsg = document.createElement('div');
      errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000; font-weight: 600; font-size: 14px;';
      errorMsg.textContent = '✗ Please fill in Case ID and Description';
      document.body.appendChild(errorMsg);
      setTimeout(() => {
        errorMsg.style.transition = 'opacity 0.3s';
        errorMsg.style.opacity = '0';
        setTimeout(() => errorMsg.remove(), 300);
      }, 3000);
      return;
    }
    
    setLoading(true);
    try {
      const result = await createLegalHold(newLegalHold);
      if (result.success) {
        // Show success notification
        const successMsg = document.createElement('div');
        successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #28a745; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000; font-weight: 600; font-size: 14px;';
        successMsg.textContent = '✓ Legal hold created successfully!';
        document.body.appendChild(successMsg);
        setTimeout(() => {
          successMsg.style.transition = 'opacity 0.3s';
          successMsg.style.opacity = '0';
          setTimeout(() => successMsg.remove(), 300);
        }, 3000);
        
        // Reset form
        setNewLegalHold({
          caseId: '',
          description: '',
          affectedContent: [],
          expiryDate: ''
        });
        
        // Reload legal holds list
        loadLegalHolds();
      } else {
        throw new Error(result.message || 'Creation failed');
      }
    } catch (error) {
      console.error('Error creating legal hold:', error);
      const errorMsg = document.createElement('div');
      errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000; font-weight: 600; font-size: 14px;';
      errorMsg.textContent = '✗ Failed to create: ' + (error.message || 'Unknown error');
      document.body.appendChild(errorMsg);
      setTimeout(() => {
        errorMsg.style.transition = 'opacity 0.3s';
        errorMsg.style.opacity = '0';
        setTimeout(() => errorMsg.remove(), 300);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-panel-page-container">
      <div className="admin-panel-with-sidebar">
        <AdminSidebar 
          activeTab="policy"
          setActiveTab={(tab) => {
            // If clicking on a different main tab, navigate away
            if (tab && tab !== 'policy') {
              // Map tab IDs to routes
              const routeMap = {
                'dashboard': '/admin',
                'users': '/admin',
                'videos': '/admin',
                'stories': '/admin',
                'comments': '/admin',
                'moderation': '/admin',
                'safety': '/admin',
                'monetization': '/admin',
                'analytics': '/admin',
                'search': '/admin',
                'system': '/admin',
                'support': '/admin',
                'security': '/admin/security-settings',
                'app-store': '/admin/app-store-compliance',
                'experiments': '/admin/experiment-features',
                'notifications': '/admin/notifications-control',
                'backup': '/admin/backup-recovery'
              };
              const route = routeMap[tab] || '/admin';
              navigate(route);
            }
          }}
          activeSubTab={activeTab}
          setActiveSubTab={(subTab) => {
            // Update active tab when sub-item is clicked
            if (subTab) {
              setActiveTab(subTab);
              navigate(`/admin/policy-compliance?tab=${subTab}`, { replace: true });
            }
          }}
          onClose={onClose} 
        />
        <div className="admin-panel-main-content">
      <div className="policy-compliance">
      <div className="admin-page-header">
        <h2>
          Policy Compliance
          {activeTab === 'age-restrictions' && ' → Age Restrictions'}
          {activeTab === 'regional-laws' && ' → Regional Laws'}
          {activeTab === 'legal-hold' && ' → Legal Hold'}
          {activeTab === 'law-enforcement' && ' → Law Enforcement'}
        </h2>
      </div>

      <div className="admin-content-area">
        {activeTab === 'age-restrictions' && (
          <div className="age-restrictions">
            <h3>Age Restrictions & Content Controls</h3>
            <div className="compliance-controls">
              <div className="control-group">
                <label>Minimum Age Requirement</label>
                <select
                  value={ageRestrictions.minAge}
                  onChange={(e) =>
                    setAgeRestrictions({
                      ...ageRestrictions,
                      minAge: parseInt(e.target.value)
                    })
                  }
                >
                  <option value="13">13 years</option>
                  <option value="16">16 years</option>
                  <option value="18">18 years</option>
                </select>
              </div>

              <div className="control-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={ageRestrictions.restrictedContent}
                    onChange={(e) =>
                      setAgeRestrictions({
                        ...ageRestrictions,
                        restrictedContent: e.target.checked
                      })
                    }
                  />
                  Enable Restricted Content Filtering
                </label>
                <p className="help-text">
                  Automatically filter content based on age restrictions
                </p>
              </div>

              <div className="control-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={ageRestrictions.ageVerification}
                    onChange={(e) =>
                      setAgeRestrictions({
                        ...ageRestrictions,
                        ageVerification: e.target.checked
                      })
                    }
                  />
                  Require Age Verification
                </label>
                <p className="help-text">
                  Require users to verify their age before accessing certain content
                </p>
              </div>

              <div className="control-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={ageRestrictions.parentalControls}
                    onChange={(e) =>
                      setAgeRestrictions({
                        ...ageRestrictions,
                        parentalControls: e.target.checked
                      })
                    }
                  />
                  Enable Parental Controls
                </label>
                <p className="help-text">
                  Allow parents to set restrictions for child accounts
                </p>
              </div>

              <button
                className="btn-primary"
                onClick={handleUpdateAgeRestrictions}
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Age Restrictions'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'regional-laws' && (
          <div className="regional-laws">
            <h3>Regional Laws & Compliance</h3>
            <div className="compliance-controls">
              <div className="control-group">
                <label>Select Region</label>
                <select
                  value={selectedRegion}
                  onChange={(e) => {
                    const newRegion = e.target.value;
                    setSelectedRegion(newRegion);
                    // Load settings for selected region
                    const currentLaw = regionalLaws.find(law => law.region === newRegion);
                    if (currentLaw) {
                      setRegionSettings({
                        contentRestrictions: currentLaw.contentRestrictions || [],
                        dataRetention: currentLaw.dataRetention || 365,
                        gdprCompliant: currentLaw.gdprCompliant || false
                      });
                    } else {
                      // Reset to defaults if region not found
                      setRegionSettings({
                        contentRestrictions: [],
                        dataRetention: 365,
                        gdprCompliant: false
                      });
                    }
                  }}
                >
                  <option value="US">United States</option>
                  <option value="EU">European Union</option>
                  <option value="UK">United Kingdom</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="IN">India</option>
                  <option value="CN">China</option>
                </select>
              </div>

              <div className="control-group">
                <label>Data Retention Period (days)</label>
                <input
                  type="number"
                  value={regionSettings.dataRetention}
                  onChange={(e) =>
                    setRegionSettings({
                      ...regionSettings,
                      dataRetention: parseInt(e.target.value)
                    })
                  }
                  min="0"
                  max="3650"
                />
                <p className="help-text">
                  How long to retain user data according to regional laws
                </p>
              </div>

              <div className="control-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={regionSettings.gdprCompliant}
                    onChange={(e) =>
                      setRegionSettings({
                        ...regionSettings,
                        gdprCompliant: e.target.checked
                      })
                    }
                  />
                  GDPR Compliant (EU regions)
                </label>
                <p className="help-text">
                  Enable GDPR compliance features for EU users
                </p>
              </div>

              <div className="control-group">
                <label>Content Restrictions</label>
                <div className="restriction-tags">
                  {regionSettings.contentRestrictions.map((restriction, index) => (
                    <span key={index} className="restriction-tag">
                      {restriction}
                      <button onClick={() => {
                        const newRestrictions = regionSettings.contentRestrictions.filter((_, i) => i !== index);
                        setRegionSettings({
                          ...regionSettings,
                          contentRestrictions: newRestrictions
                        });
                      }}>×</button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Add restriction"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        setRegionSettings({
                          ...regionSettings,
                          contentRestrictions: [
                            ...regionSettings.contentRestrictions,
                            e.target.value.trim()
                          ]
                        });
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={handleUpdateRegionalLaws}
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Regional Settings'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'legal-hold' && (
          <div className="legal-hold">
            <h3>Legal Hold on Content</h3>
            <div className="legal-hold-content">
              <div className="legal-hold-form">
                <h4>Create New Legal Hold</h4>
                <div className="form-group">
                  <label>Case ID</label>
                  <input
                    type="text"
                    value={newLegalHold.caseId}
                    onChange={(e) =>
                      setNewLegalHold({
                        ...newLegalHold,
                        caseId: e.target.value
                      })
                    }
                    placeholder="Enter case ID"
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={newLegalHold.description}
                    onChange={(e) =>
                      setNewLegalHold({
                        ...newLegalHold,
                        description: e.target.value
                      })
                    }
                    placeholder="Describe the legal hold requirement"
                    rows="4"
                  />
                </div>

                <div className="form-group">
                  <label>Affected Content IDs</label>
                  <input
                    type="text"
                    placeholder="Enter content IDs (comma separated)"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        const ids = e.target.value.split(',').map(id => id.trim());
                        setNewLegalHold({
                          ...newLegalHold,
                          affectedContent: [...newLegalHold.affectedContent, ...ids]
                        });
                        e.target.value = '';
                      }
                    }}
                  />
                  <div className="content-ids-list">
                    {newLegalHold.affectedContent.map((id, index) => (
                      <span key={index} className="content-id-tag">
                        {id}
                        <button onClick={() => {
                          const newContent = newLegalHold.affectedContent.filter((_, i) => i !== index);
                          setNewLegalHold({
                            ...newLegalHold,
                            affectedContent: newContent
                          });
                        }}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Expiry Date</label>
                  <input
                    type="date"
                    value={newLegalHold.expiryDate}
                    onChange={(e) =>
                      setNewLegalHold({
                        ...newLegalHold,
                        expiryDate: e.target.value
                      })
                    }
                  />
                </div>

                <button
                  className="btn-primary"
                  onClick={handleCreateLegalHold}
                  disabled={loading || !newLegalHold.caseId || !newLegalHold.description}
                >
                  {loading ? 'Creating...' : 'Create Legal Hold'}
                </button>
              </div>

              <div className="legal-holds-list">
                <h4>Active Legal Holds</h4>
                {legalHolds.length === 0 ? (
                  <p className="empty-state">No active legal holds</p>
                ) : (
                  legalHolds.map((hold) => (
                    <div key={hold._id || hold.id} className="legal-hold-item">
                      <div className="hold-header">
                        <span className="case-id">Case: {hold.caseId}</span>
                        <span className={`hold-status ${hold.status || 'active'}`}>
                          {hold.status || 'active'}
                        </span>
                      </div>
                      <p className="hold-description">{hold.description}</p>
                      <div className="hold-details">
                        <span>Content IDs: {hold.affectedContent?.length || 0}</span>
                        <span>Expiry: {hold.expiryDate ? new Date(hold.expiryDate).toLocaleDateString() : 'No expiry'}</span>
                        <span>Created: {hold.createdAt ? new Date(hold.createdAt).toLocaleDateString() : (hold.createdDate || 'N/A')}</span>
                      </div>
                      {hold.createdBy && (
                        <div className="hold-creator">
                          Created by: {hold.createdBy.username || hold.createdBy.email || 'Admin'}
                        </div>
                      )}
                      <div className="hold-actions">
                        <button className="btn-view">View Details</button>
                        <button className="btn-remove">Release Hold</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'law-enforcement' && (
          <div className="law-enforcement">
            <h3>Law Enforcement Requests Panel</h3>
            <div className="law-enforcement-content">
              <div className="request-form-section">
                <h4>New Law Enforcement Request</h4>
                <div className="compliance-controls">
                  <div className="form-group">
                    <label>Case Number</label>
                    <input
                      type="text"
                      value={newRequest.caseNumber}
                      onChange={(e) => setNewRequest({ ...newRequest, caseNumber: e.target.value })}
                      placeholder="Enter case number"
                    />
                  </div>

                  <div className="form-group">
                    <label>Requesting Agency</label>
                    <input
                      type="text"
                      value={newRequest.requestingAgency}
                      onChange={(e) => setNewRequest({ ...newRequest, requestingAgency: e.target.value })}
                      placeholder="Enter agency name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Request Type</label>
                    <select
                      value={newRequest.requestType}
                      onChange={(e) => setNewRequest({ ...newRequest, requestType: e.target.value })}
                    >
                      <option value="data_request">Data Request</option>
                      <option value="account_information">Account Information</option>
                      <option value="content_removal">Content Removal</option>
                      <option value="preservation">Data Preservation</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Urgency Level</label>
                    <select
                      value={newRequest.urgency}
                      onChange={(e) => setNewRequest({ ...newRequest, urgency: e.target.value })}
                    >
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={newRequest.description}
                      onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                      placeholder="Describe the request"
                      rows="4"
                    />
                  </div>

                  <button
                    className="btn-primary"
                    onClick={async () => {
                      if (!newRequest.caseNumber.trim() || !newRequest.requestingAgency.trim() || !newRequest.description.trim()) {
                        const errorMsg = document.createElement('div');
                        errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000; font-weight: 600; font-size: 14px;';
                        errorMsg.textContent = '✗ Please fill in Case Number, Agency, and Description';
                        document.body.appendChild(errorMsg);
                        setTimeout(() => {
                          errorMsg.style.transition = 'opacity 0.3s';
                          errorMsg.style.opacity = '0';
                          setTimeout(() => errorMsg.remove(), 300);
                        }, 3000);
                        return;
                      }
                      
                      setLoading(true);
                      try {
                        const result = await createLawEnforcementRequest(newRequest);
                        if (result.success) {
                          // Show success notification
                          const successMsg = document.createElement('div');
                          successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #28a745; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000; font-weight: 600; font-size: 14px;';
                          successMsg.textContent = '✓ Law enforcement request created successfully!';
                          document.body.appendChild(successMsg);
                          setTimeout(() => {
                            successMsg.style.transition = 'opacity 0.3s';
                            successMsg.style.opacity = '0';
                            setTimeout(() => successMsg.remove(), 300);
                          }, 3000);
                          
                          // Reset form
                          setNewRequest({
                            caseNumber: '',
                            requestingAgency: '',
                            requestType: 'data_request',
                            description: '',
                            urgency: 'normal',
                            affectedUsers: []
                          });
                          
                          // Reload requests list
                          loadLawEnforcementRequests();
                        } else {
                          throw new Error(result.message || 'Creation failed');
                        }
                      } catch (error) {
                        console.error('Error creating request:', error);
                        const errorMsg = document.createElement('div');
                        errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #dc3545; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 10000; font-weight: 600; font-size: 14px;';
                        errorMsg.textContent = '✗ Failed to create: ' + (error.message || 'Unknown error');
                        document.body.appendChild(errorMsg);
                        setTimeout(() => {
                          errorMsg.style.transition = 'opacity 0.3s';
                          errorMsg.style.opacity = '0';
                          setTimeout(() => errorMsg.remove(), 300);
                        }, 3000);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading || !newRequest.caseNumber || !newRequest.requestingAgency || !newRequest.description}
                  >
                    {loading ? 'Creating...' : 'Create Request'}
                  </button>
                </div>
              </div>

              <div className="requests-list-section">
                <h4>Active Law Enforcement Requests</h4>
                {lawEnforcementRequests.length === 0 ? (
                  <div className="empty-state">No active requests</div>
                ) : (
                  <div className="requests-list">
                    {lawEnforcementRequests.map((request) => (
                      <div key={request._id || request.id} className="request-item">
                        <div className="request-header">
                          <span className="case-number">Case: {request.caseNumber}</span>
                          <span className={`urgency-badge urgency-${request.urgency || 'normal'}`}>
                            {request.urgency || 'normal'}
                          </span>
                          <span className={`status-badge status-${request.status || 'pending'}`}>
                            {request.status || 'pending'}
                          </span>
                        </div>
                        <p className="request-agency">Agency: {request.requestingAgency}</p>
                        <p className="request-type">Type: {request.requestType || 'data_request'}</p>
                        <p className="request-description">{request.description}</p>
                        {request.affectedUsers && request.affectedUsers.length > 0 && (
                          <p className="request-users">Affected Users: {request.affectedUsers.length}</p>
                        )}
                        <div className="request-meta">
                          <span>Created: {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : 'N/A'}</span>
                          {request.createdBy && (
                            <span>By: {request.createdBy.username || request.createdBy.email || 'Admin'}</span>
                          )}
                        </div>
                        <div className="request-actions">
                          <button className="admin-btn admin-btn-view">View Details</button>
                          <button className="admin-btn admin-btn-success">Approve</button>
                          <button className="admin-btn admin-btn-danger">Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
          </div>
          </div>
      </div>
      </div>
    </div>
  );
};

export default PolicyCompliance;
