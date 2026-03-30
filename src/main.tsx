import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';   // Tailwind + Google Fonts + styles globaux
import './i18n/i18n';   // applique lang / dir / font au boot
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);