import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getVerificationStatus, requestVerification } from '../api/verification';
import './UserVerification.css';

const UserVerification = ({ onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [verificationDetails, setVerificationDetails] = useState(null);
  const [applicationStatus, setApplicationStatus] = useState('not_requested'); // not_requested | pending | approved | rejected
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.profile?.displayName || '',
    category: 'creator',
    website: '',
    instagram: '',
    twitter: '',
    reason: '',
    additionalInfo: '',
  });
  const [documents, setDocuments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);

  const verificationRequirements = [
    {
      icon: 'fa-solid fa-check-circle',
      title: 'Authentic',
      description: 'Your account must represent a real person, registered business, or entity.',
    },
    {
      icon: 'fa-solid fa-id-card',
      title: 'Unique',
      description: 'You must be the unique presence of the person or business you represent.',
    },
    {
      icon: 'fa-solid fa-star',
      title: 'Notable',
      description: 'Your account should be highly searched or featured in press or media.',
    },
    {
      icon: 'fa-solid fa-shield-halved',
      title: 'Active',
      description: 'Post regularly and stay compliant with our community guidelines.',
    },
  ];

  const resetForm = useCallback(() => {
    setFormData({
      fullName: user?.profile?.displayName || '',
      category: 'creator',
      website: '',
      instagram: '',
      twitter: '',
      reason: '',
      additionalInfo: '',
    });
    setDocuments([]);
    setDocumentTypes([]);
    setShowApplicationForm(false);
  }, [user?.profile?.displayName]);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getVerificationStatus();
      const status = response?.status || response?.verification?.status || 'not_requested';
      setApplicationStatus(status);
      setVerificationDetails(response?.verification || null);
      if (status === 'pending' || status === 'approved') {
        setShowApplicationForm(false);
      }
    } catch (err) {
      console.error('Failed to load verification status:', err);
      setError(err?.response?.data?.message || 'Unable to load verification status right now.');
      setApplicationStatus('not_requested');
      setVerificationDetails(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleDocumentsChange = (event) => {
    const files = Array.from(event.target.files || []).slice(0, 5);
    setDocuments(files);
    setDocumentTypes(files.map(() => 'id'));
  };

  const updateDocumentType = (index, type) => {
    setDocumentTypes((prev) => {
      const copy = [...prev];
      copy[index] = type;
      return copy;
    });
  };

  const handleSubmitApplication = async (event) => {
    event.preventDefault();
    if (!formData.fullName.trim()) {
      alert('Please provide the full name or business name associated with this account.');
      return;
    }
    if (!formData.reason.trim()) {
      alert('Tell us why your account should be verified.');
      return;
    }
    if (documents.length === 0) {
      alert('Upload at least one supporting document (ID, press coverage, business registration, etc.).');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = new FormData();
    payload.append('fullName', formData.fullName.trim());
    payload.append('category', formData.category);
    if (formData.website) payload.append('website', formData.website.trim());

    const description = [
      formData.reason?.trim(),
      formData.additionalInfo?.trim(),
      formData.instagram ? `Instagram: ${formData.instagram.trim()}` : '',
      formData.twitter ? `Twitter: ${formData.twitter.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (description) {
      payload.append('description', description);
    }

    documents.forEach((file, index) => {
      payload.append('documents', file);
      payload.append(`documentType_${index}`, documentTypes[index] || 'id');
    });

    try {
      const response = await requestVerification(payload);
      setApplicationStatus('pending');
      setVerificationDetails(response?.verification || null);
      alert(response?.message || 'Verification request submitted. We\'ll notify you when it has been reviewed.');
      resetForm();
    } catch (err) {
      console.error('Verification submission failed:', err);
      setError(err?.response?.data?.message || 'Unable to submit verification right now. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusInfo = useMemo(() => {
    switch (applicationStatus) {
      case 'pending':
        return {
          icon: 'fa-solid fa-clock',
          title: 'Application Under Review',
          description: 'We are reviewing your verification request. Reviews typically take 7-30 days.',
          color: '#FFC107',
        };
      case 'approved':
        return {
          icon: 'fa-solid fa-check-circle',
          title: 'Verified Account',
          description: 'Congratulations! Your account has been approved for verification.',
          color: '#10B981',
        };
      case 'rejected':
        return {
          icon: 'fa-solid fa-times-circle',
          title: 'Application Rejected',
          description: 'Your verification request was not approved. You can reapply after 30 days.',
          color: '#EF4444',
        };
      default:
        return null;
    }
  }, [applicationStatus]);

  return (
    <div className="user-verification-overlay" onClick={onClose}>
      <div className="user-verification-modal" onClick={(event) => event.stopPropagation()}>
        <div className="verification-header">
          <button className="verification-close" onClick={onClose} aria-label="Close verification modal">
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>Account Verification</h2>
          <div className="verification-header-placeholder"></div>
        </div>

        <div className="verification-content">
          {loading ? (
            <div className="verification-loading">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <p>Loading verification status...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="verification-error">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <p>{error}</p>
                </div>
              )}

              {statusInfo && (
                <div className="verification-status-banner" style={{ borderColor: statusInfo.color }}>
                  <i className={statusInfo.icon} style={{ color: statusInfo.color }}></i>
                  <div className="status-info">
                    <h3 style={{ color: statusInfo.color }}>{statusInfo.title}</h3>
                    <p>{statusInfo.description}</p>
                    {applicationStatus === 'rejected' && verificationDetails?.rejectionReason && (
                      <p className="status-reason">
                        <strong>Reason:</strong> {verificationDetails.rejectionReason}
                      </p>
                    )}
                    {verificationDetails?.reviewedAt && (
                      <p className="status-meta">
                        Reviewed on {new Date(verificationDetails.reviewedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="verification-preview">
                <div className="verification-badge-preview">
                  <div className="profile-preview">
                    <img
                      src={user?.profile?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'Creator'}&background=2563EB&color=fff`}
                      alt={user?.username}
                    />
                    {applicationStatus === 'approved' && (
                      <div className="verified-badge">
                        <i className="fa-solid fa-check"></i>
                      </div>
                    )}
                  </div>
                  <h3>@{user?.username}</h3>
                  <p>This is how your verified badge will appear.</p>
                </div>
              </div>

              <div className="verification-requirements">
                <h3>Verification Requirements</h3>
                <div className="requirements-grid">
                  {verificationRequirements.map((requirement, index) => (
                    <div key={requirement.title + index} className="requirement-card">
                      <div className="requirement-icon">
                        <i className={requirement.icon}></i>
                      </div>
                      <h4>{requirement.title}</h4>
                      <p>{requirement.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {(applicationStatus === 'not_requested' || applicationStatus === 'rejected') && (
                <>
                  {!showApplicationForm ? (
                    <div className="verification-apply">
                      <button className="apply-verification-btn" onClick={() => setShowApplicationForm(true)}>
                        <i className="fa-solid fa-shield-halved"></i>
                        <span>{applicationStatus === 'rejected' ? 'Reapply for Verification' : 'Apply for Verification'}</span>
                      </button>
                      <p className="apply-hint">Make sure you meet all requirements before applying.</p>
                    </div>
                  ) : (
                    <form className="verification-form" onSubmit={handleSubmitApplication}>
                      <fieldset disabled={submitting}>
                        <div className="form-group">
                          <label>Full Name / Business Name</label>
                          <input
                            type="text"
                            value={formData.fullName}
                            onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
                            placeholder="Enter your full name or business name"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label>Category</label>
                          <select
                            value={formData.category}
                            onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                            required
                          >
                            <option value="creator">Creator / Influencer</option>
                            <option value="brand">Brand / Business</option>
                            <option value="public_figure">Public Figure</option>
                            <option value="organization">Organization</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Official Website (Optional)</label>
                          <input
                            type="url"
                            value={formData.website}
                            onChange={(event) => setFormData({ ...formData, website: event.target.value })}
                            placeholder="https://example.com"
                          />
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label>Instagram Handle (Optional)</label>
                            <input
                              type="text"
                              value={formData.instagram}
                              onChange={(event) => setFormData({ ...formData, instagram: event.target.value })}
                              placeholder="@username"
                            />
                          </div>
                          <div className="form-group">
                            <label>Twitter / X Handle (Optional)</label>
                            <input
                              type="text"
                              value={formData.twitter}
                              onChange={(event) => setFormData({ ...formData, twitter: event.target.value })}
                              placeholder="@username"
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Why should you be verified?</label>
                          <textarea
                            value={formData.reason}
                            onChange={(event) => setFormData({ ...formData, reason: event.target.value })}
                            placeholder="Explain why you meet the verification requirements..."
                            rows="4"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label>Additional Information (Optional)</label>
                          <textarea
                            value={formData.additionalInfo}
                            onChange={(event) => setFormData({ ...formData, additionalInfo: event.target.value })}
                            placeholder="Press coverage, notable collaborations, etc."
                            rows="3"
                          />
                        </div>

                        <div className="form-group">
                          <label>Supporting Documents (max 5 files)</label>
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf"
                            multiple
                            onChange={handleDocumentsChange}
                            required
                          />
                          {documents.length > 0 && (
                            <div className="uploaded-documents">
                              {documents.map((file, index) => (
                                <div key={`${file.name}-${index}`} className="uploaded-document">
                                  <div>
                                    <strong>{file.name}</strong>
                                    <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                                  </div>
                                  <select
                                    value={documentTypes[index] || 'id'}
                                    onChange={(event) => updateDocumentType(index, event.target.value)}
                                  >
                                    <option value="id">Government ID</option>
                                    <option value="business">Business Registration</option>
                                    <option value="press">Press Coverage</option>
                                    <option value="branding">Brand Assets</option>
                                    <option value="other">Other</option>
                                  </select>
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="documents-hint">Accepted formats: JPG, PNG, or PDF (max 5MB each).</p>
                        </div>
                      </fieldset>

                      <div className="form-actions">
                        <button
                          type="button"
                          className="cancel-btn"
                          onClick={resetForm}
                          disabled={submitting}
                        >
                          Cancel
                        </button>
                        <button type="submit" className="submit-btn" disabled={submitting}>
                          <i className="fa-solid fa-paper-plane"></i>
                          <span>{submitting ? 'Submitting...' : 'Submit Application'}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}

              {applicationStatus === 'pending' && verificationDetails?.documents?.length ? (
                <div className="submitted-documents">
                  <h3>Submitted Documents</h3>
                  <ul>
                    {verificationDetails.documents.map((doc, index) => (
                      <li key={`${doc.url}-${index}`}>
                        <i className="fa-solid fa-file"></i>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          {(doc.type || 'Document').toUpperCase()} • {new Date(doc.uploadedAt).toLocaleDateString()}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserVerification;

