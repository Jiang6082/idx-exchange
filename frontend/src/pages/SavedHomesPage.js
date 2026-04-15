import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchFavoriteProperties, markAlertRead } from '../api/client';
import { useAccount } from '../hooks/useAccount';
import { useToast } from '../components/ToastContext';
import Pagination from '../components/Pagination';
import { buildSavedSearchHref } from '../utils/searchState';
import './SavedHomesPage.css';

function getFirstPhotoUrl(property) {
  const raw = property?.L_Photos;
  if (!raw || typeof raw !== 'string') return null;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed[0] : null;
  } catch (error) {
    return null;
  }
}

function formatCurrency(value) {
  if (!value) {
    return 'N/A';
  }

  return `$${Number(value).toLocaleString()}`;
}

function SavedHomesPage() {
  const navigate = useNavigate();
  const { accountState, setAccountState } = useAccount();
  const { pushToast } = useToast();
  const [homes, setHomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;

  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      try {
        setLoading(true);
        const offset = (page - 1) * limit;
        const data = await fetchFavoriteProperties({ limit, offset });
        if (!cancelled) {
          setHomes(data.results || []);
          setTotal(data.total || 0);
        }
      } catch (error) {
        if (!cancelled) {
          pushToast('Unable to load saved homes right now.', 'error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [page, pushToast]);

  return (
    <div className="saved-homes-page">
      <section className="saved-hero panel">
        <div>
          <span className="section-kicker">Saved collection</span>
          <h1>Saved Homes</h1>
          <p>Your backend-synced favorites, recent alerts, and recently viewed listings live here.</p>
        </div>
      </section>

      <section className="saved-layout">
        <div className="saved-results panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Favorites</span>
              <h2>{total.toLocaleString()} saved homes</h2>
            </div>
          </div>

          {loading ? (
            <div className="saved-empty">Loading saved homes…</div>
          ) : homes.length === 0 ? (
            <div className="saved-empty">No saved homes yet. Add favorites from the main listings page.</div>
          ) : (
            <div className="saved-grid">
              {homes.map((property) => (
                <button
                  type="button"
                  key={property.L_ListingID}
                  className="saved-card"
                  onClick={() => navigate(`/property/${property.L_ListingID}`)}
                >
                  {getFirstPhotoUrl(property) ? (
                    <img src={getFirstPhotoUrl(property)} alt={property.L_Address} />
                  ) : (
                    <div className="saved-card-placeholder">No image</div>
                  )}
                  <strong>{property.L_Address || property.L_AddressStreet}</strong>
                  <span>{formatCurrency(property.L_SystemPrice)}</span>
                  <span>{property.L_City}, {property.L_State}</span>
                </button>
              ))}
            </div>
          )}

          {total > limit && (
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(total / limit)}
              onPageChange={setPage}
            />
          )}
        </div>

        <aside className="saved-sidebar">
          <div className="panel sidebar-panel">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Saved searches</span>
                <h2>Search center</h2>
              </div>
            </div>
            {(accountState.savedSearches || []).length === 0 ? (
              <p className="saved-empty">No saved searches yet.</p>
            ) : (
              <div className="sidebar-list">
                {accountState.savedSearches.map((search) => (
                  <div key={search.id} className="search-summary-card">
                    <strong>{search.name}</strong>
                    <span>
                      {(search.summary?.totalMatches || 0).toLocaleString()} matches
                      {search.summary?.newMatches > 0
                        ? ` • ${search.summary.newMatches} new since last check`
                        : ' • No new matches right now'}
                    </span>
                    <span>
                      {search.summary?.averagePrice
                        ? `Avg ${Number(search.summary.averagePrice).toLocaleString('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            maximumFractionDigits: 0
                          })}`
                        : 'Average price unavailable'}
                    </span>
                    <button
                      type="button"
                      className="saved-search-jump"
                      onClick={() => navigate(buildSavedSearchHref(search))}
                    >
                      Open this search
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel sidebar-panel">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Alerts</span>
                <h2>Saved search updates</h2>
              </div>
            </div>
            {(accountState.alerts || []).length === 0 ? (
              <p className="saved-empty">No alerts yet.</p>
            ) : (
              <div className="sidebar-list">
                {accountState.alerts.map((alert) => (
                  <button
                    type="button"
                    key={alert.id}
                    className={alert.isRead ? 'alert-item read' : 'alert-item'}
                    onClick={async () => {
                      if (!alert.isRead) {
                        await markAlertRead(alert.id);
                        setAccountState((prev) => ({
                          ...prev,
                          alerts: prev.alerts.map((item) =>
                            item.id === alert.id ? { ...item, isRead: true } : item
                          )
                        }));
                      }
                    }}
                  >
                    <strong>{alert.title}</strong>
                    <span>{alert.message}</span>
                    <span className="alert-meta">
                      {new Date(alert.createdAt).toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="panel sidebar-panel">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Recent views</span>
                <h2>History</h2>
              </div>
            </div>
            {(accountState.recentViews || []).length === 0 ? (
              <p className="saved-empty">No viewed history yet.</p>
            ) : (
              <div className="sidebar-list">
                {accountState.recentViews.map((view) => (
                  <button
                    type="button"
                    key={`${view.listing_id}-${view.viewed_at}`}
                    className="alert-item read"
                    onClick={() => navigate(`/property/${view.listing_id}`)}
                  >
                    <strong>MLS #{view.listing_id}</strong>
                    <span>{new Date(view.viewed_at).toLocaleString()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}

export default SavedHomesPage;
