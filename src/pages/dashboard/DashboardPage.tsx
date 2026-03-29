import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../api';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
    TrendingUp, TrendingDown, ShoppingCart, Users, Package,
    AlertTriangle, RefreshCw, ArrowUpRight, ArrowDownRight,
    Activity, Award, Wallet, BarChart2,
} from 'lucide-react';
import { format, Locale } from 'date-fns';
import { fr, ar, enUS } from 'date-fns/locale';

// ── Locale map ────────────────────────────────────────────────────────────────
const DATE_LOCALES: Record<string, Locale> = { fr, ar, en: enUS };

// ── Number helpers ─────────────────────────────────────────────────────────────
const tnd = (v = 0) =>
    Number(v).toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

// ── Count-up ──────────────────────────────────────────────────────────────────
const useCountUp = (target: number, ms = 1200) => {
    const [v, setV] = useState(0);
    useEffect(() => {
        if (!target) { setV(0); return; }
        let start: number | null = null;
        const tick = (ts: number) => {
            if (!start) start = ts;
            const p = Math.min((ts - start) / ms, 1);
            setV(target * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, [target, ms]);
    return v;
};

// ── Radial SVG ─────────────────────────────────────────────────────────────────
const Radial: React.FC<{ value: number; max: number; color: string; size?: number }> = ({
                                                                                            value, max, color, size = 64,
                                                                                        }) => {
    const r    = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const fill = circ * Math.min(max > 0 ? value / max : 0, 1);
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={4}
                    className="text-gray-200 dark:text-white/10" />
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
                    strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1.3s cubic-bezier(.4,0,.2,1)' }} />
        </svg>
    );
};

// ── Progress bar ───────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => (
    <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden mt-2">
        <div className="h-full rounded-full transition-all duration-1000"
             style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%`, background: color }} />
    </div>
);

// ── Chart tooltip ──────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label, isDark }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className={`rounded-xl border px-3 py-2.5 text-sm shadow-xl ${
            isDark ? 'bg-[#0f172a] border-white/10' : 'bg-white border-gray-200'
        }`}>
            <p className="text-gray-400 mb-1 font-semibold text-xs">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} style={{ color: p.color }} className="font-bold text-xs">
                    {p.name}: {tnd(p.value)} TND
                </p>
            ))}
        </div>
    );
};

// ── KPI Card ───────────────────────────────────────────────────────────────────
const KPICard: React.FC<{
    label: string; value: number; sub?: string; color: string;
    icon: React.ReactNode; isCount?: boolean; warning?: boolean; delta?: number | null;
}> = ({ label, value, sub, color, icon, isCount, warning, delta }) => {
    const anim    = useCountUp(value);
    const display = isCount ? Math.round(anim).toString() : tnd(anim);

    return (
        <div className={`relative rounded-2xl p-5 border transition-all duration-200
            hover:-translate-y-0.5 hover:shadow-lg group overflow-hidden
            bg-white dark:bg-white/[0.03] backdrop-blur-sm
            ${warning ? 'border-amber-500/25' : 'border-gray-200 dark:border-white/[0.07]'}`}
        >
            {/* Top accent line */}
            <div className="absolute top-0 left-4 right-4 h-[2px] rounded-b-sm"
                 style={{ background: color }} />
            {/* Glow */}
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.06] blur-xl pointer-events-none"
                 style={{ background: color }} />

            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    {/* Label */}
                    <p className="text-xs font-bold uppercase tracking-[0.07em] text-gray-500 dark:text-gray-400 mb-2.5 leading-tight">
                        {label}
                    </p>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                        {/* Valeur — text-2xl */}
                        <span className="text-2xl font-black text-gray-900 dark:text-white tabular-nums leading-none">
                            {display}
                        </span>
                        {!isCount && <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold">TND</span>}
                    </div>
                    {/* Sous-label */}
                    {sub && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-medium leading-tight">
                            {sub}
                        </p>
                    )}
                    {delta != null && (
                        <div className={`inline-flex items-center gap-1 mt-2 text-xs font-bold ${
                            delta >= 0 ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                            {delta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {Math.abs(delta).toFixed(1)}%
                        </div>
                    )}
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                    {icon}
                </div>
            </div>
        </div>
    );
};

