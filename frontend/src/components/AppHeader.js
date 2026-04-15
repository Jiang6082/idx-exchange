import React from 'react';
import { NavLink } from 'react-router-dom';

function AppHeader() {
  return (
    <header className="app-header-shell">
      <div className="app-header-content">
        <NavLink to="/" className="brand-mark">
          IDX Exchange
        </NavLink>

        <nav className="app-nav">
          <NavLink to="/" end className="app-nav-link">
            Browse
          </NavLink>
          <NavLink to="/workspace" className="app-nav-link">
            Workspace
          </NavLink>
          <NavLink to="/saved" className="app-nav-link">
            Saved Homes
          </NavLink>
          <NavLink to="/insights" className="app-nav-link">
            Insights
          </NavLink>
          <NavLink to="/agent" className="app-nav-link">
            Agent
          </NavLink>
          <NavLink to="/seller" className="app-nav-link">
            Seller
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default AppHeader;
