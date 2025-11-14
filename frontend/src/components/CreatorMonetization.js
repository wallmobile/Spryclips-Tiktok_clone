import React, { useEffect, useMemo, useState } from 'react';
import { getCreatorBalance, getEarnings, getTransactions } from '../api/monetization';
import './CreatorMonetization.css';

const CreatorMonetization = ({ onClose }) => {

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

        if (transactions.length) {
          const derivedPartnerships = transactions
            .filter((tx) => tx.type === 'brand_deal')
            .map((tx) => ({
              id: tx._id || tx.id,
              brandName: tx.relatedUser?.profile?.displayName || tx.relatedUser?.username || 'Brand Partner',
              campaignName: tx.description || 'Sponsored Collaboration',
              status: tx.status || 'completed',
              earnings: tx.amount || 0,
              deadline: tx.createdAt || new Date().toISOString(),
              deliverables: tx.deliverables || 1,
              completed: tx.deliverablesCompleted || 1,
            }));
          if (derivedPartnerships.length) {
            setPartnerships(derivedPartnerships);
          }
        }

        if (!transactions.length) {
          setPartnerships([
            {
              id: 1,
              brandName: 'TechCorp',
              campaignName: 'Creator Launch',
              status: 'active',
              earnings: balance.availableBalance || 0,
              deadline: new Date().toISOString().slice(0, 10),
              deliverables: 3,
              completed: 1,
            },
          ]);
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

  const handleApplyCreatorFund = () => {
    alert('Creator Fund application submitted! You will be notified within 5-7 business days.');
  };

  const handleCreatePartnership = () => {
    alert('Opening partnership request form...');
  };

  const handleEnableAds = () => {
    alert('Ads monetization enabled! Your videos will start showing ads.');
  };

  const handleSetupSubscriptions = () => {
    alert('Opening subscription setup...');
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
                {!creatorFund.eligibility && (
                  <button className="apply-fund-btn" onClick={handleApplyCreatorFund}>
                    <i className="fa-solid fa-paper-plane"></i>
                    Apply for Creator Fund
                  </button>
                )}
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
                  Create Partnership
                </button>
              </div>

              <div className="partnerships-list">
                {partnerships.map(partnership => (
                  <div key={partnership.id} className={`partnership-card ${partnership.status || 'active'}`}>
                    <div className="partnership-header">
                      <div className="partnership-info">
                        <h4>{partnership.brandName}</h4>
                        <p>{partnership.campaignName}</p>
                      </div>
                      <span className={`partnership-status ${partnership.status}`}>
                        {partnership.status}
                      </span>
                    </div>
                    <div className="partnership-details">
                      <div className="partnership-detail">
                        <span className="detail-label">Earnings:</span>
                        <span className="detail-value">{formatCurrency(partnership.earnings)}</span>
                      </div>
                      <div className="partnership-detail">
                        <span className="detail-label">Deadline:</span>
                        <span className="detail-value">{partnership.deadline}</span>
                      </div>
                      <div className="partnership-detail">
                        <span className="detail-label">Progress:</span>
                        <span className="detail-value">
                          {partnership.completed}/{partnership.deliverables} completed
                        </span>
                      </div>
                    </div>
                    <div className="partnership-progress">
                      <div
                        className="progress-bar"
                        style={{ width: `${(partnership.completed / partnership.deliverables) * 100}%` }}
                      ></div>
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
                <button className="enable-ads-btn" onClick={handleEnableAds}>
                  <i className="fa-solid fa-toggle-on"></i>
                  Enable Ads
                </button>
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
      </div>
    </div>
  );
};

export default CreatorMonetization;
