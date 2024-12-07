import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// TypeScript 環境ではnullチェックが必要
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
