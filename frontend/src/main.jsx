import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import 'leaflet/dist/leaflet.css';

console.log('main.jsx: Starting app...');

try {
  const root = document.getElementById('root');
  console.log('Found root element:', root);
  
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  
  console.log('App rendered successfully');
} catch (error) {
  console.error('Error rendering app:', error);
}
