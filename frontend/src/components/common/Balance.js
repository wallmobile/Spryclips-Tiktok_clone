import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getCreatorBalance,
  getGiftsReceived,
  getGiftsSent,
  getTransactions,
  requestPayout,
} from '../../api/monetization';
import './Balance.css';

const Balance = ({ onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if opened as route or modal
  const isRoute = location.pathname === '/balance' || location.pathname === '/wallet';
  
  const handleClose = () => {
    if (isRoute) {
      // Check if we came from profile/AccountSettings
      const fromProfile = (document.referrer && document.referrer.includes('/profile')) || 
                         location.state?.from === '/profile' ||
                         (document.referrer && document.referrer.includes('profile'));
      
      if (fromProfile) {
        // Navigate to profile page to show AccountSettings
        navigate('/profile', { replace: true });
      } else if (window.history.length > 1) {
        // Go back in history
        navigate(-1);
      } else {
        // Fallback: navigate to home page
        navigate('/', { replace: true });
      }
    } else if (onClose) {
      onClose(); // Modal close
    }
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [balance, setBalance] = useState({
    coins: 0,
    earnings: 0,
    pendingWithdrawal: 0,
  });

  const [giftHistoryFilter, setGiftHistoryFilter] = useState('received'); // 'received', 'sent'
  const [giftHistoryReceived, setGiftHistoryReceived] = useState([]);
  const [giftHistorySent, setGiftHistorySent] = useState([]);

  const giftHistory = giftHistoryFilter === 'received' ? giftHistoryReceived : giftHistorySent;

  const [rechargePackages] = useState([
    { id: 1, coins: 100, price: 0.99, bonus: 0 },
    { id: 2, coins: 500, price: 4.99, bonus: 50 },
    { id: 3, coins: 1000, price: 9.99, bonus: 150 },
    { id: 4, coins: 2500, price: 24.99, bonus: 500 },
    { id: 5, coins: 5000, price: 49.99, bonus: 1200 }
  ]);

  const [showRecharge, setShowRecharge] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [showEarningsDetails, setShowEarningsDetails] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [selectedWithdrawMethod, setSelectedWithdrawMethod] = useState(null);

  const [transactionHistory, setTransactionHistory] = useState([]);
  const [earningsBreakdown, setEarningsBreakdown] = useState({
    gifts: 0,
    liveStreaming: 0,
    videoViews: 0,
    referrals: 0,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchWallet = async () => {
      setLoading(true);
      setError(null);
      try {
        const [balanceRes, receivedRes, sentRes, transactionsRes] = await Promise.all([
          getCreatorBalance().catch((err) => {
            console.error('Balance fetch error:', err);
            return null;
          }),
          getGiftsReceived(100).catch((err) => {
            console.error('Gifts received fetch error:', err);
            return null;
          }),
          getGiftsSent(100).catch((err) => {
            console.error('Gifts sent fetch error:', err);
            return null;
          }),
          getTransactions({ limit: 100 }).catch((err) => {
            console.error('Transactions fetch error:', err);
            return null;
          }),
        ]);

        if (cancelled) return;

        const balanceInfo = balanceRes?.balance || {};
        setBalance({
          coins: Math.max(0, Math.round(balanceInfo.availableBalance ?? 0)),
          earnings: balanceInfo.availableBalance ?? 0,
          pendingWithdrawal: balanceInfo.pendingPayouts ?? 0,
        });

        const normalizeGift = (gift, direction) => ({
          id: gift._id || gift.id,
          gift: gift.giftName || gift.giftType || 'Gift',
          emoji: gift.giftEmoji || '🎁',
          coins: gift.value || 0,
          date: gift.createdAt ? new Date(gift.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
          from: gift.sender?.username || 'anonymous',
          to: gift.receiver?.username || 'creator',
          direction,
        });

        setGiftHistoryReceived((receivedRes?.gifts || []).map((gift) => normalizeGift(gift, 'received')));
        setGiftHistorySent((sentRes?.gifts || []).map((gift) => normalizeGift(gift, 'sent')));

        const transactions = transactionsRes?.transactions || [];
        setTransactionHistory(
          transactions.map((tx) => ({
            id: tx._id || tx.id,
            type: tx.type || 'transaction',
            amount: tx.amount || 0,
            coins: tx.coins,
            date: tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
            status: tx.status || 'completed',
            from: tx.relatedUser?.username,
            to: tx.relatedUser?.username,
          }))
        );

        if (transactions.length) {
          const gifts = transactions.filter((tx) => tx.type === 'gift_received');
          const live = transactions.filter((tx) => tx.type === 'live_stream');
          const views = transactions.filter((tx) => tx.type === 'earnings');
          setEarningsBreakdown({
            gifts: gifts.reduce((sum, tx) => sum + Math.max(0, tx.amount || 0), 0),
            liveStreaming: live.reduce((sum, tx) => sum + Math.max(0, tx.amount || 0), 0),
            videoViews: views.reduce((sum, tx) => sum + Math.max(0, tx.amount || 0), 0),
            referrals: 0,
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Wallet load failed:', err);
          setError('Unable to load wallet data right now.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchWallet();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleRecharge = (packageItem) => {
    setSelectedPackage(packageItem);
    setShowPaymentMethods(true);
  };

  const handleWithdraw = () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) < 10) {
      alert('Minimum withdrawal amount is $10');
      return;
    }
    if (parseFloat(withdrawAmount) > balance.earnings) {
      alert('Insufficient balance for withdrawal');
      return;
    }
    requestPayout({
      amount: parseFloat(withdrawAmount),
      payoutMethod: selectedWithdrawMethod || 'transfer',
      payoutDetails: { paymentMethod },
    })
      .then((response) => {
        alert(response?.message || 'Withdrawal request submitted!');
        setShowWithdraw(false);
        setWithdrawAmount('');
      })
      .catch((err) => {
        console.error('Payout request failed:', err);
        alert(err?.response?.data?.message || 'Unable to submit withdrawal right now.');
      });
  };

  const handlePaymentConfirm = () => {
    if (selectedPackage) {
      alert(`Payment of $${selectedPackage.price} processed successfully! ${selectedPackage.coins + selectedPackage.bonus} coins added to your account.`);
      setShowPaymentMethods(false);
      setShowRecharge(false);
      setSelectedPackage(null);
    }
  };

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

  const formatCoins = useMemo(
    () => (coins) => {
      if (!coins) return '0';
      if (coins >= 1000) return `${(coins / 1000).toFixed(1)}K`;
      return coins.toString();
    },
    []
  );

  return (
    <div className="balance-overlay" onClick={isRoute ? undefined : handleClose}>
      <div className="balance-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="balance-header">
          <button 
            className="balance-close-btn" 
            onClick={handleClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25) !important';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3) !important';
              e.currentTarget.style.transform = 'translateY(-50%) !important';
              e.currentTarget.style.scale = '1 !important';
              e.currentTarget.style.opacity = '1 !important';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15) !important';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25) !important';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3) !important';
              e.currentTarget.style.transform = 'translateY(-50%) !important';
              e.currentTarget.style.scale = '1 !important';
              e.currentTarget.style.opacity = '1 !important';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15) !important';
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.25) !important',
              borderColor: 'rgba(255, 255, 255, 0.3) !important',
              transition: 'none !important',
              opacity: '1 !important',
            }}
          >
            <i className="fa-solid fa-times"></i>
          </button>
          <h2>Balance & Wallet</h2>
          <div className="balance-header-placeholder"></div>
        </div>

        {/* Balance Cards */}
        <div className="balance-content">
          {/* Coins Wallet Card */}
          <div className="balance-card">
            <div className="card-header">
              <div className="card-icon">
                <i className="fa-solid fa-coins"></i>
              </div>
              <h3>Coins Wallet</h3>
            </div>
            <div className="card-body">
              <div className="balance-amount">
                <span className="amount-number">{formatCoins(balance.coins)}</span>
                <span className="amount-label">Coins</span>
              </div>
              <button 
                className="recharge-btn"
                onClick={() => setShowRecharge(true)}
              >
                <i className="fa-solid fa-plus"></i>
                Recharge
              </button>
            </div>
          </div>

          {/* Earnings Card */}
          <div className="balance-card">
            <div className="card-header">
              <div className="card-icon">
                <i className="fa-solid fa-wallet"></i>
              </div>
              <h3>Earnings</h3>
            </div>
            <div className="card-body">
              <div className="balance-amount">
                <span className="amount-number">{formatCurrency(balance.earnings)}</span>
                <span className="amount-label">USD</span>
              </div>
              <button 
                className="withdraw-btn"
                onClick={() => setShowWithdraw(true)}
                disabled={balance.earnings < 10}
              >
                <i className="fa-solid fa-money-bill-transfer"></i>
                Withdraw
              </button>
            </div>
          </div>

          {/* Gift History Card */}
          <div className="balance-card full-width">
            <div className="card-header">
              <div className="card-icon">
                <i className="fa-solid fa-gift"></i>
              </div>
              <h3>Gift History</h3>
            </div>
            <div className="card-body">
              {/* Gift History Tabs */}
              <div className="gift-history-tabs">
                <button
                  className={`gift-tab ${giftHistoryFilter === 'received' ? 'active' : ''}`}
                  onClick={() => setGiftHistoryFilter('received')}
                >
                  <i className="fa-solid fa-download"></i>
                  Received ({giftHistoryReceived.length})
                </button>
                <button
                  className={`gift-tab ${giftHistoryFilter === 'sent' ? 'active' : ''}`}
                  onClick={() => setGiftHistoryFilter('sent')}
                >
                  <i className="fa-solid fa-upload"></i>
                  Sent ({giftHistorySent.length})
                </button>
              </div>
              
              <div className="gift-history-list">
                {giftHistory.length === 0 ? (
                  <div className="empty-gift-history">
                    <i className="fa-solid fa-gift"></i>
                    <p>No {giftHistoryFilter} gifts yet</p>
                  </div>
                ) : (
                  giftHistory.map(gift => (
                    <div key={gift.id} className="gift-item">
                      <div className="gift-emoji">{gift.emoji || '🎁'}</div>
                      <div className="gift-info">
                        <div className="gift-name">{gift.gift}</div>
                        {giftHistoryFilter === 'received' ? (
                          <div className="gift-from">from @{gift.from}</div>
                        ) : (
                          <div className="gift-from">to @{gift.to}</div>
                        )}
                      </div>
                      <div className="gift-details">
                        <div className={`gift-coins ${giftHistoryFilter === 'sent' ? 'sent' : 'received'}`}>
                        {giftHistoryFilter === 'sent' ? '-' : '+'}{formatCoins(gift.coins)} coins
                        </div>
                        <div className="gift-date">{gift.date}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        {/* Earnings Breakdown */}
        <div className="balance-card full-width">
          <div className="card-header">
            <div className="card-icon">
              <i className="fa-solid fa-chart-pie"></i>
            </div>
            <h3>Earnings Breakdown</h3>
          </div>
          <div className="card-body">
            <div className="earnings-breakdown-grid">
              <div className="earnings-item">
                <span className="earnings-label" style={{ display: 'flex', alignItems: 'center', gap: '0px', justifyContent: 'flex-start' }}>
                  <i className="fa-solid fa-gift" style={{ marginRight: '48px', marginLeft: '0px', marginTop: '0px', marginBottom: '0px', paddingRight: '0px', paddingLeft: '0px', paddingTop: '0px', paddingBottom: '0px', flexShrink: 0, display: 'block', width: 'auto', minWidth: 'auto', maxWidth: 'none' }}></i>
                  Gifts
                </span>
                <span className="earnings-value">{formatCurrency(earningsBreakdown.gifts)}</span>
              </div>
              <div className="earnings-item">
                <span className="earnings-label" style={{ display: 'flex', alignItems: 'center', gap: '0px', justifyContent: 'flex-start' }}>
                  <i className="fa-solid fa-video" style={{ marginRight: '48px', marginLeft: '0px', marginTop: '0px', marginBottom: '0px', paddingRight: '0px', paddingLeft: '0px', paddingTop: '0px', paddingBottom: '0px', flexShrink: 0, display: 'block', width: 'auto', minWidth: 'auto', maxWidth: 'none' }}></i>
                  Live Streaming
                </span>
                <span className="earnings-value">{formatCurrency(earningsBreakdown.liveStreaming)}</span>
              </div>
              <div className="earnings-item">
                <span className="earnings-label" style={{ display: 'flex', alignItems: 'center', gap: '0px', justifyContent: 'flex-start' }}>
                  <i className="fa-solid fa-eye" style={{ marginRight: '48px', marginLeft: '0px', marginTop: '0px', marginBottom: '0px', paddingRight: '0px', paddingLeft: '0px', paddingTop: '0px', paddingBottom: '0px', flexShrink: 0, display: 'block', width: 'auto', minWidth: 'auto', maxWidth: 'none' }}></i>
                  Video Views
                </span>
                <span className="earnings-value">{formatCurrency(earningsBreakdown.videoViews)}</span>
              </div>
              <div className="earnings-item">
                <span className="earnings-label" style={{ display: 'flex', alignItems: 'center', gap: '0px', justifyContent: 'flex-start' }}>
                  <i className="fa-solid fa-users" style={{ marginRight: '48px', marginLeft: '0px', marginTop: '0px', marginBottom: '0px', paddingRight: '0px', paddingLeft: '0px', paddingTop: '0px', paddingBottom: '0px', flexShrink: 0, display: 'block', width: 'auto', minWidth: 'auto', maxWidth: 'none' }}></i>
                  Referrals
                </span>
                <span className="earnings-value">{formatCurrency(earningsBreakdown.referrals)}</span>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="balance-loading">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <p>Loading wallet data...</p>
          </div>
        )}

        {error && !loading && (
          <div className="balance-error">
            <i className="fa-solid fa-circle-exclamation"></i>
            <p>{error}</p>
          </div>
        )}
        </div>

        {/* Recharge Modal */}
        {showRecharge && (
          <div className="recharge-modal-overlay" onClick={() => setShowRecharge(false)}>
            <div className="recharge-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="recharge-modal-header">
                <h3>Recharge Coins</h3>
                <button className="recharge-modal-close" onClick={() => setShowRecharge(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="recharge-modal-body">
                <div className="recharge-packages">
                  {rechargePackages.map(pkg => (
                    <div 
                      key={pkg.id} 
                      className="recharge-package"
                      onClick={() => handleRecharge(pkg)}
                    >
                      <div className="package-coins">
                        {pkg.coins.toLocaleString()} 
                        {pkg.bonus > 0 && <span className="bonus">+{pkg.bonus}</span>}
                      </div>
                      <div className="package-price">${pkg.price}</div>
                      {pkg.bonus > 0 && <div className="package-badge">Bonus!</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Withdraw Modal */}
        {showWithdraw && (
          <div className="withdraw-modal-overlay" onClick={() => setShowWithdraw(false)}>
            <div className="withdraw-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="withdraw-modal-header">
                <h3>Withdraw Earnings</h3>
                <button className="withdraw-modal-close" onClick={() => setShowWithdraw(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="withdraw-modal-body">
                <div className="withdraw-info">
                  <p>Available Balance: <strong>{formatCurrency(balance.earnings)}</strong></p>
                  <p>Minimum withdrawal: $10.00</p>
                  <p>Processing time: 3-5 business days</p>
                </div>
                <div className="withdraw-methods">
                  <div 
                    className={`withdraw-method ${selectedWithdrawMethod === 'paypal' ? 'selected' : ''}`}
                    onClick={() => setSelectedWithdrawMethod('paypal')}
                  >
                    <i className="fa-brands fa-paypal"></i>
                    <span>PayPal</span>
                  </div>
                  <div 
                    className={`withdraw-method ${selectedWithdrawMethod === 'bank' ? 'selected' : ''}`}
                    onClick={() => setSelectedWithdrawMethod('bank')}
                  >
                    <i className="fa-solid fa-university"></i>
                    <span>Bank Transfer</span>
                  </div>
                </div>
                <button className="confirm-withdraw-btn" onClick={handleWithdraw}>
                  <i className="fa-solid fa-check"></i>
                  Confirm Withdrawal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transaction History Modal */}
        {showTransactionHistory && (
          <div className="balance-modal-overlay" onClick={() => setShowTransactionHistory(false)}>
            <div className="balance-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="balance-modal-header">
                <h3>Transaction History</h3>
                <button className="balance-modal-close" onClick={() => setShowTransactionHistory(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="balance-modal-body">
                <div className="transaction-list">
                  {transactionHistory.map(transaction => (
                    <div key={transaction.id} className="transaction-item">
                      <div className="transaction-icon">
                        <i className={`fa-solid ${
                          transaction.type === 'recharge' ? 'fa-plus' :
                          transaction.type === 'withdrawal' ? 'fa-minus' :
                          transaction.type === 'gift_received' ? 'fa-gift' :
                          transaction.type === 'gift_sent' ? 'fa-paper-plane' : 'fa-exchange'
                        }`}></i>
                      </div>
                      <div className="transaction-details">
                        <div className="transaction-type">
                          {transaction.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          {transaction.from && ` from @${transaction.from}`}
                          {transaction.to && ` to @${transaction.to}`}
                        </div>
                        <div className="transaction-date">{transaction.date}</div>
                      </div>
                      <div className="transaction-amount">
                        <span className={transaction.type === 'withdrawal' ? 'negative' : 'positive'}>
                          {transaction.type === 'withdrawal' ? '-' : '+'}{formatCurrency(Math.abs(transaction.amount || 0))}
                        </span>
                        {transaction.coins && (
                          <span className="transaction-coins">{transaction.coins} coins</span>
                        )}
                      </div>
                      <div className={`transaction-status ${transaction.status}`}>
                        {transaction.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Earnings Details Modal */}
        {showEarningsDetails && (
          <div className="balance-modal-overlay" onClick={() => setShowEarningsDetails(false)}>
            <div className="balance-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="balance-modal-header">
                <h3>Earnings Breakdown</h3>
                <button className="balance-modal-close" onClick={() => setShowEarningsDetails(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="balance-modal-body">
                <div className="earnings-summary">
                  <div className="total-earnings">
                    <h4>Total Earnings</h4>
                    <span className="total-amount">{formatCurrency(balance.earnings)}</span>
                  </div>
                  
                  <div className="earnings-breakdown">
                    <div className="earnings-item">
                      <div className="earnings-source" style={{ display: 'flex', alignItems: 'center', gap: '0px', justifyContent: 'flex-start' }}>
                        <i className="fa-solid fa-gift" style={{ marginRight: '48px', marginLeft: '0px', marginTop: '0px', marginBottom: '0px', paddingRight: '0px', paddingLeft: '0px', paddingTop: '0px', paddingBottom: '0px', flexShrink: 0, display: 'block', width: 'auto', minWidth: 'auto', maxWidth: 'none' }}></i>
                        <span style={{ marginLeft: '0px', marginRight: '0px', paddingLeft: '0px', paddingRight: '0px', paddingTop: '0px', paddingBottom: '0px', display: 'block' }}>Gifts Received</span>
                      </div>
                      <span className="earnings-amount">{formatCurrency(earningsBreakdown.gifts)}</span>
                    </div>
                    
                    <div className="earnings-item">
                      <div className="earnings-source" style={{ display: 'flex', alignItems: 'center', gap: '0px', justifyContent: 'flex-start' }}>
                        <i className="fa-solid fa-video" style={{ marginRight: '48px', marginLeft: '0px', marginTop: '0px', marginBottom: '0px', paddingRight: '0px', paddingLeft: '0px', paddingTop: '0px', paddingBottom: '0px', flexShrink: 0, display: 'block', width: 'auto', minWidth: 'auto', maxWidth: 'none' }}></i>
                        <span style={{ marginLeft: '0px', marginRight: '0px', paddingLeft: '0px', paddingRight: '0px', paddingTop: '0px', paddingBottom: '0px', display: 'block' }}>Live Streaming</span>
                      </div>
                      <span className="earnings-amount">{formatCurrency(earningsBreakdown.liveStreaming)}</span>
                    </div>
                    
                    <div className="earnings-item">
                      <div className="earnings-source" style={{ display: 'flex', alignItems: 'center', gap: '0px', justifyContent: 'flex-start' }}>
                        <i className="fa-solid fa-eye" style={{ marginRight: '48px', marginLeft: '0px', marginTop: '0px', marginBottom: '0px', paddingRight: '0px', paddingLeft: '0px', paddingTop: '0px', paddingBottom: '0px', flexShrink: 0, display: 'block', width: 'auto', minWidth: 'auto', maxWidth: 'none' }}></i>
                        <span style={{ marginLeft: '0px', marginRight: '0px', paddingLeft: '0px', paddingRight: '0px', paddingTop: '0px', paddingBottom: '0px', display: 'block' }}>Video Views</span>
                      </div>
                      <span className="earnings-amount">{formatCurrency(earningsBreakdown.videoViews)}</span>
                    </div>
                    
                    <div className="earnings-item">
                      <div className="earnings-source" style={{ display: 'flex', alignItems: 'center', gap: '0px', justifyContent: 'flex-start' }}>
                        <i className="fa-solid fa-users" style={{ marginRight: '48px', marginLeft: '0px', marginTop: '0px', marginBottom: '0px', paddingRight: '0px', paddingLeft: '0px', paddingTop: '0px', paddingBottom: '0px', flexShrink: 0, display: 'block', width: 'auto', minWidth: 'auto', maxWidth: 'none' }}></i>
                        <span style={{ marginLeft: '0px', marginRight: '0px', paddingLeft: '0px', paddingRight: '0px', paddingTop: '0px', paddingBottom: '0px', display: 'block' }}>Referrals</span>
                      </div>
                      <span className="earnings-amount">{formatCurrency(earningsBreakdown.referrals)}</span>
                    </div>
                  </div>
                  
                  <div className="earnings-info">
                    <h4>Payout Information</h4>
                    <ul>
                      <li>Minimum withdrawal: $10.00</li>
                      <li>Processing time: 3-5 business days</li>
                      <li>Payment methods: PayPal, Bank Transfer</li>
                      <li>Tax forms available at year end</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Methods Modal */}
        {showPaymentMethods && (
          <div className="balance-modal-overlay" onClick={() => setShowPaymentMethods(false)}>
            <div className="balance-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="balance-modal-header">
                <h3>
                  {selectedPackage ? `Purchase ${selectedPackage.coins + selectedPackage.bonus} Coins` : 'Payment Methods'}
                </h3>
                <button className="balance-modal-close" onClick={() => setShowPaymentMethods(false)}>
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>
              <div className="balance-modal-body">
                {selectedPackage && (
                  <div className="purchase-summary">
                    <div className="package-details">
                      <h4>{selectedPackage.coins} Coins + {selectedPackage.bonus} Bonus</h4>
                      <span className="package-price">${selectedPackage.price}</span>
                    </div>
                  </div>
                )}
                
                <div className="payment-methods">
                  <h4>Select Payment Method</h4>
                  <div className="payment-method-list">
                    <div 
                      className={`payment-method ${paymentMethod === 'card' ? 'selected' : ''}`}
                      onClick={() => setPaymentMethod('card')}
                    >
                      <i className="fa-solid fa-credit-card"></i>
                      <span>Credit/Debit Card</span>
                      <div className="payment-method-check">
                        <i className="fa-solid fa-check"></i>
                      </div>
                    </div>
                    
                    <div 
                      className={`payment-method ${paymentMethod === 'paypal' ? 'selected' : ''}`}
                      onClick={() => setPaymentMethod('paypal')}
                    >
                      <i className="fa-brands fa-paypal"></i>
                      <span>PayPal</span>
                      <div className="payment-method-check">
                        <i className="fa-solid fa-check"></i>
                      </div>
                    </div>
                    
                    <div 
                      className={`payment-method ${paymentMethod === 'apple' ? 'selected' : ''}`}
                      onClick={() => setPaymentMethod('apple')}
                    >
                      <i className="fa-brands fa-apple"></i>
                      <span>Apple Pay</span>
                      <div className="payment-method-check">
                        <i className="fa-solid fa-check"></i>
                      </div>
                    </div>
                    
                    <div 
                      className={`payment-method ${paymentMethod === 'google' ? 'selected' : ''}`}
                      onClick={() => setPaymentMethod('google')}
                    >
                      <i className="fa-brands fa-google"></i>
                      <span>Google Pay</span>
                      <div className="payment-method-check">
                        <i className="fa-solid fa-check"></i>
                      </div>
                    </div>
                  </div>
                </div>
                
                {selectedPackage && (
                  <div className="payment-actions">
                    <button 
                      className="cancel-payment-btn"
                      onClick={() => {
                        setShowPaymentMethods(false);
                        setSelectedPackage(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      className="confirm-payment-btn"
                      onClick={handlePaymentConfirm}
                    >
                      Pay ${selectedPackage.price}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Balance;













