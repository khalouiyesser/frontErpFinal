import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { clientsApi, productsApi, quotesApi } from '../../api';
import DataTable from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { useTranslation } from 'react-i18next';
import {
  Plus, Trash2, X, Eye, ChevronRight, ChevronLeft,
  Search, RefreshCw, SlidersHorizontal, LayoutGrid, List,
  FileText, Package, User, Calendar, CheckCircle2,
  Clock, AlertCircle, Ban, Send, ShoppingCart,
  TrendingUp, Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ── Helpers ────────────────────────────────────────────────────────────────────
const formatTND   = (v: number) => `${(v || 0).toFixed(3)} TND`;
const PAGE_SIZES  = [10, 25, 50, 100];

// ── SearchBar ──────────────────────────────────────────────────────────────────
const SearchBar: React.FC<{
  value: string; onChange: (v: string) => void; placeholder?: string;
}> = ({ value, onChange, placeholder }) => (
    <div className="relative flex-1 min-w-0">
      <Search size={15} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
          type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full ps-10 pe-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                bg-white dark:bg-gray-800/60 text-sm text-gray-900 dark:text-white
                placeholder:text-gray-400 dark:placeholder:text-gray-500
                focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
      />
      {value && (
          <button onClick={() => onChange('')} className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={13} />
          </button>
      )}
    </div>
);

// ── Pagination ─────────────────────────────────────────────────────────────────
const Pagination: React.FC<{
  page: number; totalPages: number; pageSize: number; total: number;
  onPage: (p: number) => void; onPageSize: (s: number) => void;
}> = ({ page, totalPages, pageSize, total, onPage, onPageSize }) => {
  const { t } = useTranslation();
  if (total === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
  else {
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
          {pages.map((p, i) => p === '...' ? (
              <span key={`d${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
          ) : (
              <button key={p} onClick={() => onPage(p as number)}
                      className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all ${page === p ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                {p}
              </button>
          ))}
          <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:cursor-not-allowed">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
  );
};

// ── EmptyState ─────────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ hasFilters: boolean; onCreate: () => void }> = ({ hasFilters, onCreate }) => {
  const { t } = useTranslation();
  return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          {hasFilters ? <Search size={28} className="text-gray-400" /> : <FileText size={28} className="text-gray-400" />}
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
          {hasFilters ? t('clients.noResults') : t('quotes.title')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-5">
          {hasFilters ? t('clients.noResultsDesc') : t('clients.noClientsDesc')}
        </p>
        {!hasFilters && (
            <button onClick={onCreate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-500/20">
              <Plus size={15} /> {t('quotes.new')}
            </button>
        )}
      </div>
  );
};

// ── SkeletonCard ───────────────────────────────────────────────────────────────
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
        {[1,2,3,4].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg" />)}
      </div>
      <div className="h-9 bg-gray-100 dark:bg-gray-800 rounded-xl" />
    </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
const QuotesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate    = useNavigate();
  const { state: confirmState, confirm, proceed, cancel } = useConfirmDialog();
  const { t, i18n } = useTranslation();
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';

  // ── UI State ───────────────────────────────────────────────────────────────
  const [viewMode,      setViewMode]      = useState<'table' | 'cards'>('table');
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState<'all' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'>('all');
  const [page,          setPage]          = useState(1);
  const [pageSize,      setPageSize]      = useState(25);

  // ── Modal State ────────────────────────────────────────────────────────────
  const [showForm,    setShowForm]    = useState(false);
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [detailQuote, setDetailQuote] = useState<any>(null);

  const emptyItem = () => ({ productId: '', productName: '', quantity: 1, unitPrice: 0, tva: 19 });
  const defaultForm = { clientId: '', items: [emptyItem()], validUntil: '', notes: '' };
  const [form, setForm] = useState(defaultForm);

  // ── Status config ──────────────────────────────────────────────────────────
  const statusConfig: Record<string, { label: string; cls: string; border: string; icon: React.ReactNode }> = {
    draft:    { label: t('quotes.status.draft'),    cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',             border: 'border-gray-200 dark:border-gray-700',      icon: <FileText size={10} />    },
    sent:     { label: t('quotes.status.sent'),     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',          border: 'border-blue-200 dark:border-blue-800',      icon: <Send size={10} />        },
    accepted: { label: t('quotes.status.accepted'), cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', icon: <CheckCircle2 size={10} /> },
    rejected: { label: t('quotes.status.rejected'), cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',              border: 'border-red-200 dark:border-red-800',        icon: <Ban size={10} />         },
    expired:  { label: t('quotes.status.expired'),  cls: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',  border: 'border-orange-200 dark:border-orange-800',  icon: <AlertCircle size={10} /> },
  };

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: quotes = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['quotes'],
    queryFn:  () => quotesApi.getAll(),
  });
  const { data: clients  = [] } = useQuery({ queryKey: ['clients'],  queryFn: () => clientsApi.getAll()  });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => productsApi.getAll() });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: quotesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(t('clients.created'));
      setShowForm(false); setForm(defaultForm); setEditingId(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || t('error.generic')),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => quotesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(t('clients.updated'));
      setShowForm(false); setForm(defaultForm); setEditingId(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || t('error.generic')),
  });

  const deleteMut = useMutation({
    mutationFn: quotesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(t('clients.deleted'));
    },
  });

  const convertMut = useMutation({
    mutationFn: (id: string) => quotesApi.convertToSale(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('quotes.convertToSale'));
      setDetailQuote(null);
      navigate('/sales');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || t('error.generic')),
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => quotesApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(t('clients.updated'));
    },
    onError: () => toast.error(t('error.generic')),
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleEdit = useCallback((q: any) => {
    setEditingId(q._id);
    setForm({
      clientId:   q.clientId?._id || q.clientId || '',
      items:      q.items?.map((i: any) => ({
        productId:   i.productId?._id || i.productId || '',
        productName: i.productName || '',
        quantity:    i.quantity || 1,
        unitPrice:   i.unitPrice || 0,
        tva:         i.tva ?? 19,
      })) || [emptyItem()],
      validUntil: q.validUntil ? q.validUntil.split('T')[0] : '',
      notes:      q.notes || '',
    });
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((q: any) => {
    confirm(
        { title: `${t('clients.deleteTitle')} "${q.clientName || q.number}"`, message: `${t('clients.deleteMessage')} ${t('quotes.number')} ${q.number}. ${t('common.action_irreversible')}`, dangerMessage: t('clients.deleteIrreversible'), confirmLabel: t('common.delete') },
        () => deleteMut.mutate(q._id),
    );
  }, [confirm, deleteMut, t]);

  const handleConvert = useCallback((q: any) => {
    confirm(
        { title: t('quotes.convertToSale'), message: `${t('quotes.convertToSale')} "${q.clientName}" ?`, confirmLabel: t('quotes.convertToSale') },
        () => convertMut.mutate(q._id),
    );
  }, [confirm, convertMut, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) updateMut.mutate({ id: editingId, data: form });
    else           createMut.mutate(form as any);
  };

  const selectProduct = (i: number, productId: string) => {
    const p = (products as any[]).find((x: any) => x._id === productId);
    setForm(f => ({
      ...f,
      items: f.items.map((item, idx) =>
          idx === i ? { ...item, productId: p?._id || '', productName: p?.name || '', unitPrice: p?.salePrice || 0, tva: p?.tva ?? 19 } : item,
      ),
    }));
  };

  const totalHT  = form.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const totalTTC = form.items.reduce((s, i) => s + i.quantity * i.unitPrice * (1 + i.tva / 100), 0);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const allQuotes = quotes as any[];
  const countByStatus = (s: string) => allQuotes.filter(q => q.status === s).length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allQuotes.filter(qt => {
      if (q && !((qt.clientName || '').toLowerCase().includes(q) || (qt.number || '').toLowerCase().includes(q))) return false;
      if (statusFilter !== 'all' && qt.status !== statusFilter) return false;
      return true;
    });
  }, [allQuotes, search, statusFilter]);

  const handleSearch       = useCallback((v: string) => { setSearch(v);       setPage(1); }, []);
  const handleStatusFilter = useCallback((v: any)    => { setStatusFilter(v); setPage(1); }, []);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = !!(search || statusFilter !== 'all');

  // ── CSS helpers ────────────────────────────────────────────────────────────
  const inp      = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all';
  const inpSm    = 'w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';
  const labelCls = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5';

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'clientName', header: t('quotes.client'), sortable: true,
      render: (v: string, row: any) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white text-xs font-bold">{(v || '?').charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{v}</p>
              {row.number && <p className="text-xs text-gray-400">#{row.number}</p>}
            </div>
          </div>
      ),
    },
    {
      key: 'totalTTC', header: t('sales.totalTTC'), sortable: true,
      render: (v: number) => <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{formatTND(v)}</span>,
    },
    {
      key: 'validUntil', header: t('quotes.validUntil'), sortable: true, className: 'hidden md:table-cell',
      render: (v: string) => v
          ? <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"><Calendar size={11} />{format(new Date(v), 'dd/MM/yyyy')}</span>
          : <span className="text-gray-300">—</span>,
    },
    {
      key: 'status', header: t('common.status'),
      render: (v: string) => {
        const cfg = statusConfig[v] || { label: v, cls: 'bg-gray-100 text-gray-500', border: 'border-gray-200', icon: null };
        return (
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border ${cfg.cls} ${cfg.border}`}>
                        {cfg.icon}{cfg.label}
                    </span>
        );
      },
    },
    {
      key: 'createdAt', header: t('common.date'), sortable: true, className: 'hidden lg:table-cell',
      render: (v: string) => v ? <span className="text-xs text-gray-400">{format(new Date(v), 'dd/MM/yyyy')}</span> : <span className="text-gray-300">—</span>,
    },
  ];

  // ── QuoteCard (mobile) ─────────────────────────────────────────────────────
  const QuoteCard: React.FC<{ quote: any }> = ({ quote }) => {
    const cfg = statusConfig[quote.status] || { label: quote.status, cls: 'bg-gray-100 text-gray-500', border: 'border-gray-200', icon: null };
    return (
        <div onClick={() => setDetailQuote(quote)}
             className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden">
          <div className={`h-1 w-full ${
              quote.status === 'accepted' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                  quote.status === 'rejected' ? 'bg-gradient-to-r from-red-400 to-red-500' :
                      quote.status === 'sent'     ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                          quote.status === 'expired'  ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                              'bg-gradient-to-r from-gray-300 to-gray-400'
          }`} />
          <div className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-white text-base font-bold">{(quote.clientName || '?').charAt(0).toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate">{quote.clientName}</p>
                  {quote.number && <p className="text-xs text-gray-400 mt-0.5">#{quote.number}</p>}
                </div>
              </div>
              <span className={`shrink-0 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold border ${cfg.cls} ${cfg.border}`}>
                            {cfg.icon}{cfg.label}
                        </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-2.5 py-1.5">
                <p className="text-xs text-gray-400 mb-0.5">{t('sales.totalTTC')}</p>
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{formatTND(quote.totalTTC)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-2.5 py-1.5">
                <p className="text-xs text-gray-400 mb-0.5">{t('quotes.validUntil')}</p>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {quote.validUntil ? format(new Date(quote.validUntil), 'dd/MM/yyyy') : '—'}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-2.5 py-1.5">
                <p className="text-xs text-gray-400 mb-0.5">{t('common.date')}</p>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {quote.createdAt ? format(new Date(quote.createdAt), 'dd/MM/yyyy') : '—'}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-2.5 py-1.5">
                <p className="text-xs text-gray-400 mb-0.5">{t('products.title')}</p>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{quote.items?.length || 0} art.</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button onClick={e => { e.stopPropagation(); setDetailQuote(quote); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700">
                <Eye size={12} /> {t('common.view')}
              </button>
              {quote.status === 'accepted' && (
                  <button onClick={e => { e.stopPropagation(); handleConvert(quote); }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-colors border border-emerald-200 dark:border-emerald-800">
                    <ShoppingCart size={12} /> {t('quotes.convertToSale')}
                  </button>
              )}
              <button onClick={e => { e.stopPropagation(); handleEdit(quote); }}
                      className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors border border-blue-200 dark:border-blue-800">
                <Pencil size={13} />
              </button>
              <button onClick={e => { e.stopPropagation(); handleDelete(quote); }}
                      className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 transition-colors border border-red-200 dark:border-red-800">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
      <div className="space-y-4 sm:space-y-5" dir={dir}>

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('quotes.title')}</h1>
            <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm mt-0.5">
              {filtered.length !== allQuotes.length
                  ? <><span className="text-blue-500 font-semibold">{filtered.length}</span> / {allQuotes.length} {t('quotes.title').toLowerCase()}</>
                  : <>{allQuotes.length} {t('quotes.title').toLowerCase()}</>}
              {countByStatus('accepted') > 0 && !hasFilters && (
                  <span className="text-emerald-500 ms-1.5">· {countByStatus('accepted')} {t('quotes.status.accepted').toLowerCase()}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button onClick={() => refetch()} disabled={isRefetching}
                    className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    title={t('clients.refresh')}>
              <RefreshCw size={15} className={isRefetching ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => { setEditingId(null); setForm(defaultForm); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-500/20">
              <Plus size={16} /> {t('quotes.new')}
            </button>
          </div>
        </div>

        {/* ── Stat chips ── */}
        {allQuotes.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all',      label: `${t('clients.all')} (${allQuotes.length})`,                                   cls: statusFilter === 'all'      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'           : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
                { key: 'draft',    label: `${t('quotes.status.draft')} (${countByStatus('draft')})`,                     cls: statusFilter === 'draft'    ? 'bg-gray-600 text-white border-gray-600 shadow-sm'           : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
                { key: 'sent',     label: `${t('quotes.status.sent')} (${countByStatus('sent')})`,                       cls: statusFilter === 'sent'     ? 'bg-blue-600 text-white border-blue-600 shadow-sm'           : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
                { key: 'accepted', label: `${t('quotes.status.accepted')} (${countByStatus('accepted')})`,               cls: statusFilter === 'accepted' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'     : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
                { key: 'rejected', label: `${t('quotes.status.rejected')} (${countByStatus('rejected')})`,               cls: statusFilter === 'rejected' ? 'bg-red-600 text-white border-red-600 shadow-sm'             : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' },
                { key: 'expired',  label: `${t('quotes.status.expired')} (${countByStatus('expired')})`,                 cls: statusFilter === 'expired'  ? 'bg-orange-500 text-white border-orange-500 shadow-sm'       : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
              ].filter(chip => chip.key === 'all' || countByStatus(chip.key) > 0).map(chip => (
                  <button key={chip.key} onClick={() => handleStatusFilter(chip.key)}
                          className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${chip.cls}`}>
                    {chip.label}
                  </button>
              ))}
            </div>
        )}

        {/* ── Toolbar ── */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <SearchBar value={search} onChange={handleSearch} placeholder={`${t('common.search')} ${t('quotes.title').toLowerCase()}…`} />
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-0.5 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`} title={t('clients.tableView')}><List size={15} /></button>
              <button onClick={() => setViewMode('cards')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`} title={t('clients.cardView')}><LayoutGrid size={15} /></button>
            </div>
          </div>
        </div>

        {/* ── Active filters ── */}
        {hasFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><SlidersHorizontal size={12} /> {t('clients.filtersActive')}</span>
              {search && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
                            "{search}" <button onClick={() => handleSearch('')}><X size={11} /></button>
                        </span>
              )}
              {statusFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
                            {statusConfig[statusFilter]?.label} <button onClick={() => handleStatusFilter('all')}><X size={11} /></button>
                        </span>
              )}
              <button onClick={() => { handleSearch(''); handleStatusFilter('all'); }} className="text-xs text-red-500 hover:text-red-600 font-medium underline">{t('clients.clearAll')}</button>
            </div>
        )}

        {/* ── Content ── */}
        {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
        ) : filtered.length === 0 ? (
            <EmptyState hasFilters={hasFilters} onCreate={() => { setEditingId(null); setForm(defaultForm); setShowForm(true); }} />
        ) : (
            <>
              {/* Cards */}
              <div className={`${viewMode === 'cards' ? 'block' : 'block sm:hidden'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {paginated.map(q => <QuoteCard key={q._id} quote={q} />)}
                </div>
              </div>

              {/* Table */}
              {viewMode === 'table' && (
                  <div className="hidden sm:block">
                    <DataTable
                        data={paginated} columns={columns} searchable={false} searchKeys={[]}
                        isLoading={false} emptyMessage={t('common.noData')} onRowClick={setDetailQuote}
                        actions={row => (
                            <div className="flex items-center justify-end gap-0.5">
                              <button onClick={e => { e.stopPropagation(); setDetailQuote(row); }} className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title={t('common.view')}><Eye size={14} /></button>
                              {row.status === 'accepted' && (
                                  <button onClick={e => { e.stopPropagation(); handleConvert(row); }} className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title={t('quotes.convertToSale')}><ShoppingCart size={14} /></button>
                              )}
                              <button onClick={e => { e.stopPropagation(); handleEdit(row); }} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title={t('common.edit')}><Pencil size={14} /></button>
                              <button onClick={e => { e.stopPropagation(); handleDelete(row); }} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title={t('common.delete')}><Trash2 size={14} /></button>
                              <ChevronRight size={12} className="text-gray-300 dark:text-gray-600 ms-0.5" />
                            </div>
                        )}
                    />
                  </div>
              )}
              <Pagination page={page} totalPages={totalPages} pageSize={pageSize} total={filtered.length} onPage={setPage} onPageSize={setPageSize} />
            </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            ── MODAL : Nouveau / Modifier devis ──
            ══════════════════════════════════════════════════════════════════ */}
        {showForm && (
            <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center" dir={dir}>
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
              <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl mx-0 sm:mx-4 max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
                <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
                <div className="px-5 sm:px-6 pt-3 sm:pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/30">
                      <FileText size={16} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-white">{editingId ? t('common.edit') : t('quotes.new')}</h2>
                      <p className="text-xs text-gray-400 mt-0.5">{editingId ? t('clients.editSubtitle') : t('clients.newSubtitle')}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">

                    {/* Client + Date validité */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className={labelCls}>{t('quotes.client')} <span className="text-red-400 normal-case font-normal">*</span></label>
                        <select required value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))} className={inp}>
                          <option value="">{t('common.search')}</option>
                          {(clients as any[]).map((c: any) => <option key={c._id} value={c._id}>{c.name} — {c.phone}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{t('quotes.validUntil')}</label>
                        <div className="relative">
                          <Calendar size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} className={inp + ' ps-8'} />
                        </div>
                      </div>
                    </div>

                    {/* Lignes produits */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={labelCls + ' mb-0'}>{t('products.title')} <span className="text-red-400 normal-case font-normal">*</span></label>
                        <button type="button" onClick={() => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }))}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                          <Plus size={11} /> {t('common.add')}
                        </button>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                        <table className="w-full text-xs">
                          <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            <th className="text-start px-3 py-2">{t('products.title')}</th>
                            <th className="px-2 py-2 w-16 text-end">{t('sales.quantity')}</th>
                            <th className="px-2 py-2 w-24 text-end">{t('sales.unitPrice')}</th>
                            <th className="px-2 py-2 w-16 text-end">{t('products.tva')}</th>
                            <th className="px-3 py-2 w-24 text-end">{t('common.total')}</th>
                            <th className="w-8" />
                          </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                          {form.items.map((item, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2">
                                  <select value={item.productId} onChange={e => selectProduct(i, e.target.value)}
                                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none text-xs min-w-[120px]">
                                    <option value="">— {t('common.search')} —</option>
                                    {(products as any[]).map((p: any) => <option key={p._id} value={p._id}>{p.name}</option>)}
                                  </select>
                                </td>
                                <td className="px-2 py-2">
                                  <input type="number" min={1} value={item.quantity}
                                         onChange={e => setForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, quantity: +e.target.value } : x) }))}
                                         className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-end text-gray-900 dark:text-white focus:outline-none" />
                                </td>
                                <td className="px-2 py-2">
                                  <input type="number" min={0} step={0.001} value={item.unitPrice}
                                         onChange={e => setForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, unitPrice: +e.target.value } : x) }))}
                                         className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-end text-gray-900 dark:text-white focus:outline-none" />
                                </td>
                                <td className="px-2 py-2">
                                  <input type="number" min={0} value={item.tva}
                                         onChange={e => setForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, tva: +e.target.value } : x) }))}
                                         className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-end text-gray-900 dark:text-white focus:outline-none" />
                                </td>
                                <td className="px-3 py-2 text-end font-medium text-gray-700 dark:text-gray-300">
                                  {(item.quantity * item.unitPrice * (1 + item.tva / 100)).toFixed(3)}
                                </td>
                                <td className="pe-2 py-2">
                                  {form.items.length > 1 && (
                                      <button type="button" onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))}
                                              className="text-red-400 hover:text-red-600 p-1 rounded"><X size={12} /></button>
                                  )}
                                </td>
                              </tr>
                          ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Totaux */}
                      <div className="mt-3 flex justify-end gap-4 sm:gap-6 text-xs text-gray-500 dark:text-gray-400 px-1 flex-wrap">
                        <span>{t('sales.totalHT')} : <strong className="text-gray-900 dark:text-white">{formatTND(totalHT)}</strong></span>
                        <span>{t('accounting.tva')} : <strong className="text-gray-900 dark:text-white">{formatTND(totalTTC - totalHT)}</strong></span>
                        <span className="text-sm">{t('sales.totalTTC')} : <strong className="text-blue-600 dark:text-blue-400 text-base">{formatTND(totalTTC)}</strong></span>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className={labelCls}>{t('common.notes')}</label>
                      <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                rows={2} placeholder={t('clients.notesPlaceholder')}
                                className={inp + ' resize-none'} />
                    </div>
                  </div>

                  <div className="px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 shrink-0 bg-gray-50/50 dark:bg-gray-900">
                    <button type="button" onClick={() => setShowForm(false)}
                            className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      {t('common.cancel')}
                    </button>
                    <button type="submit" disabled={createMut.isPending || updateMut.isPending || !form.clientId || form.items.every(i => !i.productId)}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-500/20">
                      {createMut.isPending || updateMut.isPending ? t('common.saving') : editingId ? t('common.edit') : t('common.create')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            ── DRAWER : Détail devis ──
            ══════════════════════════════════════════════════════════════════ */}
        {detailQuote && (
            <div className="fixed inset-0 z-40 flex items-end sm:justify-end" dir={dir}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetailQuote(null)} />
              <div className="relative w-full sm:w-auto sm:max-w-lg sm:h-full bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto rounded-t-2xl sm:rounded-none max-h-[92vh] sm:max-h-full">
                <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-3 sm:hidden" />

                {/* Header drawer */}
                <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between mt-1 sm:mt-0">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{detailQuote.clientName}</h2>
                      {(() => { const cfg = statusConfig[detailQuote.status]; return cfg ? <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${cfg.cls} ${cfg.border}`}>{cfg.icon} {cfg.label}</span> : null; })()}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {detailQuote.number && `#${detailQuote.number} · `}
                      {detailQuote.createdAt ? format(new Date(detailQuote.createdAt), 'dd/MM/yyyy HH:mm') : '—'}
                    </p>
                  </div>
                  <button onClick={() => setDetailQuote(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"><X size={18} /></button>
                </div>

                <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">

                  {/* KPI */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {[
                      { label: t('sales.totalHT'),  value: formatTND(detailQuote.totalHT  || 0), cls: 'text-gray-700 dark:text-gray-300' },
                      { label: t('sales.totalTTC'), value: formatTND(detailQuote.totalTTC || 0), cls: 'text-blue-600 dark:text-blue-400'  },
                    ].map(({ label, value, cls }) => (
                        <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5 sm:p-3 text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                          <p className={`text-sm font-bold ${cls}`}>{value}</p>
                        </div>
                    ))}
                  </div>

                  {/* Validité */}
                  {detailQuote.validUntil && (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
                        <Calendar size={14} className="text-blue-500 shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                        {t('quotes.validUntil')} : <strong>{format(new Date(detailQuote.validUntil), 'dd/MM/yyyy')}</strong>
                                    </span>
                      </div>
                  )}

                  {/* Changer statut */}
                  <div>
                    <p className={labelCls}>{t('common.status')}</p>
                    <div className="flex flex-wrap gap-2">
                      {(['draft', 'sent', 'accepted', 'rejected', 'expired'] as const).map(s => {
                        const cfg = statusConfig[s];
                        return (
                            <button key={s}
                                    onClick={() => { updateStatusMut.mutate({ id: detailQuote._id, status: s }); setDetailQuote((q: any) => ({ ...q, status: s })); }}
                                    disabled={detailQuote.status === s || updateStatusMut.isPending}
                                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                        detailQuote.status === s ? cfg.cls + ' ' + cfg.border + ' ring-2 ring-offset-1 ring-current' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                    }`}>
                              {cfg.icon}{cfg.label}
                            </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Articles */}
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <Package size={14} className="text-gray-400" /> {t('products.title')} ({(detailQuote.items || []).length})
                    </h3>
                    <div className="space-y-2">
                      {(detailQuote.items || []).map((item: any, i: number) => (
                          <div key={i} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.productName}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {item.quantity} × {formatTND(item.unitPrice)}{item.tva > 0 && ` · TVA ${item.tva}%`}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-gray-900 dark:text-white ms-3 shrink-0">
                                                {formatTND(item.quantity * item.unitPrice * (1 + item.tva / 100))}
                                            </span>
                          </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  {detailQuote.notes && (
                      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl p-3">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 uppercase tracking-wide">{t('common.notes')}</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{detailQuote.notes}</p>
                      </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-2">
                    {detailQuote.status === 'accepted' && (
                        <button onClick={() => handleConvert(detailQuote)}
                                disabled={convertMut.isPending}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-emerald-500/20 active:scale-95">
                          <ShoppingCart size={16} /> {t('quotes.convertToSale')}
                        </button>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => { setDetailQuote(null); handleEdit(detailQuote); }}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 rounded-xl text-sm font-semibold transition-colors">
                        <Pencil size={14} /> {t('common.edit')}
                      </button>
                      <button onClick={() => { handleDelete(detailQuote); setDetailQuote(null); }}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 rounded-xl text-sm font-semibold transition-colors">
                        <Trash2 size={14} /> {t('common.delete')}
                      </button>
                    </div>
                    <button onClick={() => setDetailQuote(null)}
                            className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                      {t('common.close')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
        )}

        <ConfirmDialog {...confirmState} onProceed={proceed} onCancel={cancel} confirmLabel={t('common.delete')} />
      </div>
  );
};

export default QuotesPage;