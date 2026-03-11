import React from 'react';

export default function AppDebug() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>✅ React is working!</h1>
      <p>If you see this message, React and the build system are functioning correctly.</p>
      <hr />
      <h3>Debugging Information:</h3>
      <ul>
        <li>Node Environment: {import.meta.env.MODE}</li>
        <li>Dev: {import.meta.env.DEV ? 'Yes' : 'No'}</li>
      </ul>
    </div>
  );
}
