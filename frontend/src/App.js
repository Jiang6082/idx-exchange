import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ListingsPage from './pages/ListingsPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import SavedHomesPage from './pages/SavedHomesPage';
import WorkspacePage from './pages/WorkspacePage';
import InsightsPage from './pages/InsightsPage';
import AgentDashboardPage from './pages/AgentDashboardPage';
import SellerToolsPage from './pages/SellerToolsPage';
import AppHeader from './components/AppHeader';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastContext';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <div className="App">
            <AppHeader />
            <Routes>
              <Route path="/" element={<ListingsPage />} />
              <Route path="/saved" element={<SavedHomesPage />} />
              <Route path="/workspace" element={<WorkspacePage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/agent" element={<AgentDashboardPage />} />
              <Route path="/seller" element={<SellerToolsPage />} />
              <Route path="/property/:id" element={<PropertyDetailPage />} />
            </Routes>
          </div>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
