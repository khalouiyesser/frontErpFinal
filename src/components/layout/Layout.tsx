import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';

const SIDEBAR_EXPANDED  = 256;
const SIDEBAR_COLLAPSED = 72;

const isMobile = () => window.innerWidth < 768;

const Layout: React.FC = () => {
    const { i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';

    const [sidebarWidth, setSidebarWidth] = useState(
        isMobile() ? 0 : SIDEBAR_EXPANDED
    );

    useEffect(() => {
        const handler = (e: Event) => {
            const { collapsed } = (e as CustomEvent).detail;
            if (!isMobile()) {
                setSidebarWidth(collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED);
            }
        };
        window.addEventListener('sidebar-toggle', handler);

        const onResize = () => {
            if (isMobile()) {
                setSidebarWidth(0);
            }
        };
        window.addEventListener('resize', onResize);

        return () => {
            window.removeEventListener('sidebar-toggle', handler);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    // Recalcule le margin quand la langue change (RTL ↔ LTR)
    useEffect(() => {
        if (!isMobile()) {
            setSidebarWidth(SIDEBAR_EXPANDED);
        }
    }, [i18n.language]);

    // Margin réduit : on soustrait 56px (vs 48px avant) pour coller davantage
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
                {/* Spacer pour le bouton hamburger sur mobile */}
                <div className="h-16 md:hidden" />

                {/*
                  * px réduit : 2 sur mobile, 3 sur sm, 4 sur lg (était 1/2/3)
                  * max-w élargi pour profiter de l'espace gagné
                */}
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