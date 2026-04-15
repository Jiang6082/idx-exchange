import React, { useState } from 'react';
import { fetchSellerEstimate } from '../api/client';
import './SellerToolsPage.css';

function formatCurrency(value) {
  return value ? `$${Number(value).toLocaleString()}` : 'N/A';
}

function SellerToolsPage() {
  const [form, setForm] = useState({
    city: '',
    beds: '',
    baths: '',
    sqft: ''
  });
  const [data, setData] = useState(null);

  return (
    <div className="seller-page">
      <section className="panel seller-panel">
        <span className="section-kicker">Seller tools</span>
        <h1>Estimate value and review nearby comps</h1>
        <p>Give sellers a fast pricing conversation starter using the same inventory database powering the buyer side.</p>
      </section>

      <section className="panel seller-panel">
        <div className="seller-form">
          <input
            type="text"
            placeholder="City"
            value={form.city}
            onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
          />
          <input
            type="number"
            placeholder="Beds"
            value={form.beds}
            onChange={(event) => setForm((prev) => ({ ...prev, beds: event.target.value }))}
          />
          <input
            type="number"
            placeholder="Baths"
            value={form.baths}
            onChange={(event) => setForm((prev) => ({ ...prev, baths: event.target.value }))}
          />
          <input
            type="number"
            placeholder="Square feet"
            value={form.sqft}
            onChange={(event) => setForm((prev) => ({ ...prev, sqft: event.target.value }))}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={async () => {
              const response = await fetchSellerEstimate(form);
              setData(response);
            }}
          >
            Estimate value
          </button>
        </div>
      </section>

      {data && (
        <>
          <section className="seller-grid">
            <div className="panel seller-card">
              <span className="section-kicker">Suggested range</span>
              <strong>
                {formatCurrency(data.estimate?.suggestedRangeLow)} to {formatCurrency(data.estimate?.suggestedRangeHigh)}
              </strong>
              <span>{data.estimate?.positioning}</span>
            </div>
            <div className="panel seller-card">
              <span className="section-kicker">Market average</span>
              <strong>{formatCurrency(data.estimate?.averagePrice)}</strong>
              <span>{Number(data.estimate?.totalComps || 0).toLocaleString()} comparable homes</span>
            </div>
          </section>

          <section className="panel seller-panel">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Comparable listings</span>
                <h2>Seller-side comp review</h2>
              </div>
            </div>
            <div className="seller-comp-grid">
              {(data.comps || []).map((property) => (
                <div key={property.L_ListingID} className="seller-comp-card">
                  <strong>{property.summary?.address}</strong>
                  <span>{property.summary?.city}, {property.summary?.state}</span>
                  <span>{formatCurrency(property.summary?.price)}</span>
                  <span>
                    {property.summary?.beds || '—'} beds • {property.summary?.baths || '—'} baths •{' '}
                    {property.summary?.sqft ? `${Number(property.summary.sqft).toLocaleString()} sqft` : 'sqft N/A'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default SellerToolsPage;
