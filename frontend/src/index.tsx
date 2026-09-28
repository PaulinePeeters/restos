import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

import { NetworkProvider } from './context/NetworkContext';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <NetworkProvider>
      <App />
    </NetworkProvider>
  </React.StrictMode>
);
