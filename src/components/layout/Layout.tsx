import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';

const SIDEBAR_EXPANDED  = 256;
const SIDEBAR_COLLAPSED = 72;

const isMobile = () => window.innerWidth < 768;

// ── Map route → clé i18n ───────────────────────────────────────────────────
const ROUTE_TITLES: Record<string, string> = {
    '/dashboard':     'nav.dashboard',
    '/clients':       'nav.clients',
    '/suppliers':     'nav.suppliers',
    '/products':      'nav.products',
    '/sales':         'nav.sales',
    '/purchases':     'nav.purchases',
    '/stock':         'nav.stock',
    '/quotes':        'nav.quotes',
    '/charges':       'nav.charges',
    '/employees':     'nav.employees',
    '/accounting':    'nav.accounting',
    '/reports':       'nav.reports',
    '/settings':      'nav.settings',
    '/notifications': 'nav.notifications',
    '/admin/dashboard':     'nav.admin.dashboard',
    '/admin/companies':     'nav.admin.companies',
    '/admin/users':         'nav.admin.users',
    '/admin/subscriptions': 'nav.admin.subscriptions',
};

const Layout: React.FC = () => {
    const { i18n, t } = useTranslation();
    const location     = useLocation();
    const isRTL        = i18n.language === 'ar';

    const [sidebarWidth, setSidebarWidth] = useState(
        isMobile() ? 0 : SIDEBAR_EXPANDED
    );

    // ── Titre dynamique ────────────────────────────────────────────────────
    useEffect(() => {
        const path = '/' + location.pathname.split('/').slice(1, 3).join('/');
        // Cherche d'abord le chemin complet, puis juste le premier segment
        const key = ROUTE_TITLES[path]
            || ROUTE_TITLES['/' + location.pathname.split('/')[1]]
            || 'nav.dashboard';
        const pageTitle = t(key);
        document.title = `${pageTitle} — KyPro ERP`;
    }, [location.pathname, i18n.language, t]);

    // ── Sidebar toggle ─────────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e: Event) => {
            const { collapsed } = (e as CustomEvent).detail;
            if (!isMobile()) {
                setSidebarWidth(collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED);
            }
        };
        window.addEventListener('sidebar-toggle', handler);

        const onResize = () => {
            if (isMobile()) setSidebarWidth(0);
        };
        window.addEventListener('resize', onResize);

        return () => {
            window.removeEventListener('sidebar-toggle', handler);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    // Recalcule le margin quand la langue change (RTL ↔ LTR)
    useEffect(() => {
        if (!isMobile()) setSidebarWidth(SIDEBAR_EXPANDED);
    }, [i18n.language]);

    const marginStyle = isMobile()
        ? {}
        : isRTL
            ? { marginRight: sidebarWidth - 56 }
            : { marginLeft:  sidebarWidth - 56 };

    return (
        <div
            className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden"
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            <Sidebar />
            <main
                className="flex-1 overflow-auto transition-all duration-300 w-full"
                style={marginStyle}
            >
                <div className="h-16 md:hidden" />
                <div className="px-2 py-2 sm:px-3 sm:py-3 lg:px-4 lg:py-4 max-w-screen-2xl mx-auto">
                    <div className="flex flex-col gap-4">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;