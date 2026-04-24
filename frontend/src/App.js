import React from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import ListingsPage from './pages/ListingsPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import SavedHomesPage from './pages/SavedHomesPage';
import WorkspacePage from './pages/WorkspacePage';
import InsightsPage from './pages/InsightsPage';
import AgentDashboardPage from './pages/AgentDashboardPage';
import SellerToolsPage from './pages/SellerToolsPage';
import AuthPage from './pages/AuthPage';
import IntegrationsPage from './pages/IntegrationsPage';
import AppHeader from './components/AppHeader';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastContext';
import { getSessionToken } from './api/client';
import './App.css';

function ProtectedRoute({ children }) {
  return getSessionToken() ? children : <Navigate to="/auth" replace />;
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <div className="App">
            <AppHeader />
            <Routes>
              <Route path="/" element={<ListingsPage />} />
              <Route
                path="/saved"
                element={
                  <ProtectedRoute>
                    <SavedHomesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workspace"
                element={
                  <ProtectedRoute>
                    <WorkspacePage />
                  </ProtectedRoute>
                }
              />
              <Route path="/insights" element={<InsightsPage />} />
              <Route
                path="/agent"
                element={
                  <ProtectedRoute>
                    <AgentDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/seller" element={<SellerToolsPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route
                path="/integrations"
                element={
                  <ProtectedRoute>
                    <IntegrationsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/property/:id" element={<PropertyDetailPage />} />
            </Routes>
          </div>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
