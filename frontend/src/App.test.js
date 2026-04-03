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

import App from './App';

test('renders property listings heading', () => {
  render(<App />);
  const heading = screen.getByText(/property listings/i);
  expect(heading).toBeInTheDocument();
});
