import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '../../api';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { useTranslation } from 'react-i18next';
import {
    Plus, Pencil, Trash2, X, Search, Users, Wallet, FileText,
    TrendingUp, RefreshCw, ChevronLeft, ChevronRight,
    SlidersHorizontal, UserCheck, UserX, Building2, Phone,
    Mail, CreditCard, CalendarDays,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Employee {
    _id:          string;
    firstName:    string;
    lastName:     string;
    phone?:       string;
    email?:       string;
    position?:    string;
    department?:  string;
    contractType: string;
    salary:       number;
    hireDate?:    string;
    cin?:         string;
    cnss?:        string;
    rib?:         string;
    isActive:     boolean;
    notes?:       string;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const CONTRACTS = ['CDI', 'CDD', 'SIVP', 'Stage', 'Intérim', 'Autre'] as const;

const CONTRACT_COLORS: Record<string, string> = {
    CDI:     'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    CDD:     'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    SIVP:    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    Stage:   'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    Intérim: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    Autre:   'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const CONTRACT_DOT: Record<string, string> = {
    CDI:     'bg-blue-500',
    CDD:     'bg-amber-500',
    SIVP:    'bg-violet-500',
    Stage:   'bg-teal-500',
    Intérim: 'bg-rose-500',
    Autre:   'bg-gray-400',
};

const AVATAR_COLORS = [
    'from-blue-500 to-blue-600',
    'from-emerald-500 to-emerald-600',
    'from-amber-500 to-amber-600',
    'from-rose-500 to-rose-600',
    'from-violet-500 to-violet-600',
    'from-teal-500 to-teal-600',
];

const PAGE_SIZES = [10, 25, 50];

const defaultForm = {
    firstName: '', lastName: '', phone: '+216', email: '',
    position: '', department: '', contractType: 'CDI',
    salary: 0, hireDate: new Date().toISOString().split('T')[0],
    cin: '', cnss: '', rib: '', isActive: true, notes: '',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt      = (v: number) => `${(v || 0).toFixed(3)} TND`;
const initials = (e: Employee) => `${e.firstName?.[0] || ''}${e.lastName?.[0] || ''}`.toUpperCase();
const avatarGradient = (e: Employee) =>
    AVATAR_COLORS[(e.firstName?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

// ── Sub-components ─────────────────────────────────────────────────────────────

// Skeleton row
const SkeletonRow = () => (
    <tr className="animate-pulse">
        <td className="px-4 py-3.5">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                <div className="space-y-1.5">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-lg w-28" />
                    <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg w-20" />
                </div>
            </div>
        </td>
        {[120, 80, 90, 80, 60].map((w, i) => (
            <td key={i} className="px-4 py-3.5">
                <div className={`h-3 bg-gray-100 dark:bg-gray-800 rounded-lg w-${w < 100 ? w / 4 : 28}`} style={{ width: w }} />
            </td>
        ))}
        <td className="px-4 py-3.5" />
    </tr>
);

// Empty state
const EmptyState: React.FC<{ hasFilters: boolean; onCreate: () => void; t: (k: string) => string }> = ({ hasFilters, onCreate, t }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            {hasFilters ? <Search size={28} className="text-gray-400" /> : <Users size={28} className="text-gray-400" />}
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
            {hasFilters ? t('common.noResults') : t('employees.empty')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-5">
            {hasFilters ? t('common.noResultsDesc') : t('employees.emptyDesc')}
        </p>
        {!hasFilters && (
            <button onClick={onCreate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-500/20">
                <Plus size={15} /> {t('employees.addFirst')}
            </button>
        )}
    </div>
);

// Pagination
const Pagination: React.FC<{
    page: number; totalPages: number; pageSize: number; total: number;
    onPage: (p: number) => void; onPageSize: (s: number) => void;
    t: (k: string) => string;
}> = ({ page, totalPages, pageSize, total, onPage, onPageSize, t }) => {
    if (total === 0) return null;
    const start = (page - 1) * pageSize + 1;
    const end   = Math.min(page * pageSize, total);

    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (page > 3) pages.push('...');
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
        if (page < totalPages - 2) pages.push('...');
        pages.push(totalPages);
    }

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span>{start}–{end} {t('common.of')} <span className="font-semibold text-gray-700 dark:text-gray-300">{total}</span></span>
                <select value={pageSize} onChange={e => { onPageSize(+e.target.value); onPage(1); }}
                        className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/25">
                    {PAGE_SIZES.map(s => <option key={s} value={s}>{s} {t('clients.perPage')}</option>)}
                </select>
            </div>
            <div className="flex items-center gap-1">
                <button onClick={() => onPage(page - 1)} disabled={page === 1}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:cursor-not-allowed">
                    <ChevronLeft size={14} />
                </button>
                {pages.map((p, i) =>
                    p === '...' ? (
                        <span key={`d-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
                    ) : (
                        <button key={p} onClick={() => onPage(p as number)}
                                className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all ${page === p ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                            {p}
                        </button>
                    )
                )}
                <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
                        className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:cursor-not-allowed">
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
};

// Form field wrapper
const FormField: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required: req, children }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {label} {req && <span className="text-red-400 normal-case font-normal">*</span>}
        </label>
        {children}
    </div>
);

// ── Main Page ──────────────────────────────────────────────────────────────────
const EmployeesPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { state: confirmState, confirm, proceed, cancel } = useConfirmDialog();
    const { t: tRaw, i18n } = useTranslation();
    const t = (key: string, fallback?: string): string => String(tRaw(key, fallback ?? key));
    const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';

    // ── UI State ───────────────────────────────────────────────────────────────
    const [showForm,         setShowForm]         = useState(false);
    const [editingId,        setEditingId]         = useState<string | null>(null);
    const [form,             setForm]             = useState(defaultForm);
    const [search,           setSearch]           = useState('');
    const [filterContract,   setFilterContract]   = useState('all');
    const [filterStatus,     setFilterStatus]     = useState<'all' | 'active' | 'inactive'>('all');
    const [page,             setPage]             = useState(1);
    const [pageSize,         setPageSize]         = useState(25);

    // ── Data ───────────────────────────────────────────────────────────────────
    const { data: employees = [], isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['employees'],
        queryFn:  () => employeesApi.getAll(),
    });

    const list = employees as Employee[];

    // ── Stats ──────────────────────────────────────────────────────────────────
    const stats = useMemo(() => ({
        total:   list.filter(e => e.isActive).length,
        inactive: list.filter(e => !e.isActive).length,
        salary:  list.filter(e => e.isActive).reduce((s, e) => s + (e.salary || 0), 0),
        cdi:     list.filter(e => e.contractType === 'CDI').length,
        depts:   new Set(list.map(e => e.department).filter(Boolean)).size,
        byContract: CONTRACTS.reduce((acc, c) => {
            acc[c] = list.filter(e => e.contractType === c).length;
            return acc;
        }, {} as Record<string, number>),
    }), [list]);

    // ── Filtering & Pagination ─────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return list.filter(e => {
            if (q && ![e.firstName, e.lastName, e.phone, e.email, e.position, e.department]
                .some(f => f?.toLowerCase().includes(q))) return false;
            if (filterContract !== 'all' && e.contractType !== filterContract) return false;
            if (filterStatus === 'active'   && !e.isActive) return false;
            if (filterStatus === 'inactive' &&  e.isActive) return false;
            return true;
        });
    }, [list, search, filterContract, filterStatus]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

    React.useEffect(() => { setPage(1); }, [search, filterContract, filterStatus, pageSize]);

    const hasFilters = !!(search || filterContract !== 'all' || filterStatus !== 'all');

    // ── Mutations ──────────────────────────────────────────────────────────────
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['employees'] });

    const createMut = useMutation({
        mutationFn: employeesApi.create,
        onSuccess: () => { invalidate(); toast.success(t('employees.created')); closeForm(); },
        onError:   (err: any) => toast.error(err?.response?.data?.message || t('error.generic')),
    });

    const updateMut = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => employeesApi.update(id, data),
        onSuccess: () => { invalidate(); toast.success(t('employees.updated')); closeForm(); },
        onError:   (err: any) => toast.error(err?.response?.data?.message || t('error.generic')),
    });

    const deleteMut = useMutation({
        mutationFn: employeesApi.remove,
        onSuccess: () => { invalidate(); toast.success(t('employees.deleted')); },
    });

    // ── Handlers ───────────────────────────────────────────────────────────────
    const openCreate = () => { setEditingId(null); setForm(defaultForm); setShowForm(true); };

    const openEdit = (e: Employee) => {
        setEditingId(e._id);
        setForm({
            firstName:    e.firstName    || '',
            lastName:     e.lastName     || '',
            phone:        e.phone        || '+216',
            email:        e.email        || '',
            position:     e.position     || '',
            department:   e.department   || '',
            contractType: e.contractType || 'CDI',
            salary:       e.salary       || 0,
            hireDate:     e.hireDate?.split('T')[0] || '',
            cin:          e.cin          || '',
            cnss:         e.cnss         || '',
            rib:          e.rib          || '',
            isActive:     e.isActive     ?? true,
            notes:        e.notes        || '',
        });
        setShowForm(true);
    };

    const closeForm = () => { setShowForm(false); setEditingId(null); setForm(defaultForm); };

    const handleDelete = (e: Employee) => confirm(
        {
            title:         `${t('employees.deleteTitle')} "${e.firstName} ${e.lastName}"`,
            message:       t('employees.deleteMsg'),
            dangerMessage: t('common.action_irreversible'),
            confirmLabel:  t('common.delete'),
        },
        () => deleteMut.mutate(e._id),
    );

    const handleSubmit = (ev: React.FormEvent) => {
        ev.preventDefault();
        if (editingId) updateMut.mutate({ id: editingId, data: form });
        else           createMut.mutate(form as any);
    };

    const setField = (field: keyof typeof form) =>
        (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
            setForm(p => ({
                ...p,
                [field]: ev.target.type === 'checkbox'
                    ? (ev.target as HTMLInputElement).checked
                    : ev.target.type === 'number'
                        ? +ev.target.value
                        : ev.target.value,
            }));

    const inp = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all';

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4 sm:space-y-5" dir={dir}>

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                        {t('employees.title')}
                    </h1>
                    <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm mt-0.5">
                        {filtered.length !== list.length ? (
                            <><span className="text-blue-500 font-semibold">{filtered.length}</span> / {list.length} {t('employees.count')}</>
                        ) : (
                            <>{list.length} {t('employees.count')}</>
                        )}
                        {stats.total > 0 && !hasFilters && (
                            <span className="text-emerald-500 ms-1.5">· {stats.total} {t('employees.activeCount')}</span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                        onClick={() => refetch()}
                        disabled={isRefetching}
                        className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                        title={t('common.refresh')}>
                        <RefreshCw size={15} className={isRefetching ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-500/20">
                        <Plus size={16} /> {t('employees.new')}
                    </button>
                </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { icon: Users,      label: t('employees.stats.active'),   value: stats.total,    sub: t('employees.count'),    color: 'blue'    },
                    { icon: Wallet,     label: t('employees.stats.salary'),   value: `${(stats.salary / 1000).toFixed(1)}k`, sub: 'TND / ' + t('employees.stats.month'), color: 'amber'   },
                    { icon: FileText,   label: t('employees.stats.cdi'),      value: stats.cdi,      sub: t('employees.stats.contracts'), color: 'emerald' },
                    { icon: TrendingUp, label: t('employees.stats.depts'),    value: stats.depts || '—', sub: t('employees.stats.distinct'), color: 'violet'  },
                ].map(({ icon: Icon, label, value, sub, color }) => (
                    <div key={label} className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 overflow-hidden hover:-translate-y-0.5 transition-transform duration-200">
                        <div className={`absolute top-0 start-0 w-1 h-full rounded-s-2xl bg-${color}-500`} />
                        <div className={`inline-flex p-2 rounded-xl mb-3 bg-${color}-50 dark:bg-${color}-900/20`}>
                            <Icon size={16} className={`text-${color}-500`} />
                        </div>
                        <p className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-medium mb-1">{label}</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white leading-none">{value}</p>
                        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
                    </div>
                ))}
            </div>

            {/* ── Status + Contract chips ── */}
            {list.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                    {/* Status */}
                    <button onClick={() => setFilterStatus('all')}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${filterStatus === 'all' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                        {t('common.all')} ({list.length})
                    </button>
                    <button onClick={() => setFilterStatus('active')}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${filterStatus === 'active' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'}`}>
                        <UserCheck size={11} /> {stats.total} {t('employees.active')}
                    </button>
                    {stats.inactive > 0 && (
                        <button onClick={() => setFilterStatus('inactive')}
                                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${filterStatus === 'inactive' ? 'bg-gray-600 text-white border-gray-600 shadow-sm' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                            <UserX size={11} /> {stats.inactive} {t('employees.inactive')}
                        </button>
                    )}

                    {/* Separator */}
                    <div className="w-px bg-gray-200 dark:bg-gray-700 self-stretch" />

                    {/* Contract chips */}
                    {CONTRACTS.filter(c => stats.byContract[c] > 0).map(c => (
                        <button key={c} onClick={() => setFilterContract(filterContract === c ? 'all' : c)}
                                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${filterContract === c ? `${CONTRACT_COLORS[c]} border-current shadow-sm` : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${CONTRACT_DOT[c]}`} />
                            {c} ({stats.byContract[c]})
                        </button>
                    ))}
                </div>
            )}

            {/* ── Toolbar ── */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="relative flex-1 min-w-0">
                    <Search size={15} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('employees.searchPlaceholder')}
                        className="w-full ps-10 pe-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
                    />
                    {search && (
                        <button onClick={() => setSearch('')}
                                className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Active filter tags ── */}
            {hasFilters && (
                <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <SlidersHorizontal size={12} /> {t('clients.filtersActive')}
          </span>
                    {search && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
              "{search}" <button onClick={() => setSearch('')}><X size={11} /></button>
            </span>
                    )}
                    {filterContract !== 'all' && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
              {filterContract} <button onClick={() => setFilterContract('all')}><X size={11} /></button>
            </span>
                    )}
                    {filterStatus !== 'all' && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
              {filterStatus === 'active' ? t('employees.active') : t('employees.inactive')}
                            <button onClick={() => setFilterStatus('all')}><X size={11} /></button>
            </span>
                    )}
                    <button onClick={() => { setSearch(''); setFilterContract('all'); setFilterStatus('all'); }}
                            className="text-xs text-red-500 hover:text-red-600 font-medium underline">
                        {t('clients.clearAll')}
                    </button>
                </div>
            )}

            {/* ── Table ── */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                {isLoading ? (
                    <table className="w-full">
                        <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                            {[t('employees.col.employee'), t('employees.col.contact'), t('employees.col.contract'), t('employees.col.salary'), t('employees.col.hired'), t('common.status'), ''].map(h => (
                                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{h}</th>
                            ))}
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                        {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
                        </tbody>
                    </table>
                ) : filtered.length === 0 ? (
                    <EmptyState hasFilters={hasFilters} onCreate={openCreate} t={t} />
                ) : (
                    <table className="w-full">
                        <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                            {[t('employees.col.employee'), t('employees.col.contact'), t('employees.col.contract'), t('employees.col.salary'), t('employees.col.hired'), t('common.status'), ''].map(h => (
                                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{h}</th>
                            ))}
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                        {paginated.map((emp) => (
                            <tr key={emp._id}
                                className="group hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors duration-100 cursor-pointer"
                                onClick={() => openEdit(emp)}>

                                {/* Employee */}
                                <td className="px-4 py-3.5">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient(emp)} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                            <span className="text-white text-xs font-bold">{initials(emp)}</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                                                {emp.firstName} {emp.lastName}
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                {emp.position || emp.department || '—'}
                                            </p>
                                        </div>
                                    </div>
                                </td>

                                {/* Contact */}
                                <td className="px-4 py-3.5">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                        {emp.phone && <Phone size={11} className="text-gray-400 shrink-0" />}
                                        {emp.phone || '—'}
                                    </p>
                                    {emp.email && (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[160px] flex items-center gap-1">
                                            <Mail size={10} className="shrink-0" /> {emp.email}
                                        </p>
                                    )}
                                </td>

                                {/* Contract */}
                                <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${CONTRACT_COLORS[emp.contractType] || CONTRACT_COLORS['Autre']}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${CONTRACT_DOT[emp.contractType] || CONTRACT_DOT['Autre']}`} />
                        {emp.contractType}
                    </span>
                                </td>

                                {/* Salary */}
                                <td className="px-4 py-3.5">
                    <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                      {fmt(emp.salary)}
                    </span>
                                </td>

                                {/* Hire date */}
                                <td className="px-4 py-3.5">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      {emp.hireDate ? (
                          <><CalendarDays size={11} /> {format(new Date(emp.hireDate), 'dd/MM/yyyy')}</>
                      ) : '—'}
                    </span>
                                </td>

                                {/* Status */}
                                <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${emp.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                        : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                    }`}>
                      {emp.isActive ? <UserCheck size={11} /> : <UserX size={11} />}
                        {emp.isActive ? t('common.active') : t('common.inactive')}
                    </span>
                                </td>

                                {/* Actions */}
                                <td className="px-4 py-3.5">
                                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                        <button
                                            onClick={e => { e.stopPropagation(); openEdit(emp); }}
                                            className="p-1.5 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                            title={t('common.edit')}>
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleDelete(emp); }}
                                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title={t('common.delete')}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {!isLoading && filtered.length > 0 && (
                <Pagination
                    page={page} totalPages={totalPages} pageSize={pageSize} total={filtered.length}
                    onPage={setPage} onPageSize={setPageSize} t={t}
                />
            )}

            {/* ═══════════════════════════════════════
          ── Form Modal ──
      ═══════════════════════════════════════ */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir={dir}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeForm} />
                    <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

                        {/* Header */}
                        <div className="px-5 sm:px-6 pt-3 sm:pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/30">
                                    <Users size={16} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                                        {editingId ? t('employees.editTitle') : t('employees.newTitle')}
                                    </h2>
                                    {!editingId && (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                            {t('employees.autoAccountHint')}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button onClick={closeForm} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <form onSubmit={handleSubmit} id="employee-form" className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">

                            {/* Section Identité */}
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-amber-500 mb-3">
                                    {t('employees.section.identity')}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <FormField label={t('employees.field.firstName')} required>
                                        <input required value={form.firstName} onChange={setField('firstName')}
                                               placeholder={t('employees.placeholder.firstName')} className={inp} />
                                    </FormField>
                                    <FormField label={t('employees.field.lastName')} required>
                                        <input required value={form.lastName} onChange={setField('lastName')}
                                               placeholder={t('employees.placeholder.lastName')} className={inp} />
                                    </FormField>
                                    <FormField label={t('employees.field.phone')}>
                                        <div className="relative">
                                            <Phone size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input value={form.phone} onChange={setField('phone')}
                                                   placeholder="+216 XX XXX XXX" className={inp + ' ps-8'} />
                                        </div>
                                    </FormField>
                                    <FormField label={t('employees.field.email')}>
                                        <div className="relative">
                                            <Mail size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input type="email" value={form.email} onChange={setField('email')}
                                                   placeholder={t('employees.placeholder.email')} className={inp + ' ps-8'} />
                                        </div>
                                    </FormField>
                                    <FormField label={t('employees.field.cin')}>
                                        <div className="relative">
                                            <CreditCard size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input value={form.cin} onChange={setField('cin')} placeholder="00000000" className={inp + ' ps-8'} />
                                        </div>
                                    </FormField>
                                    <FormField label={t('employees.field.cnss')}>
                                        <input value={form.cnss} onChange={setField('cnss')} className={inp} />
                                    </FormField>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 dark:border-gray-800" />

                            {/* Section Poste */}
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-blue-500 mb-3">
                                    {t('employees.section.position')}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <FormField label={t('employees.field.position')}>
                                        <div className="relative">
                                            <Building2 size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input value={form.position} onChange={setField('position')}
                                                   placeholder={t('employees.placeholder.position')} className={inp + ' ps-8'} />
                                        </div>
                                    </FormField>
                                    <FormField label={t('employees.field.department')}>
                                        <div className="relative">
                                            <Building2 size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input value={form.department} onChange={setField('department')}
                                                   placeholder={t('employees.placeholder.department')} className={inp + ' ps-8'} />
                                        </div>
                                    </FormField>
                                    <FormField label={t('employees.field.contractType')}>
                                        <select value={form.contractType} onChange={setField('contractType')} className={inp}>
                                            {CONTRACTS.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </FormField>
                                    <FormField label={t('employees.field.salary')}>
                                        <div className="relative">
                                            <Wallet size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input type="number" min={0} step={0.001} value={form.salary} onChange={setField('salary')}
                                                   className={inp + ' ps-8'} />
                                        </div>
                                    </FormField>
                                    <FormField label={t('employees.field.hireDate')}>
                                        <div className="relative">
                                            <CalendarDays size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input type="date" value={form.hireDate} onChange={setField('hireDate')} className={inp + ' ps-8'} />
                                        </div>
                                    </FormField>
                                    <FormField label={t('employees.field.rib')}>
                                        <input value={form.rib} onChange={setField('rib')} className={inp} />
                                    </FormField>
                                    <div className="sm:col-span-2">
                                        <FormField label={t('common.notes')}>
                      <textarea value={form.notes} onChange={setField('notes')} rows={2}
                                placeholder={t('employees.placeholder.notes')}
                                className={inp + ' resize-none'} />
                                        </FormField>
                                    </div>

                                    {/* isActive toggle */}
                                    <div className="sm:col-span-2">
                                        <div
                                            className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${form.isActive ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700'}`}
                                            onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))}>
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${form.isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                                    {form.isActive ? <UserCheck size={15} className="text-white" /> : <UserX size={15} className="text-white" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                        {form.isActive ? t('employees.active') : t('employees.inactive')}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        {form.isActive ? t('employees.activeHint') : t('employees.inactiveHint')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`w-11 h-6 rounded-full transition-all relative ${form.isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isActive ? 'start-6' : 'start-1'}`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 shrink-0 bg-gray-50/50 dark:bg-gray-900">
                            <button type="button" onClick={closeForm}
                                    className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                {t('common.cancel')}
                            </button>
                            <button type="submit" form="employee-form"
                                    disabled={createMut.isPending || updateMut.isPending}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-500/20">
                                {createMut.isPending || updateMut.isPending
                                    ? t('common.saving')
                                    : editingId ? t('common.edit') : t('employees.create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog {...confirmState} onProceed={proceed} onCancel={cancel} />
        </div>
    );
};

export default EmployeesPage;