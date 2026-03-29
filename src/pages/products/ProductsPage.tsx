import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, suppliersApi } from '../../api';
import DataTable from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import {
  Plus, Pencil, Trash2, AlertTriangle, Search, X, Package,
  Tag, Layers, TrendingUp, TrendingDown, RefreshCw, LayoutGrid,
  List, SlidersHorizontal, ChevronLeft, ChevronRight, Building2,
  ShoppingBag, BadgePercent,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

// ── Types ──────────────────────────────────────────────────────────────────────
interface ProductForm {
  name:           string;
  tva:            number;
  unit:           string;
  purchasePrice:  number;
  salePrice:      number;
  stockQuantity:  number;
  stockThreshold: number;
  supplierIds:    string[];
}

const defaultForm: ProductForm = {
  name: '', tva: 19, unit: 'unité', purchasePrice: 0,
  salePrice: 0, stockQuantity: 0, stockThreshold: 5, supplierIds: [],
};

const formatTND = (v: number) => `${(v || 0).toFixed(3)} TND`;
const PAGE_SIZES = [10, 25, 50, 100];

// ── SearchBar ──────────────────────────────────────────────────────────────────
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
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:cursor-not-allowed">
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
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:cursor-not-allowed">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
  );
};

// ── ProductCard ────────────────────────────────────────────────────────────────
const ProductCard: React.FC<{
  product: any;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ product, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const isLowStock = product.stockQuantity <= (product.stockThreshold || 0) && product.stockThreshold > 0;

  return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
        <div className={`h-1 w-full ${isLowStock ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-blue-500 to-blue-400'}`} />
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${isLowStock ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-blue-600'}`}>
                <Package size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 dark:text-white text-sm leading-tight truncate">{product.name}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{product.unit}</p>
              </div>
            </div>
            {isLowStock && (
                <span className="shrink-0 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                            <AlertTriangle size={10} /> {t('products.lowStock')}
                        </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-2.5 py-1.5">
              <p className="text-xs text-gray-400 mb-0.5">{t('products.purchasePrice')}</p>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{formatTND(product.purchasePrice)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-2.5 py-1.5">
              <p className="text-xs text-gray-400 mb-0.5">{t('products.price')}</p>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{formatTND(product.salePrice)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-2.5 py-1.5">
              <p className="text-xs text-gray-400 mb-0.5">{t('products.stock')}</p>
              <p className={`text-xs font-bold ${isLowStock ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {product.stockQuantity}
                {isLowStock && <AlertTriangle size={10} className="inline ms-1 text-amber-500" />}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-2.5 py-1.5">
              <p className="text-xs text-gray-400 mb-0.5">{t('products.tva')}</p>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{product.tva}%</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button onClick={() => onEdit()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold
                            bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400
                            hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-blue-200 dark:border-blue-800">
              <Pencil size={12} /> {t('common.edit')}
            </button>
            <button onClick={() => onDelete()}
                    className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400
                            hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-800">
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
          {hasFilters ? <Search size={28} className="text-gray-400" /> : <Package size={28} className="text-gray-400" />}
        </div>
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
          {hasFilters ? t('clients.noResults') : t('products.title')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-5">
          {hasFilters ? t('clients.noResultsDesc') : t('clients.noClientsDesc')}
        </p>
        {!hasFilters && (
            <button onClick={onCreate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-500/20">
              <Plus size={15} /> {t('products.new')}
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
const ProductsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { state: confirmState, confirm, proceed, cancel } = useConfirmDialog();
  const { t, i18n } = useTranslation();
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';

  // ── UI State ───────────────────────────────────────────────────────────────
  const [viewMode,     setViewMode]     = useState<'table' | 'cards'>('table');
  const [search,       setSearch]       = useState('');
  const [stockFilter,  setStockFilter]  = useState<'all' | 'low' | 'ok'>('all');
  const [page,         setPage]         = useState(1);
  const [pageSize,     setPageSize]     = useState(25);

  // ── Form State ─────────────────────────────────────────────────────────────
  const [showForm,  setShowForm]  = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form,      setForm]      = useState<ProductForm>(defaultForm);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: products = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['products'],
    queryFn:  () => productsApi.getAll(),
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn:  () => suppliersApi.getAll(),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('clients.created'));
      setShowForm(false);
      setForm(defaultForm);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || t('error.generic'));
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
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
    mutationFn: productsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('clients.deleted'));
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleEdit = useCallback((p: any) => {
    setEditingId(p._id);
    setForm({
      name:           p.name,
      tva:            p.tva,
      unit:           p.unit,
      purchasePrice:  p.purchasePrice,
      salePrice:      p.salePrice,
      stockQuantity:  p.stockQuantity,
      stockThreshold: p.stockThreshold,
      supplierIds:    p.supplierIds?.map((s: any) => s._id || s) || [],
    });
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((p: any) => {
    confirm(
        {
          title:        `${t('clients.deleteTitle')} "${p.name}"`,
          message:      `${t('clients.deleteMessage')} "${p.name}". ${t('common.action_irreversible')}`,
          confirmLabel: t('common.delete'),
        },
        () => deleteMut.mutate(p._id),
    );
  }, [confirm, deleteMut, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) updateMut.mutate({ id: editingId, data: form });
    else           createMut.mutate(form as any);
  };

  // ── Filtering & Pagination ─────────────────────────────────────────────────
  const allProducts = products as any[];
  const lowStockCount = allProducts.filter(p => p.stockQuantity <= (p.stockThreshold || 0) && p.stockThreshold > 0).length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allProducts.filter(p => {
      if (q && !(
          (p.name || '').toLowerCase().includes(q) ||
          (p.unit || '').toLowerCase().includes(q)
      )) return false;
      if (stockFilter === 'low' && !(p.stockQuantity <= (p.stockThreshold || 0) && p.stockThreshold > 0)) return false;
      if (stockFilter === 'ok'  &&  (p.stockQuantity <= (p.stockThreshold || 0) && p.stockThreshold > 0)) return false;
      return true;
    });
  }, [allProducts, search, stockFilter]);

  const handleSearch      = useCallback((v: string) => { setSearch(v);       setPage(1); }, []);
  const handleStockFilter = useCallback((v: any)    => { setStockFilter(v);  setPage(1); }, []);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = !!(search || stockFilter !== 'all');

  // ── CSS helpers ────────────────────────────────────────────────────────────
  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all duration-150';
  const labelCls = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5';

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'name', header: t('products.name'), sortable: true,
      render: (v: string, row: any) => {
        const isLow = row.stockQuantity <= (row.stockThreshold || 0) && row.stockThreshold > 0;
        return (
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${isLow ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-blue-600'}`}>
                <Package size={14} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{v}</p>
                {row.unit && <p className="text-xs text-gray-400 truncate">{row.unit}</p>}
              </div>
            </div>
        );
      },
    },
    {
      key: 'tva', header: t('products.tva'), sortable: true, className: 'hidden sm:table-cell',
      render: (v: number) => (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    <BadgePercent size={10} />{v}%
                </span>
      ),
    },
    {
      key: 'purchasePrice', header: t('products.purchasePrice'), sortable: true, className: 'hidden md:table-cell',
      render: (v: number) => (
          <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                    <TrendingDown size={12} className="text-gray-400" />{formatTND(v)}
                </span>
      ),
    },
    {
      key: 'salePrice', header: t('products.price'), sortable: true,
      render: (v: number) => (
          <span className="flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
                    <TrendingUp size={12} />{formatTND(v)}
                </span>
      ),
    },
    {
      key: 'stockQuantity', header: t('products.stock'), sortable: true,
      render: (v: number, row: any) => {
        const isLow = v <= (row.stockThreshold || 0) && row.stockThreshold > 0;
        return (
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-semibold ${isLow ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>{v}</span>
              {isLow && <AlertTriangle size={13} className="text-amber-500" />}
              {row.stockThreshold > 0 && (
                  <span className="text-xs text-gray-400">/ {row.stockThreshold}</span>
              )}
            </div>
        );
      },
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
      <div className="space-y-4 sm:space-y-5" dir={dir}>

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {t('products.title')}
            </h1>
            <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm mt-0.5">
              {filtered.length !== allProducts.length
                  ? <><span className="text-blue-500 font-semibold">{filtered.length}</span> / {allProducts.length} {t('products.title').toLowerCase()}</>
                  : <>{allProducts.length} {t('products.title').toLowerCase()}</>}
              {lowStockCount > 0 && !hasFilters && (
                  <span className="text-amber-500 ms-1.5">· {lowStockCount} {t('products.lowStock')}</span>
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
              <Plus size={16} /> {t('products.new')}
            </button>
          </div>
        </div>

        {/* ── Stat chips ── */}
        {allProducts.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => handleStockFilter('all')}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${stockFilter === 'all' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                {t('clients.all')} ({allProducts.length})
              </button>
              {lowStockCount > 0 && (
                  <button onClick={() => handleStockFilter('low')}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${stockFilter === 'low' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'}`}>
                    <AlertTriangle size={11} /> {lowStockCount} {t('products.lowStock')}
                  </button>
              )}
              <button onClick={() => handleStockFilter('ok')}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${stockFilter === 'ok' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'}`}>
                ✓ {t('stock.currentStock')} ({allProducts.length - lowStockCount})
              </button>
            </div>
        )}

        {/* ── Toolbar ── */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <SearchBar value={search} onChange={handleSearch} placeholder={`${t('common.search')} ${t('products.title').toLowerCase()}…`} />
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-0.5 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <button onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                      title={t('clients.tableView')}>
                <List size={15} />
              </button>
              <button onClick={() => setViewMode('cards')}
                      className={`p-1.5 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                      title={t('clients.cardView')}>
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Active filters ── */}
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
              {stockFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
                            {stockFilter === 'low' ? t('products.lowStock') : t('stock.currentStock')}
                    <button onClick={() => handleStockFilter('all')}><X size={11} /></button>
                        </span>
              )}
              <button onClick={() => { handleSearch(''); handleStockFilter('all'); }}
                      className="text-xs text-red-500 hover:text-red-600 font-medium underline">
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
            <EmptyState hasFilters={hasFilters} onCreate={() => { setEditingId(null); setForm(defaultForm); setShowForm(true); }} />
        ) : (
            <>
              {/* Cards */}
              <div className={`${viewMode === 'cards' ? 'block' : 'block sm:hidden'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {paginated.map(p => (
                      <ProductCard
                          key={p._id}
                          product={p}
                          onEdit={() => handleEdit(p)}
                          onDelete={() => handleDelete(p)}
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
                        searchable={false}
                        searchKeys={[]}
                        isLoading={false}
                        emptyMessage={t('common.noData')}
                        actions={row => (
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                  onClick={e => { e.stopPropagation(); handleEdit(row); }}
                                  className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                  title={t('common.edit')}
                              ><Pencil size={14} /></button>
                              <button
                                  onClick={e => { e.stopPropagation(); handleDelete(row); }}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title={t('common.delete')}
                              ><Trash2 size={14} /></button>
                            </div>
                        )}
                    />
                  </div>
              )}

              <Pagination
                  page={page} totalPages={totalPages} pageSize={pageSize}
                  total={filtered.length} onPage={setPage} onPageSize={setPageSize}
              />
            </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            ── Product Form Modal ──
            ══════════════════════════════════════════════════════════════════ */}
        {showForm && (
            <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center" dir={dir}>
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
              <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl mx-0 sm:mx-4 max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
                <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
                <div className="px-5 sm:px-6 pt-3 sm:pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/30">
                      <Package size={16} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                        {editingId ? t('common.edit') : t('products.new')}
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

                    {/* Nom */}
                    <div>
                      <label className={labelCls}>{t('products.name')} <span className="text-red-400 normal-case font-normal">*</span></label>
                      <div className="relative">
                        <Package size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            required
                            placeholder={t('products.name')}
                            className={inputCls + ' ps-8'}
                        />
                      </div>
                    </div>

                    {/* Unité + TVA */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className={labelCls}>{t('products.unit')}</label>
                        <div className="relative">
                          <Layers size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                              value={form.unit}
                              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                              placeholder={t('products.unit')}
                              className={inputCls + ' ps-8'}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>{t('products.tva')} (%)</label>
                        <div className="relative">
                          <BadgePercent size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                              type="number" min={0} step={1}
                              value={form.tva}
                              onChange={e => setForm(f => ({ ...f, tva: +e.target.value }))}
                              className={inputCls + ' ps-8'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Prix achat + Prix vente */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className={labelCls}>{t('products.purchasePrice')}</label>
                        <div className="relative">
                          <TrendingDown size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                              type="number" min={0} step={0.001}
                              value={form.purchasePrice}
                              onChange={e => setForm(f => ({ ...f, purchasePrice: +e.target.value }))}
                              className={inputCls + ' ps-8'}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>{t('products.price')}</label>
                        <div className="relative">
                          <TrendingUp size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                              type="number" min={0} step={0.001}
                              value={form.salePrice}
                              onChange={e => setForm(f => ({ ...f, salePrice: +e.target.value }))}
                              className={inputCls + ' ps-8'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Stock + Seuil */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className={labelCls}>{t('products.stock')}</label>
                        <div className="relative">
                          <ShoppingBag size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                              type="number" min={0} step={1}
                              value={form.stockQuantity}
                              onChange={e => setForm(f => ({ ...f, stockQuantity: +e.target.value }))}
                              className={inputCls + ' ps-8'}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>{t('products.minStock')}</label>
                        <div className="relative">
                          <AlertTriangle size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                              type="number" min={0} step={1}
                              value={form.stockThreshold}
                              onChange={e => setForm(f => ({ ...f, stockThreshold: +e.target.value }))}
                              className={inputCls + ' ps-8'}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1 ms-1">{t('stock.threshold')}</p>
                      </div>
                    </div>

                    {/* Fournisseurs */}
                    <div>
                      <label className={labelCls}>
                        <Building2 size={11} className="inline me-1" />
                        {t('nav.suppliers')}
                      </label>
                      <select
                          multiple
                          value={form.supplierIds}
                          onChange={e => setForm(f => ({ ...f, supplierIds: Array.from(e.target.selectedOptions, o => o.value) }))}
                          className={inputCls + ' h-24'}
                      >
                        {(suppliers as any[]).map((s: any) => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-400 mt-1 ms-1">
                        {i18n.language === 'ar' ? 'Ctrl+clic للتحديد المتعدد' : 'Ctrl+clic pour sélection multiple'}
                      </p>
                    </div>

                    {/* Marge calculée */}
                    {form.purchasePrice > 0 && form.salePrice > 0 && (
                        <div className={`flex items-center justify-between p-3 rounded-xl border ${form.salePrice >= form.purchasePrice ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t('dashboard.netMargin')}</span>
                          <span className={`text-sm font-bold ${form.salePrice >= form.purchasePrice ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                            {(((form.salePrice - form.purchasePrice) / form.purchasePrice) * 100).toFixed(1)}%
                            {' '}({formatTND(form.salePrice - form.purchasePrice)})
                                        </span>
                        </div>
                    )}
                  </div>

                  <div className="px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 shrink-0 bg-gray-50/50 dark:bg-gray-900">
                    <button type="button" onClick={() => setShowForm(false)}
                            className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      {t('common.cancel')}
                    </button>
                    <button type="submit" disabled={createMut.isPending || updateMut.isPending}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-500/20">
                      {createMut.isPending || updateMut.isPending
                          ? t('common.saving')
                          : editingId ? t('common.edit') : t('common.create')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}

        <ConfirmDialog {...confirmState} onProceed={proceed} onCancel={cancel} confirmLabel={t('common.delete')} />
      </div>
  );
};

export default ProductsPage;