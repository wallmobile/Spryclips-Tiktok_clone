import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchShopOverview } from '../api/more';
import './MorePages.css';

const SellerDashboard = ({ onClose = () => {} }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    window.dispatchEvent(new Event('sidebar:close'));
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.classList.add('page-open');
    }
    return () => {
      if (sidebar) {
        sidebar.classList.remove('page-open');
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchShopOverview();
        if (!active) return;
        setOverview(data);
        setErrorMessage('');
      } catch (error) {
        console.error('Failed to load seller dashboard', error);
        if (!active) return;
        setErrorMessage('We could not load your shop data right now.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const fulfillmentProgress = useMemo(() => {
    if (!overview?.fulfillment) return 0;
    const { pending = 0, packed = 0, shipped = 0, delivered = 0 } = overview.fulfillment;
    const total = pending + packed + shipped + delivered;
    if (total === 0) return 0;
    return Math.round((delivered / total) * 100);
  }, [overview]);

  const handleClose = () => {
    onClose();
    navigate('/profile');
  };

  return (
    <div className="more-page">
      <div className="more-page__container">
        <header className="more-page__header">
          <h1>
            <i className="fa-solid fa-store"></i>
            Seller Center
          </h1>
          <button className="more-page__close" type="button" onClick={handleClose} aria-label="Close Seller Center">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </header>

        <div className="more-page__toolbar">
          <div className="more-page__toolbar-info">
            <span className="more-page__badge">
              <i className="fa-solid fa-box-open"></i>
              {overview?.summary?.ordersLast30Days ?? 0} orders in the last 30 days
            </span>
            {loading ? (
              <span className="more-page__toolbar-sync more-page__toolbar-sync--live">
                <i className="fa-solid fa-spinner fa-spin"></i>
                Syncing commerce data…
              </span>
            ) : (
              <span className="more-page__toolbar-sync">
                Conversion rate {overview?.summary?.conversionRate ?? 0}%
              </span>
            )}
          </div>
          <div className="more-page__toolbar-actions">
            <button
              className="more-page__button more-page__button--primary"
              type="button"
              onClick={() => navigate('/upload')}
            >
              <i className="fa-solid fa-upload"></i>
              Add new product
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="more-page__banner more-page__banner--warning" role="status">
            <div className="more-page__banner-content">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{errorMessage}</span>
            </div>
            <div className="more-page__banner-actions">
              <button
                className="more-page__button more-page__button--ghost"
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setLoading(true);
                  fetchShopOverview()
                    .then((data) => {
                      setOverview(data);
                      setErrorMessage('');
                    })
                    .catch((error) => {
                      console.error('Retry shop overview failed', error);
                      setErrorMessage('Commerce service still unavailable. Try again soon.');
                    })
                    .finally(() => setLoading(false));
                }}
              >
                <i className="fa-solid fa-rotate"></i>
                Retry
              </button>
            </div>
          </div>
        )}

        <main className="more-page__content">
          {loading && !errorMessage ? (
            <div className="more-page__empty" role="status">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <p>Loading seller analytics…</p>
            </div>
          ) : errorMessage && !overview ? (
            <div className="more-page__empty">
              <i className="fa-solid fa-exclamation-triangle"></i>
              <p>{errorMessage}</p>
              <button
                className="more-page__button more-page__button--primary"
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setLoading(true);
                  fetchShopOverview()
                    .then((data) => {
                      setOverview(data);
                      setErrorMessage('');
                    })
                    .catch((error) => {
                      console.error('Retry shop overview failed', error);
                      setErrorMessage('Commerce service still unavailable. Please try again later.');
                    })
                    .finally(() => setLoading(false));
                }}
              >
                <i className="fa-solid fa-rotate"></i>
                Try Again
              </button>
            </div>
          ) : !overview ? (
            <div className="more-page__empty">
              <i className="fa-solid fa-store-slash"></i>
              <p>Set up your first product to see commerce insights.</p>
            </div>
          ) : (
            <>
              <div className="more-page__grid more-page__grid--three">
                <div className="more-page__card">
                  <h2>Revenue</h2>
                  <div className="more-page__stat">
                    <span className="more-page__stat-label">Revenue (30 days)</span>
                    <span className="more-page__stat-value">
                      ${overview.summary?.revenueLast30Days?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="more-page__stat">
                    <span className="more-page__stat-label">Returning customers</span>
                    <span className="more-page__stat-value">
                      {overview.summary?.returningCustomers?.toLocaleString() ?? 0}
                    </span>
                  </div>
                </div>

                <div className="more-page__card">
                  <h2>Fulfillment status</h2>
                  <p>Delivered orders account for {fulfillmentProgress}% of your current cycle.</p>
                  <div className="more-page__list">
                    {Object.entries(overview.fulfillment ?? {}).map(([key, value]) => (
                      <div key={key} className="more-page__list-item">
                        <h3>{key.charAt(0).toUpperCase() + key.slice(1)}</h3>
                        <p>{value} orders</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="more-page__card">
                  <h2>Next actions</h2>
                  <div className="more-page__list">
                    {overview.actions?.map((action) => (
                      <div key={action.id} className="more-page__list-item">
                        <h3>{action.title}</h3>
                        <p>{action.impact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="more-page__card">
                <h2>Product performance</h2>
                <div className="more-page__cards-row">
                  {overview.productPerformance?.map((product) => (
                    <div key={product.id} className="more-page__list-item">
                      <h3>{product.name}</h3>
                      <div className="more-page__tag-list">
                        <span className="more-page__tag">
                          <i className="fa-solid fa-dollar-sign"></i> ${product.price}
                        </span>
                        <span className="more-page__tag">
                          <i className="fa-solid fa-cart-shopping"></i> {product.orders} orders
                        </span>
                        <span className="more-page__tag">
                          <i className="fa-solid fa-percentage"></i> {product.conversionRate}% conversion
                        </span>
                      </div>
                      <p>Inventory available: {product.inventory}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default SellerDashboard;

