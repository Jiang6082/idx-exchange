import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="panel" style={{ maxWidth: 720, margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p>We hit an unexpected error. You can refresh the page or jump back to browsing listings.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Refresh Page
            </button>
            <button className="btn-secondary" onClick={() => (window.location.href = '/')}>
              Go to Listings
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
