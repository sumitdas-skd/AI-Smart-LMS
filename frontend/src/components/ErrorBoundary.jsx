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
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', fontFamily: "'Inter', Arial, sans-serif",
          background: 'linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)',
          padding: '20px', textAlign: 'center'
        }}>
          <div style={{
            background: 'white', padding: '48px 40px',
            borderRadius: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            maxWidth: '480px', width: '100%'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚠️</div>
            <h1 style={{ color: '#dc2626', margin: '0 0 12px', fontSize: '24px', fontWeight: 800 }}>
              Something Went Wrong
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '32px', lineHeight: '1.6' }}>
              The page encountered an error. Please refresh and try again.
              If this keeps happening, contact your administrator.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: '#0d9488', color: 'white', border: 'none',
                  padding: '12px 28px', borderRadius: '12px', fontSize: '15px',
                  fontWeight: 700, cursor: 'pointer'
                }}>
                🔄 Refresh Page
              </button>
              <button
                onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
                style={{
                  background: '#1e1b4b', color: 'white', border: 'none',
                  padding: '12px 28px', borderRadius: '12px', fontSize: '15px',
                  fontWeight: 700, cursor: 'pointer'
                }}>
                🏠 Go Home
              </button>
            </div>
            {this.state.error && (
              <details style={{ marginTop: '24px', textAlign: 'left' }}>
                <summary style={{ fontSize: '12px', color: '#9ca3af', cursor: 'pointer' }}>
                  Technical Details
                </summary>
                <pre style={{
                  background: '#f9fafb', padding: '12px',
                  borderRadius: '8px', overflow: 'auto',
                  marginTop: '8px', fontSize: '11px', color: '#374151'
                }}>
                  {this.state.error?.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
