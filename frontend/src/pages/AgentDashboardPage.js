import React, { useEffect, useState } from 'react';
import { fetchAdminOverview } from '../api/client';
import './AgentDashboardPage.css';

function formatCurrency(value) {
  return value ? `$${Number(value).toLocaleString()}` : 'N/A';
}

function AgentDashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchAdminOverview().then(setData).catch(() => {});
  }, []);

  if (!data) {
    return <div className="agent-page"><div className="panel agent-panel">Loading dashboard...</div></div>;
  }

  return (
    <div className="agent-page">
      <section className="panel agent-panel">
        <span className="section-kicker">Agent / admin mode</span>
        <h1>Lead and platform activity dashboard</h1>
        <p>Track user engagement, saved-search activity, alerts, and the cities generating the most inventory attention.</p>
      </section>

      <section className="agent-metrics">
        {[
          ['Users', data.metrics?.totalUsers],
          ['Favorites', data.metrics?.totalFavorites],
          ['Saved searches', data.metrics?.totalSavedSearches],
          ['Unread alerts', data.metrics?.unreadAlerts],
          ['Tours', data.metrics?.totalTours],
          ['Boards', data.metrics?.totalBoards]
        ].map(([label, value]) => (
          <div key={label} className="panel agent-card">
            <span className="section-kicker">Overview</span>
            <strong>{Number(value || 0).toLocaleString()}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="panel agent-panel">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Top cities</span>
            <h2>Most active listing markets</h2>
          </div>
        </div>
        <div className="agent-city-list">
          {(data.topCities || []).map((city) => (
            <div key={city.city} className="agent-city-row">
              <strong>{city.city}</strong>
              <span>{Number(city.listings).toLocaleString()} listings</span>
              <span>{formatCurrency(city.averagePrice)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default AgentDashboardPage;
