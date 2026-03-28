import React from 'react';

export default function TestApp() {
  console.log('TestApp is rendering');
  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f0f0f0',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <h1 style={{ fontSize: '48px', color: '#333' }}>🧪 Test App</h1>
      <p style={{ fontSize: '18px', color: '#666' }}>If you see this, React is rendering correctly!</p>
      <div style={{
        backgroundColor: '#3b82f6',
        color: 'white',
        padding: '20px',
        borderRadius: '8px',
        fontSize: '16px'
      }}>
        ✅ React + Vite + Tailwind working
      </div>
      <pre style={{
        backgroundColor: '#1e293b',
        color: '#f1f5f9',
        padding: '20px',
        borderRadius: '8px',
        fontSize: '12px',
        maxWidth: '600px',
        overflow: 'auto'
      }}>
{JSON.stringify({
  environment: 'development',
  renderTime: new Date().toISOString(),
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : 'n/a'
}, null, 2)}
      </pre>
    </div>
  );
}
