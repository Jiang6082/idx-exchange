import { render, screen } from '@testing-library/react';
import App from './App';

test('renders property listings heading', () => {
  render(<App />);
  const heading = screen.getByText(/property listings/i);
  expect(heading).toBeInTheDocument();
});