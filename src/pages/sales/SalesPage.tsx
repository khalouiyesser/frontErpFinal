import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi, productsApi, VentesApi } from '@/api';
import DataTable from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog.ts';
import { useTranslation } from 'react-i18next';
import {
  Plus, Trash2, CreditCard, X, Download, Eye,
  FileText, Package, ChevronRight, ChevronLeft,
  Search, RefreshCw, SlidersHorizontal, LayoutGrid,
  List, Banknote, CheckCircle2, Clock, AlertCircle,
  User, TrendingUp, Receipt, Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ── Helpers ────────────────────────────────────────────────────────────────────
const formatTND = (v: number) => `${(v || 0).toFixed(3)} TND`;

const PAYMENT_METHODS = [
  { value: 'cash',     label: 'payment.cash'     },
  { value: 'virement', label: 'payment.virement'  },
  { value: 'cheque',   label: 'payment.cheque'    },
  { value: 'online',   label: 'payment.online'    },
];

const PAGE_SIZES = [10, 25, 50, 100];

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

// ── SaleCard (mobile) ──────────────────────────────────────────────────────────
const SaleCard: React.FC<{
  sale: any;
  statusConfig: Record<string, { label: string; cls: string }>;
  onView: () => void;
  onPayment: (e: React.MouseEvent) => void;
  onDownload: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}> = ({ sale, statusConfig, onView, onPayment, onDownload, onDelete }) => {
  const { t } = useTranslation();
  const cfg = statusConfig[sale.status] || { label: sale.status, cls: 'bg-gray-100 text-gray-500' };

  return (
      <div onClick={onView}
           className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden">
        <div className={`h-1 w-full ${sale.status === 'paid' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : sale.status === 'partial' ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`} />
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-white text-base font-bold">{(sale.clientName || '?').charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate">{sale.clientName}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {sale.createdAt ? format(new Date(sale.createdAt), 'dd/MM/yyyy') : '—'}
                </p>
              </div>
            </div>
            <span className={`shrink-0 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold border ${cfg.cls}`}>
                        {cfg.label}
                    </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-2.5 py-1.5 text-center">
              <p className="text-xs text-gray-400 mb-0.5">{t('sales.totalTTC')}</p>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{formatTND(sale.totalTTC)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-2.5 py-1.5 text-center">
              <p className="text-xs text-gray-400 mb-0.5">{t('sales.amountPaid')}</p>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatTND(sale.amountPaid)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-2.5 py-1.5 text-center">
              <p className="text-xs text-gray-400 mb-0.5">{t('sales.amountRemaining')}</p>
              <p className={`text-xs font-bold ${sale.amountRemaining > 0 ? 'text-red-500' : 'text-gray-400'}`}>{formatTND(sale.amountRemaining)}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button onClick={e => { e.stopPropagation(); onView(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700">
              <Eye size={12} /> {t('common.view')}
            </button>
            {sale.status !== 'paid' && (
                <button onClick={e => { e.stopPropagation(); onPayment(e); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors border border-emerald-200 dark:border-emerald-800">
                  <Banknote size={12} /> {t('sales.addPayment')}
                </button>
            )}
            <button onClick={e => { e.stopPropagation(); onDownload(e); }}
                    className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors border border-indigo-200 dark:border-indigo-800">
              <FileText size={13} />
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(e); }}
                    className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-800">
              <Trash2 size={13} />
            </button>
          </div>
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
          {hasFilters ? <Search size={28} className="text-gray-400" /> : <Receipt size={28} className="text-gray-400" />}
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
          {hasFilters ? t('clients.noResults') : t('clients.noClients')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-5">
          {hasFilters ? t('clients.noResultsDesc') : t('clients.noClientsDesc')}
        </p>
        {!hasFilters && (
            <button onClick={onCreate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-500/20">
              <Plus size={15} /> {t('sales.new')}
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
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg" />)}
      </div>
      <div className="h-9 bg-gray-100 dark:bg-gray-800 rounded-xl" />
    </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
const SalesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { state: confirmState, confirm, proceed, cancel } = useConfirmDialog();
  const { t, i18n } = useTranslation();
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';

  // ── UI State ───────────────────────────────────────────────────────────────
  const [viewMode,      setViewMode]      = useState<'table' | 'cards'>('table');
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState<'all' | 'paid' | 'partial' | 'pending'>('all');
  const [page,          setPage]          = useState(1);
  const [pageSize,      setPageSize]      = useState(25);

  // ── Modal State ────────────────────────────────────────────────────────────
  const [showForm,          setShowForm]          = useState(false);
  const [showPayment,       setShowPayment]       = useState<any>(null);
  const [detailSale,        setDetailSale]        = useState<any>(null);
  const [selectedItem,      setSelectedItem]      = useState<any>(null);
  const [paymentAmount,     setPaymentAmount]     = useState('');
  const [paymentNote,       setPaymentNote]       = useState('');
  const [paymentMethod,     setPaymentMethod]     = useState('cash');
  const [showAddClientForm, setShowAddClientForm] = useState(false);
  const [newClientForm,     setNewClientForm]     = useState({ name: '', phone: '+216' });

  const emptyItem = () => ({ productId: '', productName: '', quantity: 1, unitPrice: 0, tva: 19 });
  const [form, setForm] = useState({
    clientId: '', items: [emptyItem()],
    initialPayment: 0, paymentMethod: 'cash', notes: '',
  });

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: sales = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['sales'],
    queryFn:  () => VentesApi.getAll(),
  });
  const { data: clients  = [] } = useQuery({ queryKey: ['clients'],   queryFn: () => clientsApi.getAll()  });
  const { data: products = [] } = useQuery({ queryKey: ['products'],  queryFn: () => productsApi.getAll() });
  const { data: saleDetail }    = useQuery({
    queryKey: ['sale-detail', detailSale?._id],
    queryFn:  () => VentesApi.getOne(detailSale._id),
    enabled:  !!detailSale?._id,
  });

  // ── Status config ──────────────────────────────────────────────────────────
  const statusConfig: Record<string, { label: string; cls: string; border: string }> = {
    paid:    { label: t('sales.status.paid'),    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
    partial: { label: t('sales.status.partial'), cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',         border: 'border-amber-200 dark:border-amber-800'    },
    pending: { label: t('sales.status.pending'), cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',                 border: 'border-red-200 dark:border-red-800'        },
  };

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: VentesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('clients.created'));
      setShowForm(false);
      setForm({ clientId: '', items: [emptyItem()], initialPayment: 0, paymentMethod: 'cash', notes: '' });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || t('error.generic')),
  });

  const deleteMut = useMutation({
    mutationFn: VentesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('clients.deleted'));
    },
  });

  const paymentMut = useMutation({
    mutationFn: ({ id, data }: any) => VentesApi.addPayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sale-detail'] });
      toast.success(t('clients.paymentSuccess'));
      setShowPayment(null); setPaymentAmount(''); setPaymentNote('');
    },
  });

  const deletePaymentMut = useMutation({
    mutationFn: ({ saleId, paymentId }: any) => VentesApi.removePayment(saleId, paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sale-detail'] });
      toast.success(t('clients.deleted'));
    },
  });

  const createClientMut = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setForm(f => ({ ...f, clientId: data._id }));
      setShowAddClientForm(false);
      setNewClientForm({ name: '', phone: '+216' });
      toast.success(t('clients.created'));
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDelete = useCallback((s: any) => {
    confirm(
        { title: `${t('clients.deleteTitle')} "${s.clientName}"`, message: `${t('clients.deleteMessage')} ${formatTND(s.totalTTC)}. ${t('common.action_irreversible')}`, dangerMessage: t('clients.deleteIrreversible'), confirmLabel: t('common.delete') },
        () => deleteMut.mutate(s._id),
    );
  }, [confirm, deleteMut, t]);

  const handleDeletePayment = useCallback((saleId: string, paymentId: string, amount: number) => {
    confirm(
        { title: t('common.delete'), message: `${t('clients.deleteMessage')} ${formatTND(amount)} ?`, confirmLabel: t('common.delete') },
        () => deletePaymentMut.mutate({ saleId, paymentId }),
    );
  }, [confirm, deletePaymentMut, t]);

  const handleAddPayment = () => {
    if (!showPayment || !paymentAmount) return;
    paymentMut.mutate({ id: showPayment._id, data: { amount: +paymentAmount, note: paymentNote, method: paymentMethod } });
  };

  const handleDownloadInvoice = async (saleId: string) => {
    try {
      const blob = await VentesApi.getInvoice(saleId);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `facture-${saleId}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error(t('error.generic')); }
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

  // ── Filtering & Pagination ─────────────────────────────────────────────────
  const allSales = sales as any[];
  const paidCount    = allSales.filter(s => s.status === 'paid').length;
  const partialCount = allSales.filter(s => s.status === 'partial').length;
  const pendingCount = allSales.filter(s => s.status === 'pending').length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allSales.filter(s => {
      if (q && !((s.clientName || '').toLowerCase().includes(q))) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      return true;
    });
  }, [allSales, search, statusFilter]);

  const handleSearch       = useCallback((v: string) => { setSearch(v);        setPage(1); }, []);
  const handleStatusFilter = useCallback((v: any)    => { setStatusFilter(v);  setPage(1); }, []);

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
      key: 'clientName', header: t('sales.client'), sortable: true,
      render: (v: string) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white text-xs font-bold">{(v || '?').charAt(0).toUpperCase()}</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white text-sm">{v}</span>
          </div>
      ),
    },
    {
      key: 'totalTTC', header: t('sales.totalTTC'), sortable: true,
      render: (v: number) => <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{formatTND(v)}</span>,
    },
    {
      key: 'amountPaid', header: t('sales.amountPaid'), sortable: true, className: 'hidden sm:table-cell',
      render: (v: number) => <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{formatTND(v)}</span>,
    },
    {
      key: 'amountRemaining', header: t('sales.amountRemaining'), sortable: true, className: 'hidden md:table-cell',
      render: (v: number) => <span className={`text-sm font-semibold ${v > 0 ? 'text-red-500' : 'text-gray-400'}`}>{formatTND(v)}</span>,
    },
    {
      key: 'status', header: t('common.status'),
      render: (v: string) => {
        const cfg = statusConfig[v] || { label: v, cls: 'bg-gray-100 text-gray-500', border: 'border-gray-200' };
        return <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border ${cfg.cls} ${cfg.border}`}>{cfg.label}</span>;
      },
    },
    {
      key: 'createdAt', header: t('common.date'), sortable: true, className: 'hidden lg:table-cell',
      render: (v: string) => v ? <span className="text-xs text-gray-400">{format(new Date(v), 'dd/MM/yyyy')}</span> : <span className="text-gray-300">—</span>,
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
      <div className="space-y-4 sm:space-y-5" dir={dir}>

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('nav.sales')}</h1>
            <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm mt-0.5">
              {filtered.length !== allSales.length
                  ? <><span className="text-blue-500 font-semibold">{filtered.length}</span> / {allSales.length} {t('nav.sales').toLowerCase()}</>
                  : <>{allSales.length} {t('nav.sales').toLowerCase()}</>}
              {pendingCount > 0 && !hasFilters && (
                  <span className="text-red-500 ms-1.5">· {pendingCount} {t('sales.status.pending').toLowerCase()}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button onClick={() => refetch()} disabled={isRefetching}
                    className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    title={t('clients.refresh')}>
              <RefreshCw size={15} className={isRefetching ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-500/20">
              <Plus size={16} /> {t('sales.new')}
            </button>
          </div>
        </div>

        {/* ── Stat chips ── */}
        {allSales.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => handleStatusFilter('all')}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${statusFilter === 'all' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>
                {t('clients.all')} ({allSales.length})
              </button>
              <button onClick={() => handleStatusFilter('paid')}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${statusFilter === 'paid' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'}`}>
                <CheckCircle2 size={11} /> {paidCount} {t('sales.status.paid')}
              </button>
              {partialCount > 0 && (
                  <button onClick={() => handleStatusFilter('partial')}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${statusFilter === 'partial' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'}`}>
                    <Clock size={11} /> {partialCount} {t('sales.status.partial')}
                  </button>
              )}
              {pendingCount > 0 && (
                  <button onClick={() => handleStatusFilter('pending')}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${statusFilter === 'pending' ? 'bg-red-600 text-white border-red-600 shadow-sm' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'}`}>
                    <AlertCircle size={11} /> {pendingCount} {t('sales.status.pending')}
                  </button>
              )}
            </div>
        )}

        {/* ── Toolbar ── */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <SearchBar value={search} onChange={handleSearch} placeholder={`${t('common.search')} ${t('nav.sales').toLowerCase()}…`} />
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
            <EmptyState hasFilters={hasFilters} onCreate={() => setShowForm(true)} />
        ) : (
            <>
              {/* Cards */}
              <div className={`${viewMode === 'cards' ? 'block' : 'block sm:hidden'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {paginated.map(s => (
                      <SaleCard key={s._id} sale={s} statusConfig={statusConfig}
                                onView={() => setDetailSale(s)}
                                onPayment={e => { e.stopPropagation(); setShowPayment(s); }}
                                onDownload={e => { e.stopPropagation(); handleDownloadInvoice(s._id); }}
                                onDelete={e => { e.stopPropagation(); handleDelete(s); }}
                      />
                  ))}
                </div>
              </div>

              {/* Table */}
              {viewMode === 'table' && (
                  <div className="hidden sm:block">
                    <DataTable
                        data={paginated} columns={columns} searchable={false} searchKeys={[]}
                        isLoading={false} emptyMessage={t('common.noData')} onRowClick={setDetailSale}
                        actions={row => (
                            <div className="flex items-center justify-end gap-0.5">
                              <button onClick={e => { e.stopPropagation(); setDetailSale(row); }} className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title={t('common.view')}><Eye size={14} /></button>
                              <button onClick={e => { e.stopPropagation(); handleDownloadInvoice(row._id); }} className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" title={t('sales.invoice')}><FileText size={14} /></button>
                              {row.status !== 'paid' && (
                                  <button onClick={e => { e.stopPropagation(); setShowPayment(row); }} className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title={t('sales.addPayment')}><CreditCard size={14} /></button>
                              )}
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
            ── MODAL : Nouvelle vente ──
            ══════════════════════════════════════════════════════════════════ */}
        {showForm && (
            <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center" dir={dir}>
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
              <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl mx-0 sm:mx-4 max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
                <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
                <div className="px-5 sm:px-6 pt-3 sm:pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/30">
                      <Receipt size={16} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-white">{t('sales.new')}</h2>
                      <p className="text-xs text-gray-400 mt-0.5">{t('clients.newSubtitle')}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400"><X size={18} /></button>
                </div>

                <form onSubmit={e => { e.preventDefault(); createMut.mutate(form as any); }} className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">

                    {/* Client */}
                    <div>
                      <label className={labelCls}>{t('sales.client')} <span className="text-red-400 normal-case font-normal">*</span></label>
                      <div className="flex gap-2">
                        <select required value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))} className={inp + ' flex-1'}>
                          <option value="">{t('common.search')}</option>
                          {(clients as any[]).map((c: any) => <option key={c._id} value={c._id}>{c.name} — {c.phone}</option>)}
                        </select>
                        <button type="button" onClick={() => setShowAddClientForm(true)}
                                className="px-3 py-2 border border-dashed border-blue-400 text-blue-600 dark:text-blue-400 rounded-xl text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 whitespace-nowrap transition-colors flex items-center gap-1">
                          <Plus size={12} /> {t('clients.new')}
                        </button>
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
                                              className="text-red-400 hover:text-red-600 p-1 rounded">
                                        <X size={12} />
                                      </button>
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

                    {/* Paiement + mode + notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={labelCls}>{t('sales.initialPayment')}</label>
                        <input type="number" min={0} step={0.001} max={totalTTC} value={form.initialPayment}
                               onChange={e => setForm(f => ({ ...f, initialPayment: +e.target.value }))} className={inpSm} />
                        {form.initialPayment > 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                              {t('sales.amountRemaining')} : <span className={totalTTC - form.initialPayment > 0 ? 'text-red-500 font-medium' : 'text-emerald-500 font-medium'}>
                                                    {formatTND(Math.max(0, totalTTC - form.initialPayment))}
                                                </span>
                            </p>
                        )}
                      </div>
                      <div>
                        <label className={labelCls}>{t('sales.paymentMethod')}</label>
                        <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} className={inpSm}>
                          {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{t(m.label)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{t('common.notes')}</label>
                        <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={t('common.optional')} className={inpSm} />
                      </div>
                    </div>
                  </div>

                  <div className="px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 shrink-0 bg-gray-50/50 dark:bg-gray-900">
                    <button type="button" onClick={() => setShowForm(false)}
                            className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      {t('common.cancel')}
                    </button>
                    <button type="submit" disabled={createMut.isPending || !form.clientId || form.items.every(i => !i.productId)}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-500/20">
                      {createMut.isPending ? t('common.saving') : t('sales.new')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            ── MODAL : Nouveau client rapide ──
            ══════════════════════════════════════════════════════════════════ */}
        {showAddClientForm && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir={dir}>
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddClientForm(false)} />
              <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm mx-0 sm:mx-4 overflow-hidden">
                <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
                <div className="px-5 pt-4 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/30">
                      <User size={16} className="text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('clients.new')}</h3>
                  </div>
                  <button onClick={() => setShowAddClientForm(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400"><X size={16} /></button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className={labelCls}>{t('common.name')} <span className="text-red-400 normal-case font-normal">*</span></label>
                    <input value={newClientForm.name} onChange={e => setNewClientForm(f => ({ ...f, name: e.target.value }))} className={inp} placeholder={t('clients.namePlaceholder')} />
                  </div>
                  <div>
                    <label className={labelCls}>{t('common.phone')} <span className="text-red-400 normal-case font-normal">*</span></label>
                    <input value={newClientForm.phone} onChange={e => setNewClientForm(f => ({ ...f, phone: e.target.value }))} pattern="^\+216[0-9]{8}$" className={inp} placeholder={t('clients.phonePlaceholder')} />
                    <p className="text-xs text-gray-400 mt-1">{t('clients.phoneFormat')}</p>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button onClick={() => setShowAddClientForm(false)}
                            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      {t('common.cancel')}
                    </button>
                    <button onClick={() => { if (newClientForm.name && newClientForm.phone) createClientMut.mutate(newClientForm as any); }}
                            disabled={!newClientForm.name || createClientMut.isPending}
                            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-500/20">
                      {createClientMut.isPending ? t('common.saving') : t('common.create')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            ── MODAL : Ajouter un paiement ──
            ══════════════════════════════════════════════════════════════════ */}
        {showPayment && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir={dir}>
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPayment(null)} />
              <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md mx-0 sm:mx-4 overflow-hidden">
                <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
                <div className="px-5 pt-4 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/30">
                      <Banknote size={18} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t('clients.quickPayment')}</h2>
                      <p className="text-xs text-gray-400 mt-0.5">{showPayment.clientName}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowPayment(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400"><X size={16} /></button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                    <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      {t('sales.amountRemaining')} : <strong>{formatTND(showPayment.amountRemaining)}</strong>
                    </p>
                  </div>
                  <div>
                    <label className={labelCls}>{t('clients.paymentAmount')} <span className="text-red-400 normal-case font-normal">*</span></label>
                    <div className="relative">
                      <Banknote size={15} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="number" min={0.001} step={0.001} max={showPayment.amountRemaining}
                             value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                             className="w-full ps-10 pe-16 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-lg font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                             autoFocus />
                      <span className="absolute end-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">TND</span>
                    </div>
                    {paymentAmount && parseFloat(paymentAmount) > 0 && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 ms-1 font-medium">✓ {formatTND(parseFloat(paymentAmount))}</p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>{t('sales.paymentMethod')}</label>
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={inp}>
                      {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{t(m.label)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{t('clients.paymentNote')}</label>
                    <input value={paymentNote} onChange={e => setPaymentNote(e.target.value)} placeholder={t('clients.paymentNotePlaceholder')} className={inp} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setShowPayment(null)}
                            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      {t('common.cancel')}
                    </button>
                    <button onClick={handleAddPayment} disabled={!paymentAmount || paymentMut.isPending}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-emerald-500/20">
                      {paymentMut.isPending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('clients.saving')}</> : <><Banknote size={15} />{t('common.save')}</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            ── DRAWER : Détail d'une vente ──
            ══════════════════════════════════════════════════════════════════ */}
        {detailSale && (
            <div className="fixed inset-0 z-40 flex items-end sm:justify-end" dir={dir}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setDetailSale(null); setSelectedItem(null); }} />
              <div className="relative w-full sm:w-auto sm:max-w-xl sm:h-full bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto rounded-t-2xl sm:rounded-none max-h-[92vh] sm:max-h-full">
                <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-3 sm:hidden" />
                <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between mt-1 sm:mt-0">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                        {saleDetail?.clientName || detailSale.clientName}
                      </h2>
                      {(() => { const cfg = statusConfig[saleDetail?.status || detailSale.status]; return cfg ? <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${cfg.cls} ${cfg.border}`}>{cfg.label}</span> : null; })()}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{detailSale.createdAt ? format(new Date(detailSale.createdAt), 'dd/MM/yyyy HH:mm') : '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDownloadInvoice(detailSale._id)}
                            className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <Download size={13} /> {t('sales.invoice')}
                    </button>
                    <button onClick={() => { setDetailSale(null); setSelectedItem(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"><X size={18} /></button>
                  </div>
                </div>

                <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                  {/* KPI */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { label: t('sales.totalTTC'), value: formatTND(saleDetail?.totalTTC || detailSale.totalTTC), cls: 'text-blue-600 dark:text-blue-400' },
                      { label: t('sales.amountPaid'), value: formatTND(saleDetail?.amountPaid || detailSale.amountPaid), cls: 'text-emerald-600 dark:text-emerald-400' },
                      { label: t('sales.amountRemaining'), value: formatTND(saleDetail?.amountRemaining ?? detailSale.amountRemaining), cls: (saleDetail?.amountRemaining ?? detailSale.amountRemaining) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400' },
                    ].map(({ label, value, cls }) => (
                        <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5 sm:p-3 text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 line-clamp-1">{label}</p>
                          <p className={`text-xs sm:text-sm font-bold ${cls} truncate`}>{value}</p>
                        </div>
                    ))}
                  </div>

                  {/* Articles */}
                  <div>
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 flex items-center gap-2">
                      <Package size={14} className="text-gray-400" /> {t('products.title')} ({(saleDetail?.items || []).length})
                    </h3>
                    <div className="space-y-2">
                      {(saleDetail?.items || []).map((item: any, i: number) => (
                          <button key={i} onClick={() => setSelectedItem(item)}
                                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/10 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all text-start active:scale-[0.99]">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">{item.productName}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {item.quantity} × {formatTND(item.unitPrice)}{item.tva > 0 && ` · TVA ${item.tva}%`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 ms-2 shrink-0">
                              <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">{formatTND(item.quantity * item.unitPrice * (1 + item.tva / 100))}</span>
                              <ChevronRight size={13} className="text-gray-400 rtl:rotate-180" />
                            </div>
                          </button>
                      ))}
                    </div>
                  </div>

                  {/* Paiements */}
                  <div>
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Calendar size={13} className="text-gray-400" /> {t('sales.addPayment')}
                      </h3>
                      {saleDetail?.status !== 'paid' && (
                          <button onClick={() => setShowPayment(saleDetail || detailSale)}
                                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                            <Plus size={12} /> {t('common.add')}
                          </button>
                      )}
                    </div>
                    {(saleDetail?.payments || []).length === 0 ? (
                        <div className="text-center py-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                          <p className="text-xs sm:text-sm text-gray-400">{t('common.noData')}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                          {(saleDetail?.payments || []).map((p: any) => (
                              <div key={p._id} className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">+{formatTND(p.amount)}</span>
                                    <span className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                                                            {t(PAYMENT_METHODS.find(m => m.value === p.method)?.label || '') || p.method}
                                                        </span>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {p.date ? format(new Date(p.date), 'dd/MM/yyyy HH:mm') : '—'}
                                    {p.note ? ` — ${p.note}` : ''}
                                  </p>
                                </div>
                                <button onClick={() => handleDeletePayment(detailSale._id, p._id, p.amount)}
                                        className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                          ))}
                        </div>
                    )}
                  </div>

                  {/* Notes */}
                  {(saleDetail?.notes || detailSale.notes) && (
                      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl p-3 sm:p-4">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 uppercase tracking-wide">{t('common.notes')}</p>
                        <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{saleDetail?.notes || detailSale.notes}</p>
                      </div>
                  )}
                </div>
              </div>
            </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            ── PANEL : Détail d'un article ──
            ══════════════════════════════════════════════════════════════════ */}
        {selectedItem && (
            <div className="fixed inset-0 z-50 flex items-end sm:justify-end" dir={dir}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedItem(null)} />
              <div className="relative w-full sm:w-auto sm:max-w-md sm:h-full bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto rounded-t-2xl sm:rounded-none max-h-[92vh] sm:max-h-full">
                <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-3 sm:hidden" />
                <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-2 mt-1 sm:mt-0">
                  <button onClick={() => setSelectedItem(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <ChevronLeft size={17} className="text-gray-500 rtl:rotate-180" />
                  </button>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">{selectedItem.productName}</h2>
                    <p className="text-xs text-gray-400">{t('products.title')}</p>
                  </div>
                </div>
                <div className="p-4 sm:p-6 space-y-0">
                  {[
                    { label: t('sales.quantity'),  value: `${selectedItem.quantity} ${selectedItem.unit || ''}` },
                    { label: t('sales.unitPrice'), value: formatTND(selectedItem.unitPrice) },
                    { label: t('products.tva'),    value: `${selectedItem.tva ?? 0} %` },
                    { label: t('sales.totalHT'),   value: formatTND(selectedItem.totalHT || selectedItem.quantity * selectedItem.unitPrice) },
                    { label: t('sales.totalTTC'),  value: formatTND(selectedItem.totalTTC || selectedItem.quantity * selectedItem.unitPrice * (1 + (selectedItem.tva || 0) / 100)), bold: true, color: 'text-blue-600 dark:text-blue-400' },
                  ].map(({ label, value, bold, color }) => (
                      <div key={label} className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-gray-800 last:border-0">
                        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{label}</span>
                        <span className={`text-xs sm:text-sm ${bold ? 'font-bold' : 'font-semibold'} ${color || 'text-gray-900 dark:text-white'}`}>{value}</span>
                      </div>
                  ))}
                </div>
                <div className="px-4 sm:px-6 pb-5">
                  <button onClick={() => setSelectedItem(null)}
                          className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                    {t('common.close')}
                  </button>
                </div>
              </div>
            </div>
        )}

        <ConfirmDialog {...confirmState} onProceed={proceed} onCancel={cancel} confirmLabel={t('common.delete')} />
      </div>
  );
};

export default SalesPage;