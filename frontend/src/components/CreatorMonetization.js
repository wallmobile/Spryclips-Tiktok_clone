import React, { useEffect, useMemo, useState } from 'react';
import { 
  getCreatorBalance, 
  getEarnings, 
  getTransactions,
  getCreatorFundStatus,
  applyToCreatorFund,
  approveCreatorFund,
  getAdsStatus,
  enableAds,
  getSubscriptionsStatus,
  enableSubscriptions,
  getTipJar
} from '../api/monetization';
import { getPartnerships, createPartnership, cancelPartnership, completeDeliverable, markPartnershipComplete, getPartnershipStats } from '../api/partnerships';
import './CreatorMonetization.css';

const CreatorMonetization = ({ onClose }) => {

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [partnershipStats, setPartnershipStats] = useState({
    total: 0, pending: 0, active: 0, completed: 0, totalEarnings: 0, pendingEarnings: 0
  });

  const [creatorFund, setCreatorFund] = useState({
    totalEarnings: 0,
    thisMonth: 0,
    lastMonth: 0,
    eligibility: false,
    estimatedPayout: 0,
    nextPayoutDate: null,
    totalViews: 0,
    totalLikes: 0,
    engagementRate: 0,
  });

  const [partnerships, setPartnerships] = useState([]);

  const [adsRevenue, setAdsRevenue] = useState({
    totalEarnings: 0,
    thisMonth: 0,
    impressions: 0,
    cpm: 0,
    clicks: 0,
    ctr: 0,
  });

  const [subscriptions, setSubscriptions] = useState({
    totalSubscribers: 0,
    monthlyRevenue: 0,
    newThisMonth: 0,
    churnRate: 0,
    averageLifetime: 0,
    plans: [],
  });

  const [tipJar, setTipJar] = useState({
    totalTips: 0,
    thisMonth: 0,
    totalTippers: 0,
    averageTip: 0,
    recentTips: [],
  });

  const [showPartnershipForm, setShowPartnershipForm] = useState(false);
  const [partnershipForm, setPartnershipForm] = useState({
    brandName: '',
    contactEmail: '',
    campaignName: '',
    campaignType: 'sponsored',
    budget: '',
    deliverables: 1,
    deadline: '',
    description: '',
    requirements: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [showAdsModal, setShowAdsModal] = useState(false);
  const [adsSettings, setAdsSettings] = useState({
    enabled: false,
    adTypes: {
      preRoll: true,
      midRoll: false,
      postRoll: true,
      banner: true
    },
    frequency: 'medium',
    contentCategories: ['entertainment', 'lifestyle'],
    minVideoLength: 60
  });

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionSettings, setSubscriptionSettings] = useState({
    enabled: false,
    plans: [
      { name: 'Supporter', price: 4.99, benefits: ['Ad-free viewing', 'Exclusive badge'] },
      { name: 'VIP', price: 9.99, benefits: ['Ad-free viewing', 'Exclusive badge', 'Early access', 'Monthly shoutout'] }
    ]
  });

  const isWithinDays = (date, days) => {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return false;
    return Date.now() - parsed.getTime() <= days * 24 * 60 * 60 * 1000;
  };

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [balanceRes, earningsRes, transactionsRes] = await Promise.all([
          getCreatorBalance().catch((err) => {
            console.error('Balance fetch failed', err);
            return null;
          }),
          getEarnings('30d').catch((err) => {
            console.error('Earnings fetch failed', err);
            return null;
          }),
          getTransactions({ limit: 50 }).catch((err) => {
            console.error('Transactions fetch failed', err);
            return null;
          }),
        ]);

        if (cancelled) return;

        const balance = balanceRes?.balance || {};
        const earnings = earningsRes?.earnings || {};
        const transactions = transactionsRes?.transactions || [];

        const earningsThisMonth = (earnings.transactions || [])
          .filter((tx) => tx.createdAt && isWithinDays(tx.createdAt, 30))
          .reduce((sum, tx) => sum + (tx.amount || 0), 0);

        const giftsReceived = transactions.filter((tx) => tx.type === 'gift_received');
        const totalTips = giftsReceived.reduce((sum, tx) => sum + (tx.amount || 0), 0);
        const recentTips = giftsReceived.slice(0, 5).map((tx) => ({
          id: tx._id || tx.id,
          username: tx.relatedUser?.username || 'supporter',
          amount: tx.amount || 0,
          message: tx.description || '',
          date: tx.createdAt || new Date().toISOString(),
        }));

        setCreatorFund((prev) => ({
          ...prev,
          totalEarnings: balance.totalEarnings ?? earnings.total ?? prev.totalEarnings,
          thisMonth: earningsThisMonth || prev.thisMonth,
          estimatedPayout: earnings.pending ?? prev.estimatedPayout,
          nextPayoutDate: prev.nextPayoutDate || new Date().toISOString().slice(0, 10),
          eligibility: true,
        }));

        setAdsRevenue((prev) => ({
          ...prev,
          totalEarnings: balance.totalPaid ?? prev.totalEarnings,
          thisMonth: balance.availableBalance ?? prev.thisMonth,
        }));

        setSubscriptions((prev) => ({
          ...prev,
          monthlyRevenue: earnings.total ?? prev.monthlyRevenue,
          plans: prev.plans.length ? prev.plans : [
            { id: 1, name: 'Supporter', price: 4.99, subscribers: 0 },
            { id: 2, name: 'VIP', price: 9.99, subscribers: 0 },
          ],
        }));

        setTipJar({
          totalTips,
          thisMonth: recentTips.filter((tip) => isWithinDays(tip.date, 30)).reduce((sum, tip) => sum + tip.amount, 0),
          totalTippers: recentTips.length,
          averageTip: recentTips.length ? totalTips / recentTips.length : 0,
          recentTips,
        });

        // Fetch partnerships from backend
        try {
          const [partnershipsRes, statsRes] = await Promise.all([
            getPartnerships().catch(() => null),
            getPartnershipStats().catch(() => null)
          ]);
          
          if (partnershipsRes?.partnerships) {
            const formattedPartnerships = partnershipsRes.partnerships.map(p => ({
              id: p._id,
              brandName: p.brandName,
              campaignName: p.campaignName,
              status: p.status,
              earnings: p.budget,
              deadline: p.deadline?.split('T')[0],
              deliverables: p.totalDeliverables,
              completed: p.completedDeliverables || 0,
              type: p.campaignType,
              description: p.description
            }));
            setPartnerships(formattedPartnerships);
          }
          
          if (statsRes?.stats) {
            setPartnershipStats(statsRes.stats);
          }
        } catch (partErr) {
          console.log('Partnerships fetch failed, using fallback:', partErr);
        }

        // Fetch Creator Fund status
        try {
          const fundRes = await getCreatorFundStatus().catch(() => null);
          if (fundRes?.fundStatus) {
            setCreatorFund(prev => ({
              ...prev,
              status: fundRes.fundStatus.status,
              isEligible: fundRes.fundStatus.isEligible,
              totalEarnings: fundRes.fundStatus.totalEarnings || prev.totalEarnings,
              eligibilitySnapshot: fundRes.fundStatus.eligibilitySnapshot,
              requirements: fundRes.fundStatus.requirements
            }));
          }
        } catch (err) {
          console.log('Creator Fund status fetch failed:', err);
        }

        // Fetch Ads status
        try {
          const adsRes = await getAdsStatus().catch(() => null);
          if (adsRes?.adsStatus) {
            setAdsRevenue(prev => ({
              ...prev,
              enabled: adsRes.adsStatus.adsEnabled,
              totalEarnings: adsRes.adsStatus.totalEarnings || prev.totalEarnings,
              thisMonth: adsRes.adsStatus.currentMonthEarnings || prev.thisMonth,
              impressions: adsRes.adsStatus.totalImpressions || prev.impressions,
              clicks: adsRes.adsStatus.totalClicks || prev.clicks,
              cpm: adsRes.adsStatus.cpm || prev.cpm
            }));
            setAdsSettings(prev => ({
              ...prev,
              enabled: adsRes.adsStatus.adsEnabled,
              ...adsRes.adsStatus.settings
            }));
          }
        } catch (err) {
          console.log('Ads status fetch failed:', err);
        }

        // Fetch Subscriptions status
        try {
          const subsRes = await getSubscriptionsStatus().catch(() => null);
          if (subsRes) {
            setSubscriptions(prev => ({
              ...prev,
              totalSubscribers: subsRes.stats?.totalSubscribers || prev.totalSubscribers,
              monthlyRevenue: subsRes.stats?.monthlyRevenue || prev.monthlyRevenue,
              plans: subsRes.plans?.length ? subsRes.plans.map(p => ({
                id: p._id,
                name: p.name,
                price: p.price,
                subscribers: p.subscriberCount
              })) : prev.plans
            }));
            setSubscriptionSettings(prev => ({
              ...prev,
              enabled: subsRes.settings?.enabled || false,
              plans: subsRes.plans?.length ? subsRes.plans.map(p => ({
                name: p.name,
                price: p.price,
                benefits: p.benefits || []
              })) : prev.plans
            }));
          }
        } catch (err) {
          console.log('Subscriptions status fetch failed:', err);
        }

        // Fetch Tip Jar
        try {
          const tipRes = await getTipJar().catch(() => null);
          if (tipRes?.tipjar) {
            setTipJar(prev => ({
              ...prev,
              totalTips: tipRes.tipjar.totalReceived || prev.totalTips,
              thisMonth: tipRes.tipjar.monthlyReceived || prev.thisMonth,
              totalTippers: tipRes.tipjar.tipCount || prev.totalTippers,
              recentTips: tipRes.tipjar.recentTips?.map(t => ({
                id: t._id,
                username: t.sender?.username || 'supporter',
                amount: t.value,
                message: t.message,
                date: t.createdAt
              })) || prev.recentTips
            }));
          }
        } catch (err) {
          console.log('Tip Jar fetch failed:', err);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load monetization data', err);
          setError('Unable to load monetization insights right now.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const overviewTotals = useMemo(() => {
    const partnershipTotal = partnerships.reduce((sum, p) => sum + (p.earnings || 0), 0);
    return {
      overall:
        creatorFund.totalEarnings +
        adsRevenue.totalEarnings +
        subscriptions.monthlyRevenue +
        tipJar.totalTips +
        partnershipTotal,
      creatorFund: creatorFund.totalEarnings,
      ads: adsRevenue.totalEarnings,
      subscriptions: subscriptions.monthlyRevenue,
      tips: tipJar.totalTips,
      partnerships: partnershipTotal,
    };
  }, [creatorFund, adsRevenue, subscriptions, tipJar, partnerships]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'fa-solid fa-chart-pie' },
    { id: 'creator-fund', label: 'Creator Fund', icon: 'fa-solid fa-dollar-sign' },
    { id: 'partnerships', label: 'Partnerships', icon: 'fa-solid fa-handshake' },
    { id: 'ads', label: 'Ads Revenue', icon: 'fa-solid fa-bullhorn' },
    { id: 'subscriptions', label: 'Subscriptions', icon: 'fa-solid fa-crown' },
    { id: 'tips', label: 'Tip Jar', icon: 'fa-solid fa-coins' }
  ];

  const handleCreatePartnership = () => {
    setShowPartnershipForm(true);
  };

  const handlePartnershipFormChange = (e) => {
    const { name, value } = e.target;
    setPartnershipForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitPartnership = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    
    try {
      const response = await createPartnership(partnershipForm);
      
      // Add to partnerships list from response
      const newPartnership = response.partnership;
      setPartnerships(prev => [{
        id: newPartnership._id,
        brandName: newPartnership.brandName,
        campaignName: newPartnership.campaignName,
        status: newPartnership.status,
        earnings: newPartnership.budget,
        deadline: newPartnership.deadline?.split('T')[0],
        deliverables: newPartnership.totalDeliverables,
        completed: newPartnership.completedDeliverables || 0,
        type: newPartnership.campaignType,
        description: newPartnership.description
      }, ...prev]);
      
      setShowPartnershipForm(false);
      setPartnershipForm({
        brandName: '',
        contactEmail: '',
        campaignName: '',
        campaignType: 'sponsored',
        budget: '',
        deliverables: 1,
        deadline: '',
        description: '',
        requirements: ''
      });
      
      setToast({ type: 'success', message: response.message || 'Partnership request sent! Waiting for brand approval.' });
      setTimeout(() => setToast(null), 3000);
      
    } catch (err) {
      console.error('Failed to create partnership:', err);
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to create partnership' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Cancel partnership
  const handleCancelPartnership = async (id) => {
    try {
      await cancelPartnership(id);
      setPartnerships(prev => prev.map(p => 
        p.id === id ? { ...p, status: 'cancelled' } : p
      ));
      setToast({ type: 'success', message: 'Partnership cancelled' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to cancel' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Complete deliverable
  const handleCompleteDeliverable = async (id) => {
    try {
      const response = await completeDeliverable(id);
      const updated = response.partnership;
      setPartnerships(prev => prev.map(p => 
        p.id === id ? { 
          ...p, 
          completed: updated.completedDeliverables,
          status: updated.status
        } : p
      ));
      setToast({ type: 'success', message: 'Deliverable completed!' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to complete' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Mark partnership complete
  const handleMarkComplete = async (id) => {
    try {
      const response = await markPartnershipComplete(id);
      setPartnerships(prev => prev.map(p => 
        p.id === id ? { ...p, status: 'completed' } : p
      ));
      setToast({ type: 'success', message: response.message || 'Partnership completed! Payment added to balance.' });
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to complete' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleEnableAds = () => {
    setShowAdsModal(true);
  };

  const handleSaveAdsSettings = async () => {
    try {
      const response = await enableAds(adsSettings);
      if (response.success) {
        setAdsSettings(prev => ({ ...prev, enabled: true }));
        setAdsRevenue(prev => ({ ...prev, enabled: true }));
        setShowAdsModal(false);
        setToast({ type: 'success', message: 'Ads enabled successfully!' });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      console.error('Failed to enable ads:', err);
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to enable ads' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleSetupSubscriptions = () => {
    setShowSubscriptionModal(true);
  };

  const handleSaveSubscriptionSettings = async () => {
    try {
      const response = await enableSubscriptions(subscriptionSettings.plans);
      if (response.success) {
        setSubscriptionSettings(prev => ({ ...prev, enabled: true }));
        if (response.plans) {
          setSubscriptions(prev => ({
            ...prev,
            plans: response.plans.map(p => ({
              id: p._id,
              name: p.name,
              price: p.price,
              subscribers: p.subscriberCount || 0
            }))
          }));
        }
        setShowSubscriptionModal(false);
        setToast({ type: 'success', message: 'Subscriptions enabled successfully!' });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      console.error('Failed to enable subscriptions:', err);
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to enable subscriptions' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Apply to Creator Fund
  const handleApplyCreatorFund = async () => {
    try {
      const response = await applyToCreatorFund();
      if (response.success) {
        setCreatorFund(prev => ({
          ...prev,
          status: response.fundStatus.status,
          appliedAt: response.fundStatus.appliedAt
        }));
        setToast({ type: 'success', message: response.message });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      console.error('Failed to apply to Creator Fund:', err);
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to apply' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Approve Creator Fund (for testing)
  const handleApproveCreatorFund = async () => {
    try {
      const response = await approveCreatorFund();
      if (response.success) {
        setCreatorFund(prev => ({
          ...prev,
          status: 'approved'
        }));
        setToast({ type: 'success', message: 'Creator Fund approved!' });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      console.error('Failed to approve Creator Fund:', err);
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to approve' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="creator-monetization-overlay" onClick={onClose}>
      <div className="creator-monetization-modal" onClick={(e) => e.stopPropagation()}>
        {/* Toast Notification */}
        {toast && (
          <div className={`monetization-toast ${toast.type}`}>
            <i className={`fa-solid ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
            {toast.message}
          </div>
        )}
        
        {/* Header */}
        <div className="monetization-header">
          <button className="monetization-close-btn" onClick={onClose}>
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>
            <i className="fa-solid fa-wallet"></i>
            Creator Monetization
          </h2>
          <div className="monetization-header-placeholder"></div>
        </div>

        {/* Tabs */}
        <div className="monetization-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`monetization-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={tab.icon}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="monetization-content">
          {loading && (
            <div className="monetization-loading">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <p>Loading monetization insights...</p>
            </div>
          )}

          {error && !loading && (
            <div className="monetization-error">
              <i className="fa-solid fa-circle-exclamation"></i>
              <p>{error}</p>
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && !loading && (
            <div className="overview-tab">
              <div className="total-earnings-card">
                <h3>Total Earnings</h3>
                <div className="total-amount">
                  {formatCurrency(overviewTotals.overall)}
                </div>
                <div className="earnings-breakdown">
                  <div className="breakdown-item">
                    <span className="breakdown-label">Creator Fund</span>
                    <span className="breakdown-value">{formatCurrency(overviewTotals.creatorFund)}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Ads Revenue</span>
                    <span className="breakdown-value">{formatCurrency(overviewTotals.ads)}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Subscriptions</span>
                    <span className="breakdown-value">{formatCurrency(overviewTotals.subscriptions)}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Tips</span>
                    <span className="breakdown-value">{formatCurrency(overviewTotals.tips)}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">Partnerships</span>
                    <span className="breakdown-value">{formatCurrency(overviewTotals.partnerships)}</span>
                  </div>
                </div>
              </div>

              <div className="quick-stats-grid">
                <div className="stat-card">
                  <i className="fa-solid fa-eye"></i>
                  <div className="stat-value">{formatNumber(creatorFund.totalViews)}</div>
                  <div className="stat-label">Total Views</div>
                </div>
                <div className="stat-card">
                  <i className="fa-solid fa-heart"></i>
                  <div className="stat-value">{formatNumber(creatorFund.totalLikes)}</div>
                  <div className="stat-label">Total Likes</div>
                </div>
                <div className="stat-card">
                  <i className="fa-solid fa-users"></i>
                  <div className="stat-value">{formatNumber(subscriptions.totalSubscribers)}</div>
                  <div className="stat-label">Subscribers</div>
                </div>
                <div className="stat-card">
                  <i className="fa-solid fa-percent"></i>
                  <div className="stat-value">{creatorFund.engagementRate}%</div>
                  <div className="stat-label">Engagement Rate</div>
                </div>
              </div>

              <div className="recent-activity">
                <h3>Recent Activity</h3>
                <div className="activity-list">
                  {tipJar.recentTips.slice(0, 5).map(tip => (
                    <div key={tip.id} className="activity-item">
                      <i className="fa-solid fa-coins"></i>
                      <div className="activity-info">
                        <div className="activity-title">Tip from @{tip.username}</div>
                        <div className="activity-subtitle">{formatCurrency(tip.amount)}</div>
                      </div>
                      <div className="activity-time">{tip.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Creator Fund Tab */}
          {activeTab === 'creator-fund' && !loading && (
            <div className="creator-fund-tab">
              <div className="fund-status-card">
                <div className="status-header">
                  <h3>Creator Fund Status</h3>
                  {creatorFund.eligibility ? (
                    <span className="status-badge eligible">Eligible</span>
                  ) : (
                    <span className="status-badge not-eligible">Not Eligible</span>
                  )}
                </div>
                <div className="fund-stats">
                  <div className="fund-stat">
                    <div className="fund-stat-value">{formatCurrency(creatorFund.thisMonth)}</div>
                    <div className="fund-stat-label">This Month</div>
                  </div>
                  <div className="fund-stat">
                    <div className="fund-stat-value">{formatCurrency(creatorFund.estimatedPayout)}</div>
                    <div className="fund-stat-label">Next Payout</div>
                  </div>
                  <div className="fund-stat">
                    <div className="fund-stat-value">{creatorFund.nextPayoutDate}</div>
                    <div className="fund-stat-label">Payout Date</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {creatorFund.status === 'not_applied' && (
                    <button className="apply-fund-btn" onClick={handleApplyCreatorFund}>
                      <i className="fa-solid fa-paper-plane"></i>
                      Apply for Creator Fund
                    </button>
                  )}
                  {creatorFund.status === 'pending' && (
                    <>
                      <span style={{ 
                        padding: '10px 20px', 
                        background: '#FEF3C7', 
                        color: '#92400E',
                        borderRadius: '8px',
                        fontWeight: '600'
                      }}>
                        <i className="fa-solid fa-clock" style={{ marginRight: '8px' }}></i>
                        Application Pending
                      </span>
                      <button 
                        className="apply-fund-btn" 
                        onClick={handleApproveCreatorFund}
                        style={{ background: '#10B981' }}
                      >
                        <i className="fa-solid fa-check"></i>
                        Test Approve
                      </button>
                    </>
                  )}
                  {creatorFund.status === 'approved' && (
                    <span style={{ 
                      padding: '10px 20px', 
                      background: '#D1FAE5', 
                      color: '#065F46',
                      borderRadius: '8px',
                      fontWeight: '600'
                    }}>
                      <i className="fa-solid fa-check-circle" style={{ marginRight: '8px' }}></i>
                      Enrolled in Creator Fund
                    </span>
                  )}
                </div>
              </div>

              <div className="eligibility-requirements">
                <h3>Eligibility Requirements</h3>
                <ul>
                  <li>
                    <i className="fa-solid fa-check-circle"></i>
                    10,000+ followers
                  </li>
                  <li>
                    <i className="fa-solid fa-check-circle"></i>
                    100,000+ views in last 30 days
                  </li>
                  <li>
                    <i className="fa-solid fa-check-circle"></i>
                    18+ years old
                  </li>
                  <li>
                    <i className="fa-solid fa-check-circle"></i>
                    Account in good standing
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Partnerships Tab */}
          {activeTab === 'partnerships' && !loading && (
            <div className="partnerships-tab">
              <div className="partnerships-header">
                <h3>Brand Partnerships</h3>
                <button className="create-partnership-btn" onClick={handleCreatePartnership}>
                  <i className="fa-solid fa-plus"></i>
                  New Partnership Request
                </button>
              </div>

              {/* Partnership Stats */}
              <div className="partnership-stats-grid">
                <div className="partnership-stat">
                  <span className="stat-number">{partnershipStats.total}</span>
                  <span className="stat-label">Total</span>
                </div>
                <div className="partnership-stat pending">
                  <span className="stat-number">{partnershipStats.pending}</span>
                  <span className="stat-label">Pending</span>
                </div>
                <div className="partnership-stat active">
                  <span className="stat-number">{partnershipStats.active}</span>
                  <span className="stat-label">Active</span>
                </div>
                <div className="partnership-stat completed">
                  <span className="stat-number">{partnershipStats.completed}</span>
                  <span className="stat-label">Completed</span>
                </div>
              </div>

              {/* Info Box */}
              <div className="partnership-info-box">
                <i className="fa-solid fa-info-circle"></i>
                <p>
                  <strong>How it works:</strong> Create a partnership request → Brand receives notification → 
                  Brand approves/rejects → Complete deliverables → Get paid!
                </p>
              </div>

              <div className="partnerships-list">
                {partnerships.length === 0 ? (
                  <div className="no-partnerships">
                    <i className="fa-solid fa-handshake"></i>
                    <h4>No partnerships yet</h4>
                    <p>Create your first partnership request to start collaborating with brands!</p>
                  </div>
                ) : partnerships.map(partnership => (
                  <div key={partnership.id} className={`partnership-card ${partnership.status || 'pending'}`}>
                    <div className="partnership-header">
                      <div className="partnership-info">
                        <h4>{partnership.brandName}</h4>
                        <p>{partnership.campaignName}</p>
                        {partnership.type && (
                          <span className="partnership-type">{partnership.type}</span>
                        )}
                      </div>
                      <span className={`partnership-status ${partnership.status}`}>
                        {partnership.status === 'pending' && '⏳ Awaiting Brand Approval'}
                        {partnership.status === 'active' && '🟢 Active'}
                        {partnership.status === 'in_progress' && '🔄 In Progress'}
                        {partnership.status === 'review' && '👀 Under Review'}
                        {partnership.status === 'completed' && '✅ Completed'}
                        {partnership.status === 'rejected' && '❌ Rejected'}
                        {partnership.status === 'cancelled' && '🚫 Cancelled'}
                      </span>
                    </div>
                    <div className="partnership-details">
                      <div className="partnership-detail">
                        <span className="detail-label">💰 Budget</span>
                        <span className="detail-value earnings">{formatCurrency(partnership.earnings)}</span>
                      </div>
                      <div className="partnership-detail">
                        <span className="detail-label">📅 Deadline</span>
                        <span className="detail-value deadline">{partnership.deadline}</span>
                      </div>
                      <div className="partnership-detail">
                        <span className="detail-label">📊 Deliverables</span>
                        <span className="detail-value progress">
                          {partnership.completed}/{partnership.deliverables} completed
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress Bar - only show for active/in_progress */}
                    {['active', 'in_progress', 'review'].includes(partnership.status) && (
                      <div className="partnership-progress">
                        <div
                          className="progress-bar"
                          style={{ width: `${(partnership.completed / partnership.deliverables) * 100}%` }}
                        ></div>
                      </div>
                    )}
                    
                    <div className="partnership-actions">
                      {/* Pending - Creator can only cancel */}
                      {partnership.status === 'pending' && (
                        <div className="pending-actions">
                          <span className="waiting-text">
                            <i className="fa-solid fa-hourglass-half"></i>
                            ⏳ Awaiting approval from {partnership.brandName}
                          </span>
                          <div className="pending-buttons">
                            <span className="waiting-approval">
                              <i className="fa-solid fa-hourglass-half"></i> Waiting for brand approval
                            </span>
                            <button 
                              className="action-btn cancel"
                              onClick={() => handleCancelPartnership(partnership.id)}
                            >
                              <i className="fa-solid fa-times"></i> Cancel Request
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Active/In Progress - Creator completes deliverables */}
                      {['active', 'in_progress'].includes(partnership.status) && (
                        <div className="active-actions">
                          {partnership.completed < partnership.deliverables ? (
                            <button 
                              className="action-btn complete-task"
                              onClick={() => handleCompleteDeliverable(partnership.id)}
                            >
                              <i className="fa-solid fa-check"></i> 
                              Complete Deliverable ({partnership.completed + 1}/{partnership.deliverables})
                            </button>
                          ) : (
                            <button 
                              className="action-btn mark-done"
                              onClick={() => handleMarkComplete(partnership.id)}
                            >
                              <i className="fa-solid fa-trophy"></i> Submit for Review
                            </button>
                          )}
                        </div>
                      )}
                      
                      {/* Under Review */}
                      {partnership.status === 'review' && (
                        <div className="review-actions">
                          <span className="review-text">
                            <i className="fa-solid fa-eye"></i>
                            Brand is reviewing your work...
                          </span>
                        </div>
                      )}
                      
                      {/* Completed */}
                      {partnership.status === 'completed' && (
                        <div className="completed-actions">
                          <span className="completed-badge">
                            <i className="fa-solid fa-check-circle"></i> 
                            Completed! {formatCurrency(partnership.earnings)} earned
                          </span>
                        </div>
                      )}
                      
                      {/* Rejected */}
                      {partnership.status === 'rejected' && (
                        <div className="rejected-actions">
                          <span className="rejected-badge">
                            <i className="fa-solid fa-times-circle"></i>
                            Brand declined this partnership
                          </span>
                        </div>
                      )}
                      
                      {/* Cancelled */}
                      {partnership.status === 'cancelled' && (
                        <div className="cancelled-actions">
                          <span className="cancelled-badge">
                            <i className="fa-solid fa-ban"></i>
                            Partnership cancelled
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ads Revenue Tab */}
          {activeTab === 'ads' && !loading && (
            <div className="ads-tab">
              <div className="ads-header-card">
                <h3>Ads Revenue</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="enable-ads-btn" onClick={handleEnableAds}>
                    <i className="fa-solid fa-toggle-on"></i>
                    {adsRevenue.enabled ? 'Settings' : 'Enable Ads'}
                  </button>
                </div>
              </div>

              <div className="ads-stats-grid">
                <div className="ads-stat-card">
                  <div className="ads-stat-value">{formatCurrency(adsRevenue.totalEarnings)}</div>
                  <div className="ads-stat-label">Total Earnings</div>
                </div>
                <div className="ads-stat-card">
                  <div className="ads-stat-value">{formatCurrency(adsRevenue.thisMonth)}</div>
                  <div className="ads-stat-label">This Month</div>
                </div>
                <div className="ads-stat-card">
                  <div className="ads-stat-value">{formatNumber(adsRevenue.impressions)}</div>
                  <div className="ads-stat-label">Impressions</div>
                </div>
                <div className="ads-stat-card">
                  <div className="ads-stat-value">{formatCurrency(adsRevenue.cpm)}</div>
                  <div className="ads-stat-label">CPM</div>
                </div>
                <div className="ads-stat-card">
                  <div className="ads-stat-value">{formatNumber(adsRevenue.clicks)}</div>
                  <div className="ads-stat-label">Clicks</div>
                </div>
                <div className="ads-stat-card">
                  <div className="ads-stat-value">{adsRevenue.ctr}%</div>
                  <div className="ads-stat-label">CTR</div>
                </div>
              </div>
            </div>
          )}

          {/* Subscriptions Tab */}
          {activeTab === 'subscriptions' && !loading && (
            <div className="subscriptions-tab">
              <div className="subscriptions-header">
                <h3>Subscriptions</h3>
                <button className="setup-subscriptions-btn" onClick={handleSetupSubscriptions}>
                  <i className="fa-solid fa-cog"></i>
                  Setup Subscriptions
                </button>
              </div>

              <div className="subscription-stats">
                <div className="subscription-stat-card">
                  <div className="subscription-stat-value">{subscriptions.totalSubscribers}</div>
                  <div className="subscription-stat-label">Total Subscribers</div>
                </div>
                <div className="subscription-stat-card">
                  <div className="subscription-stat-value">{formatCurrency(subscriptions.monthlyRevenue)}</div>
                  <div className="subscription-stat-label">Monthly Revenue</div>
                </div>
                <div className="subscription-stat-card">
                  <div className="subscription-stat-value">+{subscriptions.newThisMonth}</div>
                  <div className="subscription-stat-label">New This Month</div>
                </div>
              </div>

              <div className="subscription-plans">
                <h3>Subscription Plans</h3>
                <div className="plans-grid">
                  {subscriptions.plans.map(plan => (
                    <div key={plan.id} className="plan-card">
                      <div className="plan-name">{plan.name}</div>
                      <div className="plan-price">{formatCurrency(plan.price)}/mo</div>
                      <div className="plan-subscribers">{plan.subscribers} subscribers</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tip Jar Tab */}
          {activeTab === 'tips' && !loading && (
            <div className="tips-tab">
              <div className="tips-header-card">
                <h3>Tip Jar</h3>
                <div className="tips-stats-inline">
                  <div className="tips-stat">
                    <div className="tips-stat-value">{formatCurrency(tipJar.totalTips)}</div>
                    <div className="tips-stat-label">Total Tips</div>
                  </div>
                  <div className="tips-stat">
                    <div className="tips-stat-value">{tipJar.totalTippers}</div>
                    <div className="tips-stat-label">Tippers</div>
                  </div>
                  <div className="tips-stat">
                    <div className="tips-stat-value">{formatCurrency(tipJar.averageTip)}</div>
                    <div className="tips-stat-label">Avg Tip</div>
                  </div>
                </div>
              </div>

              <div className="recent-tips">
                <h3>Recent Tips</h3>
                <div className="tips-list">
                  {tipJar.recentTips.map(tip => (
                    <div key={tip.id} className="tip-item">
                      <div className="tip-user">
                        <img
                          src={`https://ui-avatars.com/api/?name=${tip.username}&background=2563EB&color=fff`}
                          alt={tip.username}
                        />
                        <div className="tip-user-info">
                          <div className="tip-username">@{tip.username}</div>
                          <div className="tip-message">{tip.message}</div>
                        </div>
                      </div>
                      <div className="tip-amount">{formatCurrency(tip.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Create Partnership Modal */}
        {showPartnershipForm && (
          <div className="partnership-form-overlay" onClick={() => setShowPartnershipForm(false)}>
            <div className="partnership-form-modal" onClick={(e) => e.stopPropagation()}>
              <div className="partnership-form-header">
                <h3>
                  <i className="fa-solid fa-handshake"></i>
                  Create New Partnership
                </h3>
                <button 
                  className="partnership-form-close" 
                  onClick={() => setShowPartnershipForm(false)}
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>

              <form onSubmit={handleSubmitPartnership} className="partnership-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      <i className="fa-solid fa-building"></i>
                      Brand Name *
                    </label>
                    <input
                      type="text"
                      name="brandName"
                      value={partnershipForm.brandName}
                      onChange={handlePartnershipFormChange}
                      placeholder="e.g., Nike, Apple, Samsung"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <i className="fa-solid fa-envelope"></i>
                      Contact Email *
                    </label>
                    <input
                      type="email"
                      name="contactEmail"
                      value={partnershipForm.contactEmail}
                      onChange={handlePartnershipFormChange}
                      placeholder="brand@company.com"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      <i className="fa-solid fa-bullhorn"></i>
                      Campaign Name *
                    </label>
                    <input
                      type="text"
                      name="campaignName"
                      value={partnershipForm.campaignName}
                      onChange={handlePartnershipFormChange}
                      placeholder="e.g., Summer Collection Launch"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <i className="fa-solid fa-tag"></i>
                      Campaign Type
                    </label>
                    <select
                      name="campaignType"
                      value={partnershipForm.campaignType}
                      onChange={handlePartnershipFormChange}
                    >
                      <option value="sponsored">Sponsored Content</option>
                      <option value="affiliate">Affiliate Marketing</option>
                      <option value="ambassador">Brand Ambassador</option>
                      <option value="review">Product Review</option>
                      <option value="giveaway">Giveaway/Contest</option>
                      <option value="takeover">Account Takeover</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      <i className="fa-solid fa-dollar-sign"></i>
                      Budget (USD) *
                    </label>
                    <input
                      type="number"
                      name="budget"
                      value={partnershipForm.budget}
                      onChange={handlePartnershipFormChange}
                      placeholder="e.g., 5000"
                      min="0"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <i className="fa-solid fa-list-check"></i>
                      Number of Deliverables
                    </label>
                    <input
                      type="number"
                      name="deliverables"
                      value={partnershipForm.deliverables}
                      onChange={handlePartnershipFormChange}
                      min="1"
                      max="20"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group full-width">
                    <label>
                      <i className="fa-solid fa-calendar"></i>
                      Deadline *
                    </label>
                    <input
                      type="date"
                      name="deadline"
                      value={partnershipForm.deadline}
                      onChange={handlePartnershipFormChange}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>
                    <i className="fa-solid fa-align-left"></i>
                    Campaign Description *
                  </label>
                  <textarea
                    name="description"
                    value={partnershipForm.description}
                    onChange={handlePartnershipFormChange}
                    placeholder="Describe the campaign goals, target audience, and key messages..."
                    rows="3"
                    required
                  ></textarea>
                </div>

                <div className="form-group full-width">
                  <label>
                    <i className="fa-solid fa-clipboard-list"></i>
                    Requirements & Guidelines
                  </label>
                  <textarea
                    name="requirements"
                    value={partnershipForm.requirements}
                    onChange={handlePartnershipFormChange}
                    placeholder="List any specific requirements, hashtags, mentions, or content guidelines..."
                    rows="3"
                  ></textarea>
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={() => setShowPartnershipForm(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={formSubmitting}
                  >
                    {formSubmitting ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-paper-plane"></i>
                        Create Partnership
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Ads Settings Modal */}
        {showAdsModal && (
          <div className="partnership-form-overlay" onClick={() => setShowAdsModal(false)}>
            <div className="partnership-form-modal" onClick={(e) => e.stopPropagation()}>
              <div className="partnership-form-header" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                <h3>
                  <i className="fa-solid fa-bullhorn"></i>
                  Enable Ads Monetization
                </h3>
                <button 
                  className="partnership-form-close" 
                  onClick={() => setShowAdsModal(false)}
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>

              <div className="partnership-form" style={{ padding: '24px' }}>
                <div className="ads-intro" style={{ 
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', 
                  padding: '20px', 
                  borderRadius: '12px', 
                  marginBottom: '24px',
                  borderLeft: '4px solid #10B981'
                }}>
                  <h4 style={{ margin: '0 0 8px', color: '#059669' }}>
                    <i className="fa-solid fa-circle-info"></i> How Ads Work
                  </h4>
                  <p style={{ margin: 0, color: '#047857', fontSize: '14px', lineHeight: 1.6 }}>
                    Enable ads on your videos to earn revenue. You'll earn based on impressions and clicks. 
                    Average CPM ranges from $2-10 depending on your audience and content category.
                  </p>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'block' }}>
                    <i className="fa-solid fa-video" style={{ color: '#10B981' }}></i> Ad Types
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                      { key: 'preRoll', label: 'Pre-Roll Ads', desc: 'Before video starts' },
                      { key: 'midRoll', label: 'Mid-Roll Ads', desc: 'During video (60s+ only)' },
                      { key: 'postRoll', label: 'Post-Roll Ads', desc: 'After video ends' },
                      { key: 'banner', label: 'Banner Ads', desc: 'Overlay on video' }
                    ].map(ad => (
                      <label key={ad.key} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        padding: '14px',
                        background: adsSettings.adTypes[ad.key] ? '#ecfdf5' : '#f8f9fa',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        border: adsSettings.adTypes[ad.key] ? '2px solid #10B981' : '2px solid #e5e7eb',
                        transition: 'all 0.2s'
                      }}>
                        <input 
                          type="checkbox" 
                          checked={adsSettings.adTypes[ad.key]}
                          onChange={() => setAdsSettings(prev => ({
                            ...prev,
                            adTypes: { ...prev.adTypes, [ad.key]: !prev.adTypes[ad.key] }
                          }))}
                          style={{ width: '18px', height: '18px', accentColor: '#10B981' }}
                        />
                        <div>
                          <div style={{ fontWeight: '600', color: '#1a1a2e' }}>{ad.label}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>{ad.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '20px' }}>
                  <label style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'block' }}>
                    <i className="fa-solid fa-clock" style={{ color: '#10B981' }}></i> Ad Frequency
                  </label>
                  <select
                    value={adsSettings.frequency}
                    onChange={(e) => setAdsSettings(prev => ({ ...prev, frequency: e.target.value }))}
                    style={{ 
                      width: '100%', 
                      padding: '14px', 
                      borderRadius: '10px', 
                      border: '2px solid #e5e7eb',
                      fontSize: '15px'
                    }}
                  >
                    <option value="low">Low (Less ads, lower revenue)</option>
                    <option value="medium">Medium (Balanced)</option>
                    <option value="high">High (More ads, higher revenue)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginTop: '20px' }}>
                  <label style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'block' }}>
                    <i className="fa-solid fa-film" style={{ color: '#10B981' }}></i> Minimum Video Length for Ads
                  </label>
                  <select
                    value={adsSettings.minVideoLength}
                    onChange={(e) => setAdsSettings(prev => ({ ...prev, minVideoLength: parseInt(e.target.value) }))}
                    style={{ 
                      width: '100%', 
                      padding: '14px', 
                      borderRadius: '10px', 
                      border: '2px solid #e5e7eb',
                      fontSize: '15px'
                    }}
                  >
                    <option value="30">30 seconds</option>
                    <option value="60">60 seconds</option>
                    <option value="120">2 minutes</option>
                    <option value="180">3 minutes</option>
                  </select>
                </div>

                <div className="estimated-earnings" style={{
                  marginTop: '24px',
                  padding: '20px',
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '14px', color: '#92400e', marginBottom: '4px' }}>Estimated Monthly Earnings</div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#b45309' }}>$50 - $500+</div>
                  <div style={{ fontSize: '12px', color: '#92400e', marginTop: '4px' }}>Based on your current views</div>
                </div>

                <div className="form-actions" style={{ marginTop: '24px' }}>
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={() => setShowAdsModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="submit-btn"
                    onClick={handleSaveAdsSettings}
                    style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                  >
                    <i className="fa-solid fa-check"></i>
                    Enable Ads
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Settings Modal */}
        {showSubscriptionModal && (
          <div className="partnership-form-overlay" onClick={() => setShowSubscriptionModal(false)}>
            <div className="partnership-form-modal" onClick={(e) => e.stopPropagation()}>
              <div className="partnership-form-header" style={{ background: 'linear-gradient(135deg, #FF0050 0%, #FE2C55 100%)' }}>
                <h3>
                  <i className="fa-solid fa-crown"></i>
                  Setup Subscriptions
                </h3>
                <button 
                  className="partnership-form-close" 
                  onClick={() => setShowSubscriptionModal(false)}
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>

              <div className="partnership-form" style={{ padding: '24px' }}>
                <div className="subs-intro" style={{ 
                  background: 'linear-gradient(135deg, #FFF5F7 0%, #FFE4E9 100%)', 
                  padding: '20px', 
                  borderRadius: '12px', 
                  marginBottom: '24px',
                  borderLeft: '4px solid #FF0050'
                }}>
                  <h4 style={{ margin: '0 0 8px', color: '#FF0050' }}>
                    <i className="fa-solid fa-star"></i> Subscriber Benefits
                  </h4>
                  <p style={{ margin: 0, color: '#C41E3A', fontSize: '14px', lineHeight: 1.6 }}>
                    Let your biggest fans support you with monthly subscriptions. 
                    Offer exclusive perks and build a loyal community.
                  </p>
                </div>

                <h4 style={{ margin: '0 0 16px', color: '#1a1a2e' }}>
                  <i className="fa-solid fa-ticket" style={{ color: '#FF0050' }}></i> Subscription Tiers
                </h4>

                {subscriptionSettings.plans.map((plan, index) => (
                  <div key={index} style={{
                    background: '#fff',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                      <input
                        type="text"
                        value={plan.name}
                        onChange={(e) => {
                          const newPlans = [...subscriptionSettings.plans];
                          newPlans[index].name = e.target.value;
                          setSubscriptionSettings(prev => ({ ...prev, plans: newPlans }));
                        }}
                        style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          border: '2px solid #e5e7eb',
                          background: '#fff',
                          color: '#1a1a2e',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          minWidth: '120px'
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#666', fontSize: '16px' }}>$</span>
                        <input
                          type="number"
                          value={plan.price}
                          onChange={(e) => {
                            const newPlans = [...subscriptionSettings.plans];
                            newPlans[index].price = parseFloat(e.target.value);
                            setSubscriptionSettings(prev => ({ ...prev, plans: newPlans }));
                          }}
                          style={{
                            width: '100px',
                            fontSize: '18px',
                            fontWeight: '700',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            color: '#FF0050',
                            textAlign: 'center'
                          }}
                          step="0.01"
                          min="0.99"
                        />
                        <span style={{ color: '#666', fontSize: '14px' }}>/mo</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {plan.benefits.map((benefit, bIndex) => (
                        <span key={bIndex} style={{
                          background: '#FFF5F7',
                          color: '#FF0050',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}>
                          <i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i>
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setSubscriptionSettings(prev => ({
                    ...prev,
                    plans: [...prev.plans, { name: 'New Tier', price: 14.99, benefits: ['Custom benefit'] }]
                  }))}
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '2px dashed #d1d5db',
                    borderRadius: '10px',
                    background: 'transparent',
                    color: '#666',
                    fontSize: '15px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <i className="fa-solid fa-plus"></i>
                  Add New Tier
                </button>

                <div className="form-actions" style={{ marginTop: '24px' }}>
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={() => setShowSubscriptionModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="submit-btn"
                    onClick={handleSaveSubscriptionSettings}
                    style={{ background: 'linear-gradient(135deg, #FF0050 0%, #FE2C55 100%)' }}
                  >
                    <i className="fa-solid fa-crown"></i>
                    Enable Subscriptions
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorMonetization;
