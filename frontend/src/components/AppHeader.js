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
          <NavLink to="/saved" className="app-nav-link">
            Saved Homes
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default AppHeader;