// ── Section header ─────────────────────────────────────────────────────────────
const SH: React.FC<{ title: string; sub?: string; right?: React.ReactNode }> = ({ title, sub, right }) => (
    <div className="flex items-start justify-between gap-2 mb-4">
        <div>
            {/* Titre section — text-lg */}
            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-none">{title}</h3>
            {/* Sous-titre — text-sm */}
            {sub && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">{sub}</p>}
        </div>
        {right}
    </div>
);

// ── Panel ──────────────────────────────────────────────────────────────────────
const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-white dark:bg-white/[0.03] backdrop-blur-sm border border-gray-200 dark:border-white/[0.07]
      rounded-2xl p-5 ${className}`}>
        {children}
    </div>
);

// ══════════════════════════════════════════════════════════════════════════════
//  PAGE
// ══════════════════════════════════════════════════════════════════════════════
const DashboardPage: React.FC = () => {
    const { t, i18n }   = useTranslation();
    const lang           = i18n.language;
    const { isDark }     = useTheme();

    const { data: dash, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['dashboard'],
        queryFn:  () => dashboardApi.get(),
        refetchInterval: 60_000,
    });

    // ── Data ────────────────────────────────────────────────────────────────────
    const revenue       = dash?.revenue          ?? { total: 0, paid: 0, remaining: 0 };
    const revenueMonth  = dash?.revenueThisMonth ?? { total: 0, count: 0 };
    const purchases     = dash?.purchases        ?? { total: 0, debt: 0 };
    const recentSales   = (dash?.recentSales      ?? []) as any[];
    const topClients    = (dash?.topClients       ?? []) as any[];
    const lowStock      = (dash?.lowStockProducts  ?? []) as any[];
    const activeClients = dash?.clients?.active   ?? 0;
    const chargesMonth  = dash?.chargesThisMonth  ?? 0;
    const unreadNotif   = dash?.unreadNotifications ?? 0;
    const netProfit     = revenueMonth.total - purchases.total - chargesMonth;
    const maxClientRev  = topClients[0]?.total ?? 1;

    const smeta = useMemo(() => ({
        paid:    { label: t('sales.paid'),    color: '#22c55e' },
        partial: { label: t('sales.partial'), color: '#f59e0b' },
        pending: { label: t('sales.pending'), color: '#ef4444' },
    }), [t]);

    const statusDist = useMemo(() => {
        const map: Record<string, { count: number; total: number }> = {};
        recentSales.forEach((v: any) => {
            const s = v.status || 'pending';
            if (!map[s]) map[s] = { count: 0, total: 0 };
            map[s].count++;
            map[s].total += v.totalTTC || 0;
        });
        return Object.entries(map).map(([id, d]) => ({
            id, ...d,
            meta: (smeta as any)[id] ?? { label: id, color: '#94a3b8' },
        }));
    }, [recentSales, smeta]);

    const MONTHS = useMemo(() => {
        const locale = DATE_LOCALES[lang] ?? fr;
        return Array.from({ length: 12 }, (_, i) =>
            format(new Date(2024, i, 1), 'MMM', { locale }).slice(0, 3)
        );
    }, [lang]);

    const chartData = useMemo(() => {
        if (dash?.monthlyVentes?.length) {
            return dash.monthlyVentes.map((m: any) => ({
                name:   MONTHS[(m._id?.month || 1) - 1],
                CA:     +(m.revenue   || 0).toFixed(3),
                Achats: +(m.purchases || 0).toFixed(3),
            }));
        }
        return [{ name: MONTHS[new Date().getMonth()], CA: revenueMonth.total, Achats: purchases.total }];
    }, [dash, MONTHS, revenueMonth, purchases]);

    // ── Skeleton ────────────────────────────────────────────────────────────────
    if (isLoading) return (
        <div className="min-h-screen p-0 space-y-3 pt-4">
            {/* 3 colonnes skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-0">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-32 rounded-2xl bg-white/[0.04] animate-pulse" />
                ))}
            </div>
        </div>
    );

    const CHART_COLORS = {
        grid: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
        text: '#64748b',
    };

    return (
        <div className="min-h-screen transition-colors duration-300">

            {/* ── TOPBAR ── */}
            <div className="sticky top-0 z-20 backdrop-blur-md border-b border-gray-200 dark:border-white/[0.06] bg-white/80 dark:bg-transparent px-4 sm:px-5 py-3.5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center
                            bg-gradient-to-br from-cyan-400 to-blue-500 shadow-md shadow-blue-500/30">
                            <BarChart2 size={17} color="white" />
                        </div>
                        <div>
                            {/* Titre topbar — text-lg */}
                            <h1 className="text-lg font-black text-gray-900 dark:text-white leading-none">
                                {t('dashboard.title')}
                            </h1>
                            {/* Date — text-xs */}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize font-medium">
                                {format(new Date(), 'EEEE d MMMM yyyy', { locale: DATE_LOCALES[lang] ?? fr })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Live badge */}
                        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                            bg-emerald-500/10 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wide">LIVE</span>
                        </div>

                        {/* Notif badge */}
                        {unreadNotif > 0 && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                              bg-amber-500/10 border border-amber-500/20">
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                    {unreadNotif} {t('notifications.title').toLowerCase()}
                                </span>
                            </div>
                        )}

                        {/* Refresh */}
                        <button
                            onClick={() => refetch()}
                            disabled={isRefetching}
                            className="w-9 h-9 rounded-lg flex items-center justify-center
                                bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400
                                hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-40"
                        >
                            <RefreshCw size={14} className={isRefetching ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-3 sm:px-4 py-5 space-y-4 max-w-screen-2xl mx-auto">

                {/* ── KPI GRID — 1 col mobile, 3 cols desktop (au lieu de 4) ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <KPICard
                        label={t('dashboard.totalRevenue')}
                        value={revenue.total}
                        sub={`${t('dashboard.collected')}: ${tnd(revenue.paid)} TND`}
                        color="#22d3ee"
                        icon={<TrendingUp size={17} color="#22d3ee" />}
                    />
                    <KPICard
                        label={t('dashboard.monthRevenue')}
                        value={revenueMonth.total}
                        sub={`${revenueMonth.count} ${t('dashboard.sales')}`}
                        color="#4ade80"
                        icon={<Activity size={17} color="#4ade80" />}
                    />
                    <KPICard
                        label={t('dashboard.netProfit')}
                        value={Math.abs(netProfit)}
                        sub={netProfit >= 0 ? `↑ ${t('dashboard.positive')}` : `↓ ${t('dashboard.negative')}`}
                        color={netProfit >= 0 ? '#4ade80' : '#f87171'}
                        icon={netProfit >= 0
                            ? <TrendingUp  size={17} color="#4ade80" />
                            : <TrendingDown size={17} color="#f87171" />}
                    />
                    <KPICard
                        label={t('dashboard.receivables')}
                        value={revenue.remaining}
                        sub={t('dashboard.notCollected')}
                        color="#fbbf24"
                        icon={<AlertTriangle size={17} color="#fbbf24" />}
                        warning={revenue.remaining > 0}
                    />
                    <KPICard
                        label={t('dashboard.totalPurchases')}
                        value={purchases.total}
                        sub={purchases.debt > 0 ? `Dû: ${tnd(purchases.debt)} TND` : '✓ Réglé'}
                        color="#a78bfa"
                        icon={<ShoppingCart size={17} color="#a78bfa" />}
                    />
                    <KPICard
                        label={t('dashboard.charges')}
                        value={chargesMonth}
                        color="#f87171"
                        icon={<Wallet size={17} color="#f87171" />}
                    />
                    <KPICard
                        label={t('dashboard.totalClients')}
                        value={activeClients}
                        isCount
                        sub={`${activeClients} ${t('dashboard.active')}`}
                        color="#60a5fa"
                        icon={<Users size={17} color="#60a5fa" />}
                    />
                    <KPICard
                        label={t('dashboard.lowStock')}
                        value={lowStock.length}
                        isCount
                        sub={lowStock.length > 0
                            ? lowStock.slice(0, 2).map((p: any) => p.name).join(', ')
                            : `✓ ${t('dashboard.stockOk')}`}
                        color={lowStock.length > 0 ? '#fbbf24' : '#4ade80'}
                        icon={<Package size={17} color={lowStock.length > 0 ? '#fbbf24' : '#4ade80'} />}
                        warning={lowStock.length > 0}
                    />
                </div>

                {/* ── RADIAL GAUGES ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        {
                            label: t('dashboard.collectionRate'),
                            value: revenue.paid,
                            max:   revenue.total,
                            color: '#22d3ee',
                            pv:    pct(revenue.paid, revenue.total),
                        },
                        {
                            label: t('dashboard.netMargin'),
                            value: Math.max(0, netProfit),
                            max:   revenueMonth.total,
                            color: '#4ade80',
                            pv:    pct(Math.max(0, netProfit), revenueMonth.total),
                        },
                        {
                            label: t('dashboard.debtRate'),
                            value: revenue.remaining,
                            max:   revenue.total,
                            color: '#fbbf24',
                            pv:    pct(revenue.remaining, revenue.total),
                        },
                    ].map(({ label, value, max, color, pv }) => (
                        <Panel key={label} className="flex items-center gap-5">
                            <div className="relative flex-shrink-0">
                                <Radial value={value} max={max} color={color} size={64} />
                                <span className="absolute inset-0 flex items-center justify-center text-sm font-black"
                                      style={{ color }}>
                                    {pv}%
                                </span>
                            </div>
                            <div className="min-w-0">
                                {/* Label gauge */}
                                <p className="text-xs font-bold uppercase tracking-[0.07em] text-gray-500 dark:text-gray-400 mb-1.5">
                                    {label}
                                </p>
                                {/* Valeur gauge — text-lg */}
                                <p className="text-lg font-black text-gray-900 dark:text-white tabular-nums">
                                    {tnd(value)} <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">TND</span>
                                </p>
                            </div>
                        </Panel>
                    ))}
                </div>

                {/* ── CHART + PIE ROW ── */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">

                    {/* Area chart */}
                    <Panel>
                        <SH
                            title={t('dashboard.financialEvolution')}
                            sub={t('dashboard.last6Months')}
                        />
                        <ResponsiveContainer width="100%" height={210}>
                            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gCA" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%"   stopColor="#22d3ee" stopOpacity={0.2} />
                                        <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gAch" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%"   stopColor="#a78bfa" stopOpacity={0.2} />
                                        <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="2 4" stroke={CHART_COLORS.grid} />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: CHART_COLORS.text }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: CHART_COLORS.text }} axisLine={false} tickLine={false} />
                                <Tooltip content={(props) => <ChartTip {...props} isDark={isDark} />} />
                                <Area type="monotone" dataKey="CA"     name={t('dashboard.revenue')}   stroke="#22d3ee" strokeWidth={2} fill="url(#gCA)" />
                                <Area type="monotone" dataKey="Achats" name={t('dashboard.purchases')} stroke="#a78bfa" strokeWidth={2} fill="url(#gAch)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Panel>

                    {/* Status donut */}
                    <Panel>
                        <SH
                            title={t('dashboard.salesStatus')}
                            sub={`${recentSales.length} ${t('dashboard.recentSales').toLowerCase()}`}
                        />
                        {statusDist.length === 0 ? (
                            <div className="h-32 flex items-center justify-center text-sm text-gray-500">
                                {t('common.noData')}
                            </div>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={120}>
                                    <PieChart>
                                        <Pie data={statusDist} dataKey="count" cx="50%" cy="50%"
                                             innerRadius={34} outerRadius={54} paddingAngle={3} strokeWidth={0}>
                                            {statusDist.map((d: any, i: number) => (
                                                <Cell key={i} fill={d.meta.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="space-y-2.5 mt-2">
                                    {statusDist.map((d: any) => (
                                        <div key={d.id}>
                                            <div className="flex items-center justify-between text-sm mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.meta.color }} />
                                                    <span className="font-semibold text-gray-600 dark:text-gray-300">{d.meta.label}</span>
                                                </div>
                                                <span className="font-black text-sm" style={{ color: d.meta.color }}>{d.count}</span>
                                            </div>
                                            <ProgressBar value={d.count} max={recentSales.length} color={d.meta.color} />
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </Panel>
                </div>

                {/* ── TOP CLIENTS + BAR CHART ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

                    {/* Top clients */}
                    <Panel>
                        <SH
                            title={t('dashboard.topClients')}
                            sub={t('dashboard.byRevenue')}
                            right={<Award size={16} className="text-amber-400" />}
                        />
                        {topClients.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-6">{t('dashboard.noClients')}</p>
                        ) : (
                            <div className="space-y-4">
                                {topClients.map((c: any, i: number) => {
                                    const rev = c.total ?? c.revenue ?? 0;
                                    const MEDALS = ['#fbbf24', '#94a3b8', '#b45309', '#60a5fa', '#a78bfa'];
                                    const mc    = MEDALS[i] ?? '#60a5fa';
                                    return (
                                        <div key={c._id}>
                                            <div className="flex items-center gap-2.5 mb-1.5">
                                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                                                      style={{ background: `${mc}18`, border: `1px solid ${mc}40`, color: mc }}>
                                                    {i + 1}
                                                </span>
                                                {/* Nom client — text-sm */}
                                                <span className="flex-1 text-sm font-bold text-gray-900 dark:text-white truncate">{c.clientName}</span>
                                                <span className="text-sm font-black flex-shrink-0" style={{ color: mc }}>{tnd(rev)} TND</span>
                                            </div>
                                            <ProgressBar value={rev} max={maxClientRev} color={mc} />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Panel>

                    {/* Bar chart CA by month */}
                    <Panel>
                        <SH title={t('dashboard.revenueVsPurchasesVsProfit')} />
                        <ResponsiveContainer width="100%" height={210}>
                            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="2 4" stroke={CHART_COLORS.grid} />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: CHART_COLORS.text }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: CHART_COLORS.text }} axisLine={false} tickLine={false} />
                                <Tooltip content={(props) => <ChartTip {...props} isDark={isDark} />} />
                                <Bar dataKey="CA"     name={t('dashboard.revenue')}   fill="#22d3ee" radius={[4,4,0,0]} opacity={0.85} />
                                <Bar dataKey="Achats" name={t('dashboard.purchases')} fill="#a78bfa" radius={[4,4,0,0]} opacity={0.75} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Panel>
                </div>

                {/* ── LOW STOCK ── */}
                {lowStock.length > 0 && (
                    <Panel className="border-amber-500/20">
                        <SH
                            title={t('dashboard.lowStockProducts')}
                            sub={t('dashboard.belowThreshold')}
                            right={
                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-400
                                    bg-amber-500/10 border border-amber-500/20">
                                    {lowStock.length} alerte{lowStock.length > 1 ? 's' : ''}
                                </span>
                            }
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {lowStock.map((p: any) => (
                                <div key={p._id}
                                     className="flex items-center gap-3 p-3.5 rounded-xl
                                        bg-amber-500/[0.05] border border-amber-500/15">
                                    <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        {/* Nom produit — text-sm */}
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{p.name}</p>
                                        <p className="text-xs text-amber-400 mt-0.5 font-semibold">
                                            {p.stockQuantity} {p.unit} / min {p.stockThreshold}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Panel>
                )}

                {/* ── RECENT SALES ── */}
                <Panel>
                    <SH
                        title={t('dashboard.recentSales')}
                        sub={t('dashboard.last10Transactions')}
                    />
                    {recentSales.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-6">{t('dashboard.noSales')}</p>
                    ) : (
                        <div className="space-y-0.5">
                            {recentSales.map((v: any) => {
                                const meta = (smeta as any)[v.status] ?? { label: v.status, color: '#94a3b8' };
                                return (
                                    <div key={v._id}
                                         className="flex items-center gap-3 px-3 py-3 rounded-xl
                                            hover:bg-gray-50 dark:hover:bg-white/[0.025] transition-colors cursor-default">
                                        {/* Status bar */}
                                        <div className="w-[3px] h-10 rounded-full flex-shrink-0"
                                             style={{ background: meta.color }} />
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                                             style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}25` }}>
                                            {(v.clientName || 'X').slice(0, 2).toUpperCase()}
                                        </div>
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            {/* Nom client — text-sm */}
                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{v.clientName}</p>
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                                                {v.createdAt
                                                    ? format(new Date(v.createdAt), 'dd MMM yyyy · HH:mm', { locale: DATE_LOCALES[lang] ?? fr })
                                                    : '—'}
                                                {v.items?.[0] && ` · ${v.items[0].productName}`}
                                            </p>
                                        </div>
                                        {/* Amount */}
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-black text-cyan-600 dark:text-cyan-400">{tnd(v.totalTTC)} TND</p>
                                            {v.amountRemaining > 0 && (
                                                <p className="text-xs text-amber-500 mt-0.5 font-semibold">
                                                    -{tnd(v.amountRemaining)} TND
                                                </p>
                                            )}
                                        </div>
                                        {/* Badge statut */}
                                        <span className="hidden sm:inline text-xs px-2.5 py-1 rounded-full font-bold flex-shrink-0 whitespace-nowrap"
                                              style={{ background: `${meta.color}12`, color: meta.color, border: `1px solid ${meta.color}25` }}>
                                            {meta.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Panel>

                {/* Bottom safe area mobile */}
                <div className="h-4 sm:h-0" />
            </div>
        </div>
    );
};

export default DashboardPage;