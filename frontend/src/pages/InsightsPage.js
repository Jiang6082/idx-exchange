import React, { useEffect, useState } from 'react';
import { fetchMarketInsights } from '../api/client';
import './InsightsPage.css';

function formatCurrency(value) {
  return value ? `$${Number(value).toLocaleString()}` : 'N/A';
}

function InsightsPage() {
  const [city, setCity] = useState('');
  const [data, setData] = useState(null);

  async function loadInsights(nextCity = '') {
    const response = await fetchMarketInsights(nextCity ? { city: nextCity } : {});
    setData(response);
  }

  useEffect(() => {
    loadInsights();
  }, []);

  return (
    <div className="insights-page">
      <section className="panel insights-hero">
        <span className="section-kicker">Market intelligence</span>
        <h1>Track neighborhoods, inventory, and pricing signals</h1>
        <p>Use this dashboard to understand where inventory is moving and how local pricing is shaping buyer decisions.</p>
      </section>

      <section className="panel insights-filters">
        <input
          type="text"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="Filter by city"
        />
        <button type="button" className="btn-primary" onClick={() => loadInsights(city)}>
          Update insights
        </button>
      </section>

      {data && (
        <>
          <section className="insights-grid">
            <div className="panel insights-card">
              <span className="section-kicker">Inventory</span>
              <strong>{Number(data.summary?.listingCount || 0).toLocaleString()}</strong>
              <span>Listings in scope</span>
            </div>
            <div className="panel insights-card">
              <span className="section-kicker">Pricing</span>
              <strong>{formatCurrency(data.summary?.averagePrice)}</strong>
              <span>Average listing price</span>
            </div>
            <div className="panel insights-card">
              <span className="section-kicker">Homesize</span>
              <strong>{data.summary?.averageSqft ? `${Number(data.summary.averageSqft).toLocaleString()} sqft` : 'N/A'}</strong>
              <span>Average interior size</span>
            </div>
            <div className="panel insights-card">
              <span className="section-kicker">Velocity</span>
              <strong>{data.summary?.averageDaysOnMarket || 'N/A'}</strong>
              <span>Average days on market</span>
            </div>
          </section>

          <section className="insights-layout">
            <div className="panel insights-section">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">Status mix</span>
                  <h2>Buyer competition indicators</h2>
                </div>
              </div>
              <div className="stat-list">
                {(data.statusMix || []).map((item) => (
                  <div key={item.status} className="stat-row">
                    <strong>{item.status}</strong>
                    <span>{Number(item.total).toLocaleString()} listings</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel insights-section">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">Cities</span>
                  <h2>Top active markets</h2>
                </div>
              </div>
              <div className="stat-list">
                {(data.topCities || []).map((item) => (
                  <div key={item.city} className="stat-row">
                    <strong>{item.city}</strong>
                    <span>
                      {Number(item.listingCount).toLocaleString()} homes • {formatCurrency(item.averagePrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel insights-section">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">Price bands</span>
                  <h2>Inventory composition</h2>
                </div>
              </div>
              <div className="stat-list">
                <div className="stat-row"><strong>Under $750K</strong><span>{Number(data.priceBands?.under750k || 0).toLocaleString()}</span></div>
                <div className="stat-row"><strong>$750K to $1.5M</strong><span>{Number(data.priceBands?.midMarket || 0).toLocaleString()}</span></div>
                <div className="stat-row"><strong>$1.5M+</strong><span>{Number(data.priceBands?.luxury || 0).toLocaleString()}</span></div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default InsightsPage;
