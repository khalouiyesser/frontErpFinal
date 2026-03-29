import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { clientsApi } from '../../api';
import DataTable from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import {
  Plus, Pencil, Trash2, Eye, UserCheck, UserX, X, Phone,
  User, Mail, MapPin, CreditCard, FileText, Building2,
  ChevronRight, Banknote, CheckCircle2, AlertCircle,
  Search, Calendar, ChevronLeft, ChevronDown,
  SlidersHorizontal, LayoutGrid, List, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { useTranslation } from 'react-i18next';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ClientFormData {
  name: string;
  firstName: string;
  phone: string;
  email: string;
  sector: string;
  creditLimit: number;
  isActive: boolean;
  notes: string;
}

interface QuickPaymentForm {
  amount: string;
  note: string;
}

interface DateRange {
  from: string;
  to: string;
}

const defaultForm: ClientFormData = {
  name: '', firstName: '', phone: '+216', email: '',
  sector: '', creditLimit: 0, isActive: true, notes: '',
};

const defaultPayment: QuickPaymentForm = { amount: '', note: '' };
const defaultDateRange: DateRange = { from: '', to: '' };

const formatTND = (v: number) => `${(v || 0).toFixed(3)} TND`;

const PAGE_SIZES = [10, 25, 50, 100];

// ══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════════════════════════════════════════

// ── SearchBar ────────────────────────────────────────────────────────────────
const SearchBar: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => (
    <div className="relative flex-1 min-w-0">
      <Search size={15} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full ps-10 pe-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800/60 text-sm text-gray-900 dark:text-white
        placeholder:text-gray-400 dark:placeholder:text-gray-500
        focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
      />
      {value && (
          <button
              onClick={() => onChange('')}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={13} />
          </button>
      )}
    </div>
);

// ── DateRangeFilter ───────────────────────────────────────────────────────────
const DateRangeFilter: React.FC<{
  value: DateRange;
  onChange: (v: DateRange) => void;
}> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const hasFilter = value.from || value.to;

  return (
      <div className="relative">
        <button
            onClick={() => setOpen(p => !p)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                hasFilter
                    ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400'
                    : 'bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
        >
          <Calendar size={15} />
          <span className="hidden sm:inline">
          {hasFilter ? `${value.from || '…'} → ${value.to || '…'}` : t('clients.filterByDate')}
        </span>
          <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          {hasFilter && <span className="w-2 h-2 rounded-full bg-blue-500 absolute -top-0.5 -end-0.5" />}
        </button>

        {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute top-full mt-2 end-0 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-4 w-72">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  {t('clients.filterByDateTitle')}
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t('clients.dateFrom')}</label>
                    <input
                        type="date"
                        value={value.from}
                        onChange={e => onChange({ ...value, from: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t('clients.dateTo')}</label>
                    <input
                        type="date"
                        value={value.to}
                        onChange={e => onChange({ ...value, to: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
                {hasFilter && (
                    <button
                        onClick={() => { onChange(defaultDateRange); setOpen(false); }}
                        className="mt-3 w-full px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <X size={12} /> {t('clients.clearFilter')}
                    </button>
                )}
              </div>
            </>
        )}
      </div>
  );
};

// ── Pagination ────────────────────────────────────────────────────────────────
const Pagination: React.FC<{
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize: (s: number) => void;
}> = ({ page, totalPages, pageSize, total, onPage, onPageSize }) => {
  const { t } = useTranslation();
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
          <select
              value={pageSize}
              onChange={e => { onPageSize(+e.target.value); onPage(1); }}
              className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
          >
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s} {t('clients.perPage')}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
              onClick={() => onPage(page - 1)}
              disabled={page === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} />
          </button>

          {pages.map((p, i) =>
              p === '...' ? (
                  <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
              ) : (
                  <button
                      key={p}
                      onClick={() => onPage(p as number)}
                      className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all ${
                          page === p
                              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                              : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                  >
                    {p}
                  </button>
              )
          )}

          <button
              onClick={() => onPage(page + 1)}
              disabled={page === totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:cursor-not-allowed"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
  );
};

// ── ClientCard ────────────────────────────────────────────────────────────────
const ClientCard: React.FC<{
  client: any;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPayment: (e: React.MouseEvent) => void;
}> = ({ client, onView, onEdit, onDelete, onPayment }) => {
  const { t } = useTranslation();
  const credit = client.totalCredit ?? 0;

  return (
      <div
          onClick={onView}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800
        shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden"
      >
        <div className={`h-1 w-full ${client.isActive ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 'bg-gray-200 dark:bg-gray-700'}`} />

        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white text-base font-bold">
                {(client.name || '?').charAt(0).toUpperCase()}
              </span>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate">{client.name}</p>
                {client.firstName && <p className="text-xs text-gray-400 truncate mt-0.5">{client.firstName}</p>}
              </div>
            </div>
            <span className={`shrink-0 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold border ${
                client.isActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                    : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
            }`}>
            {client.isActive ? <UserCheck size={10} /> : <UserX size={10} />}
              {client.isActive ? t('common.active') : t('common.inactive')}
          </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {client.phone && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-2.5 py-1.5">
                  <Phone size={11} className="text-gray-400 shrink-0" />
                  <span className="truncate">{client.phone}</span>
                </div>
            )}
            {client.sector && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-2.5 py-1.5">
                  <Building2 size={11} className="text-gray-400 shrink-0" />
                  <span className="truncate">{client.sector}</span>
                </div>
            )}
            {client.email && (
                <div className="col-span-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-2.5 py-1.5">
                  <Mail size={11} className="text-gray-400 shrink-0" />
                  <span className="truncate">{client.email}</span>
                </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-3">
            <div>
              {credit <= 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                ✓ {t('clients.paid')}
              </span>
              ) : (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-red-50 text-red-500 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                -{formatTND(credit)}
              </span>
              )}
            </div>
            {client.createdAt && (
                <span className="text-xs text-gray-400">
              {format(new Date(client.createdAt), 'dd/MM/yyyy')}
            </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
                onClick={e => { e.stopPropagation(); onView(); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold
              bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300
              hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
            >
              <Eye size={12} /> {t('common.view')}
            </button>
            <button
                onClick={e => { e.stopPropagation(); onPayment(e); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold
              bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400
              hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors border border-emerald-200 dark:border-emerald-800"
            >
              <Banknote size={12} /> {t('clients.quickPayment')}
            </button>
            <button
                onClick={e => { e.stopPropagation(); onEdit(); }}
                className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400
              hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-blue-200 dark:border-blue-800"
            >
              <Pencil size={13} />
            </button>
            <button
                onClick={e => { e.stopPropagation(); onDelete(); }}
                className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400
              hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-800"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
  );
};

// ── EmptyState ────────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ hasFilters: boolean; onCreate: () => void }> = ({ hasFilters, onCreate }) => {
  const { t } = useTranslation();
  return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          {hasFilters ? <Search size={28} className="text-gray-400" /> : <User size={28} className="text-gray-400" />}
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
          {hasFilters ? t('clients.noResults') : t('clients.noClients')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-5">
          {hasFilters ? t('clients.noResultsDesc') : t('clients.noClientsDesc')}
        </p>
        {!hasFilters && (
            <button
                onClick={onCreate}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-500/20"
            >
              <Plus size={15} /> {t('clients.addFirst')}
            </button>
        )}
      </div>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-gray-700 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4" />
          <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="h-7 bg-gray-100 dark:bg-gray-800 rounded-lg" />
        <div className="h-7 bg-gray-100 dark:bg-gray-800 rounded-lg" />
      </div>
      <div className="h-9 bg-gray-100 dark:bg-gray-800 rounded-xl" />
    </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
const ClientsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate    = useNavigate();
  const { state: confirmState, confirm, proceed, cancel } = useConfirmDialog();
  const { t, i18n } = useTranslation();
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';

  // ── UI State ───────────────────────────────────────────────────────────────
  const [viewMode,     setViewMode]     = useState<'table' | 'cards'>('table');
  const [search,       setSearch]       = useState('');
  const [dateRange,    setDateRange]    = useState<DateRange>(defaultDateRange);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page,         setPage]         = useState(1);
  const [pageSize,     setPageSize]     = useState(25);

  // ── Form State ─────────────────────────────────────────────────────────────
  const [showForm,             setShowForm]             = useState(false);
  const [editingId,            setEditingId]            = useState<string | null>(null);
  const [form,                 setForm]                 = useState<ClientFormData>(defaultForm);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  // Payment rapide
  const [paymentTarget,  setPaymentTarget]  = useState<any>(null);
  const [paymentForm,    setPaymentForm]    = useState<QuickPaymentForm>(defaultPayment);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: clients = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['clients'],
    queryFn:  () => clientsApi.getAll(),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(t('clients.created'));
      setShowForm(false);
      setForm(defaultForm);
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) setShowDuplicateWarning(true);
      else {
        const msg = err?.response?.data?.message;
        toast.error(Array.isArray(msg) ? msg[0] : msg || t('error.generic'));
      }
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => clientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(t('clients.updated'));
      setShowForm(false);
      setEditingId(null);
      setForm(defaultForm);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || t('error.generic'));
    },
  });

  const deleteMut = useMutation({
    mutationFn: clientsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(t('clients.deleted'));
    },
  });

  const paymentMut = useMutation({
    mutationFn: ({ clientId, data }: { clientId: string; data: { amount: number; note?: string } }) =>
        clientsApi.addPayment(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client-stats', paymentTarget?._id] });
      setPaymentSuccess(true);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || t('error.generic'));
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleEdit = useCallback((client: any) => {
    setEditingId(client._id);
    setForm({
      name:        client.name        || '',
      firstName:   client.firstName   || '',
      phone:       client.phone       || '+216',
      email:       client.email       || '',
      sector:      client.sector      || '',
      creditLimit: client.creditLimit || 0,
      isActive:    client.isActive    ?? true,
      notes:       client.notes       || '',
    });
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((client: any) => {
    confirm(
        {
          title:         `${t('clients.deleteTitle')} "${client.name}"`,
          message:       `${t('clients.deleteMessage')} "${client.name}". ${t('common.action_irreversible')}`,
          dangerMessage: t('clients.deleteIrreversible'),
          confirmLabel:  t('common.delete'),
        },
        () => deleteMut.mutate(client._id),
    );
  }, [confirm, deleteMut, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...form };
    if (!payload.firstName) delete payload.firstName;
    if (!payload.email)     delete payload.email;
    if (!payload.sector)    delete payload.sector;
    if (!payload.notes)     delete payload.notes;
    if (editingId) updateMut.mutate({ id: editingId, data: payload });
    else           createMut.mutate(payload);
  };

  const openPayment = useCallback((client: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setPaymentTarget(client);
    setPaymentForm(defaultPayment);
    setPaymentSuccess(false);
    paymentMut.reset();
  }, [paymentMut]);

  const closePayment = useCallback(() => {
    setPaymentTarget(null);
    setPaymentForm(defaultPayment);
    setPaymentSuccess(false);
    paymentMut.reset();
  }, [paymentMut]);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) { toast.error(t('clients.invalidAmount')); return; }
    paymentMut.mutate({
      clientId: paymentTarget._id,
      data: { amount, note: paymentForm.note || undefined },
    });
  };

  // ── Filtering & Pagination ─────────────────────────────────────────────────
  const allClients = clients as any[];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allClients.filter(c => {
      if (q) {
        const match =
            (c.name        || '').toLowerCase().includes(q) ||
            (c.firstName   || '').toLowerCase().includes(q) ||
            (c.phone       || '').toLowerCase().includes(q) ||
            (c.email       || '').toLowerCase().includes(q) ||
            (c.sector      || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      if (statusFilter === 'active'   && !c.isActive)  return false;
      if (statusFilter === 'inactive' &&  c.isActive)  return false;
      if (dateRange.from || dateRange.to) {
        if (!c.createdAt) return false;
        const date = parseISO(c.createdAt);
        if (dateRange.from && date < startOfDay(parseISO(dateRange.from))) return false;
        if (dateRange.to   && date > endOfDay(parseISO(dateRange.to)))     return false;
      }
      return true;
    });
  }, [allClients, search, statusFilter, dateRange]);

  const handleSearch    = useCallback((v: string)    => { setSearch(v);       setPage(1); }, []);
  const handleDateRange = useCallback((v: DateRange) => { setDateRange(v);    setPage(1); }, []);
  const handleStatus    = useCallback((v: any)       => { setStatusFilter(v); setPage(1); }, []);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated   = filtered.slice((page - 1) * pageSize, page * pageSize);

  const hasFilters    = !!(search || dateRange.from || dateRange.to || statusFilter !== 'all');
  const activeCount   = allClients.filter(c =>  c.isActive).length;
  const inactiveCount = allClients.filter(c => !c.isActive).length;
  const withCredit    = allClients.filter(c =>  c.creditLimit > 0).length;

  // ── CSS helpers ────────────────────────────────────────────────────────────
  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-150';
  const labelCls = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5';

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'name', header: t('common.name'), sortable: true,
      render: (v: string, row: any) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white text-xs font-bold">{(v || '?').charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{v}</p>
              {row.firstName && <p className="text-xs text-gray-400 truncate">{row.firstName}</p>}
            </div>
          </div>
      ),
    },
    {
      key: 'phone', header: t('common.phone'), sortable: true, className: 'hidden sm:table-cell',
      render: (v: string) => (
          <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
          <Phone size={12} className="text-gray-400" />{v}
        </span>
      ),
    },
    {
      key: 'email', header: t('common.email'), sortable: true, className: 'hidden md:table-cell',
      render: (v: string) => v
          ? <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300"><Mail size={12} className="text-gray-400" />{v}</span>
          : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>,
    },
    {
      key: 'sector', header: t('clients.sector'), sortable: true, className: 'hidden lg:table-cell',
      render: (v: string) => v
          ? <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"><Building2 size={10} />{v}</span>
          : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>,
    },
    {
      key: 'totalCredit', header: t('clients.balance'), className: 'hidden sm:table-cell',
      render: (_: any, row: any) => {
        const credit = row.totalCredit ?? 0;
        if (credit <= 0) return (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
            ✓ {t('clients.paid')}
          </span>
        );
        return (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-red-50 text-red-500 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            -{formatTND(credit)}
          </span>
        );
      },
    },
    {
      key: 'isActive', header: t('common.status'),
      render: (val: boolean) => (
          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border ${
              val
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                  : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
          }`}>
          {val ? <UserCheck size={11} /> : <UserX size={11} />}
            {val ? t('common.active') : t('common.inactive')}
        </span>
      ),
    },
    {
      key: 'createdAt', header: t('common.date'), sortable: true, className: 'hidden lg:table-cell',
      render: (v: string) => v
          ? <span className="text-xs text-gray-400">{format(new Date(v), 'dd/MM/yyyy')}</span>
          : <span className="text-gray-300">—</span>,
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
      <div className="space-y-4 sm:space-y-5" dir={dir}>

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {t('clients.title')}
            </h1>
            <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm mt-0.5">
              {filtered.length !== allClients.length
                  ? <><span className="text-blue-500 font-semibold">{filtered.length}</span> / {allClients.length} {t('nav.clients').toLowerCase()}</>
                  : <>{allClients.length} {t('nav.clients').toLowerCase()}</>}
              {activeCount > 0 && !hasFilters && (
                  <span className="text-emerald-500 ms-1.5">· {activeCount} {t('clients.activeClients')}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                title={t('clients.refresh')}
            >
              <RefreshCw size={15} className={isRefetching ? 'animate-spin' : ''} />
            </button>
            <button
                onClick={() => { setEditingId(null); setForm(defaultForm); setShowForm(true); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-500/20"
            >
              <Plus size={16} /> {t('clients.new')}
            </button>
          </div>
        </div>

        {/* ── Stat chips ── */}
        {allClients.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                  onClick={() => handleStatus('all')}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${
                      statusFilter === 'all'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
              >
                {t('clients.all')} ({allClients.length})
              </button>
              <button
                  onClick={() => handleStatus('active')}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${
                      statusFilter === 'active'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  }`}
              >
                <UserCheck size={11} /> {activeCount} {t('clients.activeClients')}
              </button>
              {inactiveCount > 0 && (
                  <button
                      onClick={() => handleStatus('inactive')}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${
                          statusFilter === 'inactive'
                              ? 'bg-gray-600 text-white border-gray-600 shadow-sm'
                              : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                      }`}
                  >
                    <UserX size={11} /> {inactiveCount} {t('clients.inactiveClients')}
                  </button>
              )}
              {withCredit > 0 && (
                  <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-medium">
                    <CreditCard size={11} /> {withCredit} {t('clients.withCredit')}
                  </div>
              )}
            </div>
        )}

        {/* ── Toolbar ── */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <SearchBar
              value={search}
              onChange={handleSearch}
              placeholder={t('clients.searchPlaceholder')}
          />
          <div className="flex items-center gap-2 shrink-0">
            <DateRangeFilter value={dateRange} onChange={handleDateRange} />
            <div className="hidden sm:flex items-center gap-0.5 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                  title={t('clients.tableView')}
              >
                <List size={15} />
              </button>
              <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                  title={t('clients.cardView')}
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Active filters indicator ── */}
        {hasFilters && (
            <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <SlidersHorizontal size={12} /> {t('clients.filtersActive')}
          </span>
              {search && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
              "{search}" <button onClick={() => handleSearch('')}><X size={11} /></button>
            </span>
              )}
              {statusFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
              {statusFilter === 'active' ? t('common.active') : t('common.inactive')}
                    <button onClick={() => handleStatus('all')}><X size={11} /></button>
            </span>
              )}
              {(dateRange.from || dateRange.to) && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
              <Calendar size={10} /> {dateRange.from || '…'} → {dateRange.to || '…'}
                    <button onClick={() => handleDateRange(defaultDateRange)}><X size={11} /></button>
            </span>
              )}
              <button
                  onClick={() => { handleSearch(''); handleStatus('all'); handleDateRange(defaultDateRange); }}
                  className="text-xs text-red-500 hover:text-red-600 font-medium underline"
              >
                {t('clients.clearAll')}
              </button>
            </div>
        )}

        {/* ── Content ── */}
        {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
        ) : filtered.length === 0 ? (
            <EmptyState
                hasFilters={hasFilters}
                onCreate={() => { setEditingId(null); setForm(defaultForm); setShowForm(true); }}
            />
        ) : (
            <>
              {/* Cards */}
              <div className={`${viewMode === 'cards' ? 'block' : 'block sm:hidden'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {paginated.map(client => (
                      <ClientCard
                          key={client._id}
                          client={client}
                          onView={() => navigate(`/clients/${client._id}`)}
                          onEdit={() => handleEdit(client)}
                          onDelete={() => handleDelete(client)}
                          onPayment={(e) => openPayment(client, e)}
                      />
                  ))}
                </div>
              </div>

              {/* Table */}
              {viewMode === 'table' && (
                  <div className="hidden sm:block">
                    <DataTable
                        data={paginated}
                        columns={columns}
                        searchKeys={[]}
                        isLoading={false}
                        emptyMessage={t('common.noData')}
                        onRowClick={(row) => navigate(`/clients/${row._id}`)}
                        actions={(row) => (
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                  onClick={(e) => { e.stopPropagation(); navigate(`/clients/${row._id}`); }}
                                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                  title={t('common.view')}
                              ><Eye size={14} /></button>
                              <button
                                  onClick={(e) => openPayment(row, e)}
                                  className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                  title={t('clients.quickPayment')}
                              ><Banknote size={14} /></button>
                              <button
                                  onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
                                  className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                  title={t('common.edit')}
                              ><Pencil size={14} /></button>
                              <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title={t('common.delete')}
                              ><Trash2 size={14} /></button>
                              <ChevronRight size={12} className="text-gray-300 dark:text-gray-600 ms-0.5" />
                            </div>
                        )}
                    />
                  </div>
              )}

              <Pagination
                  page={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  total={filtered.length}
                  onPage={setPage}
                  onPageSize={setPageSize}
              />
            </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
        ── Quick Payment Modal ──
      ══════════════════════════════════════════════════════════════════ */}
        {paymentTarget && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir={dir}>
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closePayment} />
              <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md mx-0 sm:mx-4 overflow-hidden">
                <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
                <div className="px-5 pt-4 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/30">
                      <Banknote size={18} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t('clients.quickPayment')}</h2>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <User size={10} />
                        {paymentTarget.name}{paymentTarget.firstName ? ` ${paymentTarget.firstName}` : ''}
                      </p>
                    </div>
                  </div>
                  <button onClick={closePayment} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400">
                    <X size={16} />
                  </button>
                </div>
                <div className="p-5">
                  {paymentSuccess ? (
                      <div className="text-center py-4">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 size={32} className="text-emerald-500" />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1">{t('clients.paymentSuccess')}</h3>
                        <p className="text-sm text-gray-400 mb-1">
                          <span className="font-semibold text-emerald-600">+{formatTND(parseFloat(paymentForm.amount))}</span>
                          {' '}{t('clients.paymentFor')} {paymentTarget.name}
                        </p>
                        {paymentForm.note && <p className="text-xs text-gray-400 italic mb-4">« {paymentForm.note} »</p>}
                        <div className="flex gap-2 mt-5">
                          <button
                              onClick={() => { setPaymentSuccess(false); setPaymentForm(defaultPayment); paymentMut.reset(); }}
                              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >{t('clients.newPayment')}</button>
                          <button
                              onClick={closePayment}
                              className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
                          >{t('common.close')}</button>
                        </div>
                      </div>
                  ) : (
                      <form onSubmit={handlePaymentSubmit} className="space-y-4">
                        {paymentTarget.creditUsed > 0 && (
                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                              <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{t('clients.creditInProgress')}</p>
                                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                                  {t('clients.creditUsed')} <span className="font-bold">{formatTND(paymentTarget.creditUsed)}</span>
                                  {paymentTarget.creditLimit > 0 && ` / ${formatTND(paymentTarget.creditLimit)}`}
                                </p>
                              </div>
                            </div>
                        )}
                        <div>
                          <label className={labelCls}>{t('clients.paymentAmount')} <span className="text-red-400 normal-case font-normal">*</span></label>
                          <div className="relative">
                            <Banknote size={15} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="number" min="0.001" step="0.001"
                                value={paymentForm.amount}
                                onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                                required
                                placeholder={t('clients.paymentAmountPlaceholder')}
                                className="w-full ps-10 pe-16 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-lg font-bold text-gray-900 dark:text-white placeholder:text-gray-300 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                                autoFocus
                            />
                            <span className="absolute end-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">TND</span>
                          </div>
                          {paymentForm.amount && parseFloat(paymentForm.amount) > 0 && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 ms-1 font-medium">✓ {formatTND(parseFloat(paymentForm.amount))}</p>
                          )}
                        </div>
                        <div>
                          <label className={labelCls}>{t('clients.paymentNote')} <span className="text-red-400 normal-case font-normal">*</span></label>
                          <div className="relative">
                            <FileText size={14} className="absolute start-3.5 top-3 text-gray-400" />
                            <textarea
                                value={paymentForm.note}
                                onChange={e => setPaymentForm(f => ({ ...f, note: e.target.value }))}
                                rows={2}
                                placeholder={t('clients.paymentNotePlaceholder')}
                                className="w-full ps-10 py-2.5 pe-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 resize-none transition-all"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button type="button" onClick={closePayment}
                                  className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            {t('common.cancel')}
                          </button>
                          <button type="submit"
                                  disabled={paymentMut.isPending || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0 || !paymentForm.note?.trim()}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 dark:disabled:bg-emerald-900/40 disabled:cursor-not-allowed active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-emerald-500/20">
                            {paymentMut.isPending
                                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('clients.saving')}</>
                                : <><Banknote size={15} />{t('common.save')}</>}
                          </button>
                        </div>
                      </form>
                  )}
                </div>
              </div>
            </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
        ── Client Form Modal ──
      ══════════════════════════════════════════════════════════════════ */}
        {showForm && (
            <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center" dir={dir}>
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
              <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl mx-0 sm:mx-4 max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
                <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
                <div className="px-5 sm:px-6 pt-3 sm:pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/30">
                      <User size={16} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                        {editingId ? t('clients.edit') : t('clients.new')}
                      </h2>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {editingId ? t('clients.editSubtitle') : t('clients.newSubtitle')}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400">
                    <X size={18} />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className={labelCls}>{t('clients.name')} <span className="text-red-400 normal-case font-normal">*</span></label>
                        <div className="relative">
                          <Building2 size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                              value={form.name}
                              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                              required
                              placeholder={t('clients.namePlaceholder')}
                              className={inputCls + ' ps-8'}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>{t('clients.firstName')}</label>
                        <div className="relative">
                          <User size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                              value={form.firstName}
                              onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                              placeholder={t('clients.firstNamePlaceholder')}
                              className={inputCls + ' ps-8'}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className={labelCls}>{t('clients.phone')} <span className="text-red-400 normal-case font-normal">*</span></label>
                        <div className="relative">
                          <Phone size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                              value={form.phone}
                              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                              required
                              pattern="^\+216[0-9]{8}$"
                              placeholder={t('clients.phonePlaceholder')}
                              className={inputCls + ' ps-8'}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1 ms-1">{t('clients.phoneFormat')}</p>
                      </div>
                      <div>
                        <label className={labelCls}>{t('clients.email')}</label>
                        <div className="relative">
                          <Mail size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                              type="email"
                              value={form.email}
                              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                              placeholder={t('clients.emailPlaceholder')}
                              className={inputCls + ' ps-8'}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className={labelCls}>{t('clients.sector')}</label>
                        <div className="relative">
                          <MapPin size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                              value={form.sector}
                              onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
                              placeholder={t('clients.sectorPlaceholder')}
                              className={inputCls + ' ps-8'}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>{t('clients.credit')}</label>
                        <div className="relative">
                          <CreditCard size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                              type="number" min="0" step="any"
                              value={form.creditLimit === 0 ? '' : form.creditLimit}
                              onChange={e => setForm(f => ({ ...f, creditLimit: e.target.value === '' ? 0 : +e.target.value }))}
                              placeholder={t('clients.creditPlaceholder')}
                              className={inputCls + ' ps-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1 ms-1">{t('clients.creditHint')}</p>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>{t('common.notes')}</label>
                      <div className="relative">
                        <FileText size={14} className="absolute start-3 top-3.5 text-gray-400" />
                        <textarea
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            rows={3}
                            placeholder={t('clients.notesPlaceholder')}
                            className={inputCls + ' resize-none ps-8 pt-2.5'}
                        />
                      </div>
                    </div>
                    <div
                        className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${form.isActive ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700'}`}
                        onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${form.isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                          {form.isActive ? <UserCheck size={15} className="text-white" /> : <UserX size={15} className="text-white" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {form.isActive ? t('clients.active') : t('clients.inactive_label')}
                          </p>
                          <p className="text-xs text-gray-400">
                            {form.isActive ? t('clients.activeSubtitle') : t('clients.inactiveSubtitle')}
                          </p>
                        </div>
                      </div>
                      <div className={`w-11 h-6 rounded-full transition-all relative ${form.isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isActive ? 'start-6' : 'start-1'}`} />
                      </div>
                    </div>
                  </div>
                  <div className="px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 shrink-0 bg-gray-50/50 dark:bg-gray-900">
                    <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={createMut.isPending || updateMut.isPending}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-500/20"
                    >
                      {createMut.isPending || updateMut.isPending
                          ? t('common.saving')
                          : editingId ? t('common.edit') : t('common.create')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {/* ── Duplicate Warning ── */}
        {showDuplicateWarning && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Phone size={26} className="text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1.5">{t('clients.duplicatePhone')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t('clients.duplicatePhoneDesc')}</p>
                <button
                    onClick={() => setShowDuplicateWarning(false)}
                    className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  {t('common.confirm')}
                </button>
              </div>
            </div>
        )}

        <ConfirmDialog {...confirmState} onProceed={proceed} onCancel={cancel} confirmLabel={t('common.delete')} />
      </div>
  );
};

export default ClientsPage;