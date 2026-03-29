import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';   // ← contient @import Google Fonts + Tailwind + styles
import './i18n/i18n';   // ← applique lang/dir/font au boot
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);