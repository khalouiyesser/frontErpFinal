import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, Truck, Package, ShoppingCart, ShoppingBag,
    Warehouse, FileText, Receipt, UserCog, Calculator, Bell,
    Settings, LogOut, ChevronLeft, ChevronRight,
    Shield, Building2, Sun, Moon, Globe, Menu, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { setLanguage, type Lang } from '../../i18n/i18n';
import { cn } from '../../utils';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../../api';

const BUSINESS_NAV = [
    { icon: LayoutDashboard, key: 'nav.dashboard',  to: '/dashboard' },
    { icon: Users,           key: 'nav.clients',    to: '/clients' },
    { icon: Truck,           key: 'nav.suppliers',  to: '/suppliers' },
    { icon: Package,         key: 'nav.products',   to: '/products' },
    { icon: ShoppingCart,    key: 'nav.sales',      to: '/sales' },
    { icon: ShoppingBag,     key: 'nav.purchases',  to: '/purchases' },
    { icon: Warehouse,       key: 'nav.stock',      to: '/stock' },
    { icon: FileText,        key: 'nav.quotes',     to: '/quotes' },
    { icon: Receipt,         key: 'nav.charges',    to: '/charges' },
    { icon: UserCog,         key: 'nav.employees',  to: '/employees' },
    { icon: Calculator,      key: 'nav.accounting', to: '/accounting' },
];

const ADMIN_NAV = [
    { icon: LayoutDashboard, key: 'nav.admin.dashboard',  to: '/admin/dashboard' },
    { icon: Building2,       key: 'nav.admin.companies',  to: '/admin/companies' },
    { icon: Users,           key: 'nav.admin.users',      to: '/admin/users' },
];

const LANGS: { code: Lang; flag: string; label: string }[] = [
    { code: 'fr', flag: '🇫🇷', label: 'FR' },
    { code: 'ar', flag: '🇹🇳', label: 'AR' },
    { code: 'en', flag: '🇬🇧', label: 'EN' },
];

const isMobile = () => window.innerWidth < 768;

