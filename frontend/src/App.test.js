import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock(
  'react-router-dom',
  () => ({
    BrowserRouter: ({ children }) => <>{children}</>,
    Routes: ({ children }) => <>{children}</>,
    Route: ({ element }) => element
  }),
  { virtual: true }
);

jest.mock('./pages/ListingsPage', () => () => <h1>Property Listings</h1>);
jest.mock('./pages/PropertyDetailPage', () => () => <div>Property Detail Page</div>);
jest.mock('./pages/SavedHomesPage', () => () => <div>Saved Homes Page</div>);
jest.mock('./pages/WorkspacePage', () => () => <div>Workspace Page</div>);
jest.mock('./pages/InsightsPage', () => () => <div>Insights Page</div>);
jest.mock('./pages/AgentDashboardPage', () => () => <div>Agent Dashboard Page</div>);
jest.mock('./pages/SellerToolsPage', () => () => <div>Seller Tools Page</div>);
jest.mock('./components/AppHeader', () => () => <div>App Header</div>);

import App from './App';

test('renders property listings heading', () => {
  render(<App />);
  const heading = screen.getByText(/property listings/i);
  expect(heading).toBeInTheDocument();
});
