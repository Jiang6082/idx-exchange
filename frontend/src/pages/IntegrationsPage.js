import React, { useEffect, useState } from 'react';
import { fetchIntegrationsStatus } from '../api/client';
import './IntegrationsPage.css';

function IntegrationsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchIntegrationsStatus().then(setData).catch(() => {});
  }, []);

  return (
    <div className="integrations-page">
      <section className="panel integrations-panel">
        <span className="section-kicker">Integrations</span>
        <h1>External services and AI configuration</h1>
        <p>
          API-backed features can be upgraded here. The OpenAI wrapper reads from
          `OPENAI_API_KEY` and `OPENAI_MODEL` on the backend, and the rest of the
          providers use their matching env keys in `backend/.env` or `backend/.env.example`.
        </p>
      </section>

      <section className="integrations-grid">
        {Object.entries(data?.integrations || {}).map(([key, integration]) => (
          <div key={key} className="panel integrations-card">
            <span className="section-kicker">{key}</span>
            <strong>{integration.configured ? 'Configured' : 'Fallback mode'}</strong>
            <span>
              {integration.model
                ? `Model: ${integration.model}`
                : `Provider: ${integration.provider || 'not configured'}`}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}

export default IntegrationsPage;