const Sidebar: React.FC = () => {
    const [collapsed, setCollapsed]   = useState(() => isMobile());
    const [mobileOpen, setMobileOpen] = useState(false);
    const [langOpen, setLangOpen]     = useState(false);

    const { user, logout }       = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const { t, i18n }            = useTranslation();
    const location               = useLocation();

    const isRTL    = i18n.language === 'ar';
    const isAdmin  = user?.role === 'system_admin';
    const navItems = isAdmin ? ADMIN_NAV : BUSINESS_NAV;

    const { data: notifications } = useQuery({
        queryKey: ['notifications'],
        queryFn:  notificationsApi.getAll,
        refetchInterval: 60_000,
        enabled: !isAdmin,
    });

    const unreadCount = Array.isArray(notifications)
        ? notifications.filter((n: any) => !n.isRead).length
        : 0;

    useEffect(() => {
        const onResize = () => {
            if (isMobile()) { setCollapsed(true); setMobileOpen(false); }
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Fermer le sidebar mobile au changement de route
    useEffect(() => { setMobileOpen(false); }, [location.pathname]);

    const handleLang = (code: Lang) => {
        setLanguage(code);
        setLangOpen(false);
    };

    // Tooltip : en RTL il apparaît à droite du sidebar, en LTR à gauche
    const tooltipClass = isRTL
        ? 'absolute right-full mr-2 px-2.5 py-1.5 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50'
        : 'absolute left-full ml-2 px-2.5 py-1.5 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50';

    const sidebarContent = (
        <div className="flex flex-col h-full">

            {/* ── Logo ─────────────────────────────────────────────────────── */}
            <div className={cn(
                'flex items-center gap-3 px-4 py-5 border-b border-slate-100 dark:border-slate-800',
                collapsed && !mobileOpen && 'justify-center px-2'
            )}>
                <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
                    {/* Logo lettre — agrandi */}
                    <span className="text-white font-black text-base">K</span>
                </div>
                {(!collapsed || mobileOpen) && (
                    <div className="min-w-0">
                        {/* App name — agrandi de text-sm à text-base */}
                        <p className="font-black text-slate-900 dark:text-white text-base leading-tight">
                            KyPro ERP
                        </p>
                        {/* Business name — agrandi de text-[10px] à text-xs */}
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                            {user?.businessName || 'Workspace'}
                        </p>
                    </div>
                )}
            </div>

            {/* ── Nav ──────────────────────────────────────────────────────── */}
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
                {navItems.map(({ icon: Icon, key, to }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) => cn(
                            // text-sm → text-[0.9rem] — légèrement plus grand, lisible
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[0.9rem] font-semibold transition-all duration-150 group relative',
                            isActive
                                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100',
                            collapsed && !mobileOpen && 'justify-center px-2'
                        )}
                    >
                        {/* Icônes agrandies de 18 → 20 */}
                        <Icon size={20} className="flex-shrink-0" />
                        {(!collapsed || mobileOpen) && (
                            <span className="truncate">{t(key)}</span>
                        )}
                        {collapsed && !mobileOpen && (
                            <div className={tooltipClass}>
                                {t(key)}
                            </div>
                        )}
                    </NavLink>
                ))}

                {/* Notifications */}
                {!isAdmin && (
                    <NavLink
                        to="/notifications"
                        className={({ isActive }) => cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[0.9rem] font-semibold transition-all duration-150 relative',
                            isActive
                                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100',
                            collapsed && !mobileOpen && 'justify-center px-2'
                        )}
                    >
                        <div className="relative flex-shrink-0">
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 min-w-[18px] min-h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-0.5">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </div>
                        {(!collapsed || mobileOpen) && (
                            <span>{t('nav.notifications')}</span>
                        )}
                    </NavLink>
                )}
            </nav>

            {/* ── Bottom controls ───────────────────────────────────────────── */}
            <div className="border-t border-slate-100 dark:border-slate-800 p-3 space-y-0.5">

                {/* Theme toggle */}
                <button
                    onClick={toggleTheme}
                    className={cn(
                        'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[0.9rem] font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors',
                        collapsed && !mobileOpen && 'justify-center px-2'
                    )}
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                    {(!collapsed || mobileOpen) && (
                        <span>{isDark ? t('settings.light') : t('settings.dark')}</span>
                    )}
                </button>

                {/* Language picker */}
                <div className="relative">
                    <button
                        onClick={() => setLangOpen(p => !p)}
                        className={cn(
                            'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[0.9rem] font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors',
                            collapsed && !mobileOpen && 'justify-center px-2'
                        )}
                    >
                        <Globe size={20} />
                        {(!collapsed || mobileOpen) && (
                            <span>
                                {LANGS.find(l => l.code === i18n.language)?.flag}{' '}
                                {i18n.language.toUpperCase()}
                            </span>
                        )}
                    </button>

                    {langOpen && (
                        <div className={cn(
                            'absolute bottom-full mb-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-lg p-1 z-50',
                            collapsed && !mobileOpen
                                ? isRTL ? 'right-full mr-2' : 'left-full ml-2'
                                : 'left-0 right-0'
                        )}>
                            {LANGS.map(l => (
                                <button
                                    key={l.code}
                                    onClick={() => handleLang(l.code)}
                                    className={cn(
                                        // text-sm → text-[0.9rem]
                                        'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[0.9rem] font-semibold transition-colors',
                                        i18n.language === l.code
                                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    )}
                                >
                                    <span className="text-base">{l.flag}</span>
                                    <span>{l.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Settings */}
                <NavLink
                    to="/settings"
                    className={({ isActive }) => cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[0.9rem] font-semibold transition-colors',
                        isActive
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100',
                        collapsed && !mobileOpen && 'justify-center px-2'
                    )}
                >
                    <Settings size={20} />
                    {(!collapsed || mobileOpen) && <span>{t('settings.title')}</span>}
                </NavLink>

                {/* Divider */}
                <div className="h-px bg-slate-100 dark:bg-slate-800 mx-1 my-1" />

                {/* User + Logout */}
                <div className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl',
                    collapsed && !mobileOpen && 'justify-center'
                )}>
                    {/* Avatar — légèrement agrandi */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-white text-sm font-bold">
                            {user?.name?.[0]?.toUpperCase() || 'U'}
                        </span>
                    </div>

                    {(!collapsed || mobileOpen) && (
                        <div className="flex-1 min-w-0">
                            {/* Nom — agrandi de text-xs à text-sm */}
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                                {user?.name}
                            </p>
                            {/* Email — agrandi de text-[10px] à text-xs */}
                            <p className="text-xs text-slate-400 truncate mt-0.5">
                                {user?.email}
                            </p>
                        </div>
                    )}

                    {(!collapsed || mobileOpen) && (
                        <button
                            onClick={logout}
                            title={t('nav.logout')}
                            className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                        >
                            <LogOut size={17} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    // Bouton collapse : en RTL les chevrons sont inversés
    const CollapseIcon = isRTL
        ? (collapsed ? ChevronLeft  : ChevronRight)
        : (collapsed ? ChevronRight : ChevronLeft);

    const collapseButtonClass = isRTL
        ? 'absolute -left-3 top-20 w-6 h-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-sm text-slate-500 hover:text-primary-600 transition-colors'
        : 'absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-sm text-slate-500 hover:text-primary-600 transition-colors';

    // Bouton hamburger : en RTL positionné à droite
    const hamburgerClass = isRTL
        ? 'fixed top-4 right-4 z-40 md:hidden bg-white dark:bg-slate-900 p-2.5 rounded-xl shadow-card border border-slate-100 dark:border-slate-800'
        : 'fixed top-4 left-4 z-40 md:hidden bg-white dark:bg-slate-900 p-2.5 rounded-xl shadow-card border border-slate-100 dark:border-slate-800';

    // Position du sidebar desktop
    const desktopSidebarClass = cn(
        'hidden md:flex flex-col fixed inset-y-0 z-30 bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 transition-all duration-300',
        isRTL ? 'right-0 border-l' : 'left-0 border-r',
        collapsed ? 'w-[72px]' : 'w-64'
    );

    // Position du sidebar mobile
    const mobileSidebarClass = cn(
        'fixed inset-y-0 z-50 w-72 bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 transition-transform duration-300 md:hidden',
        isRTL ? 'right-0 border-l' : 'left-0 border-r',
        mobileOpen
            ? 'translate-x-0'
            : isRTL ? 'translate-x-full' : '-translate-x-full'
    );

    return (
        <>
            {/* Bouton hamburger mobile */}
            <button
                onClick={() => setMobileOpen(true)}
                className={hamburgerClass}
                aria-label={t('common.open') || 'Open menu'}
            >
                <Menu size={20} className="text-slate-700 dark:text-slate-300" />
            </button>

            {/* Overlay mobile */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 md:hidden"
                    onClick={() => setMobileOpen(false)}
                >
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                </div>
            )}

            {/* Sidebar mobile */}
            <aside className={mobileSidebarClass}>
                <button
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                        'absolute top-4 p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
                        isRTL ? 'left-4' : 'right-4'
                    )}
                    aria-label={t('common.close')}
                >
                    <X size={18} />
                </button>
                {sidebarContent}
            </aside>

            {/* Sidebar desktop */}
            <aside className={desktopSidebarClass}>
                {sidebarContent}

                {/* Bouton collapse */}
                <button
                    onClick={() => setCollapsed(p => {
                        const next = !p;
                        window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed: next } }));
                        return next;
                    })}
                    className={collapseButtonClass}
                >
                    <CollapseIcon size={12} />
                </button>
            </aside>
        </>
    );
};

export default Sidebar;