import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chargesApi } from '@/api';
import DataTable from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog.ts';
import { useTranslation } from 'react-i18next';
import {
  Plus, Pencil, Trash2, X, Sparkles, Upload, Eye,
  FileText, Image as ImageIcon, Link, Calendar,
  Loader2, File, Download, ZoomIn, ExternalLink,
  PlusCircle, MinusCircle, LayoutGrid, List,
  ChevronLeft, ChevronRight, Search,
  SlidersHorizontal, CalendarRange, RefreshCw,
  Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import api from '../../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────
type OcrMode   = 'url' | 'upload';
type FormMode  = 'manual' | 'ocr';
type ViewMode  = 'list' | 'grid';

interface OcrItem { label: string; total: number; }

interface FormState {
  description: string;
  amount:      number;
  amountHT:    number;
  tva:         number;
  date:        string;
  type:        string;
  source:      string;
  notes:       string;
  imageUrl:    string;
  currency:    string;
  isDevis:     boolean;
}

interface DateFilter {
  from: string;
  to:   string;
}

const CHARGE_TYPES = [
  'rent','salary','utilities','equipment',
  'marketing','tax','insurance','accounting','fuel','other',
] as const;

const CURRENCIES = ['TND','EUR','USD','other'] as const;

const ACCEPTED_MIME_TYPES = ['image/jpeg','image/png','image/webp','image/gif','application/pdf'];
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.gif,.pdf';
const MAX_FILE_SIZE_MB     = 10;
const PAGE_SIZE_OPTIONS    = [6, 12, 24];

// ── Format amount ─────────────────────────────────────────────────────────────
const formatAmount = (v: number, currency = 'TND') => {
  if (v === null || v === undefined) return '—';
  switch (currency) {
    case 'EUR': return `${(v).toFixed(2)} €`;
    case 'USD': return `$${(v).toFixed(2)}`;
    default:    return `${(v).toFixed(3)} TND`;
  }
};

const defaultForm: FormState = {
  description: '', amount: 0, amountHT: 0, tva: 0,
  date:        new Date().toISOString().split('T')[0],
  type:        'other', source: '', notes: '', imageUrl: '',
  currency:    'TND',
  isDevis:     false,
};

const defaultDateFilter: DateFilter = { from: '', to: '' };

// ─── Type badge colors ────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  rent:       'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  salary:     'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  utilities:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  equipment:  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  marketing:  'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  tax:        'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  insurance:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  accounting: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  fuel:       'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  other:      'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const TYPE_DOT_COLORS: Record<string, string> = {
  rent:       'bg-blue-500',
  salary:     'bg-green-500',
  utilities:  'bg-yellow-500',
  equipment:  'bg-purple-500',
  marketing:  'bg-pink-500',
  tax:        'bg-red-500',
  insurance:  'bg-indigo-500',
  accounting: 'bg-teal-500',
  fuel:       'bg-orange-500',
  other:      'bg-gray-400',
};

// ─── Currency Badge ───────────────────────────────────────────────────────────
const CurrencyBadge: React.FC<{ currency?: string }> = ({ currency }) => {
  if (!currency || currency === 'TND') return null;
  const colors: Record<string, string> = {
    EUR:   'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
    USD:   'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300',
    other: 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  };
  return (
      <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${colors[currency] || colors.other}`}>
      {currency}
    </span>
  );
};

// ─── PDF Preview ──────────────────────────────────────────────────────────────
const PdfPreview: React.FC<{ fileName?: string }> = ({ fileName }) => (
    <div className="flex flex-col items-center justify-center gap-2 py-4">
      <div className="w-14 h-14 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
        <File size={28} className="text-red-500" />
      </div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[180px] truncate text-center">
        {fileName || 'document.pdf'}
      </p>
      <span className="text-xs text-red-500 font-semibold uppercase tracking-wide">PDF</span>
    </div>
);

// ─── Items Table ──────────────────────────────────────────────────────────────
const ItemsTable: React.FC<{ items: OcrItem[]; currency?: string }> = ({ items, currency = 'TND' }) => {
  if (!items || items.length === 0) return null;
  const total = items.reduce((s, i) => s + (i.total || 0), 0);
  return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Détail des lignes</p>
          <CurrencyBadge currency={currency} />
        </div>
        <table className="w-full text-sm">
          <thead>
          <tr className="border-b border-gray-100 dark:border-gray-700">
            <th className="text-left px-3 py-2 text-xs text-gray-400 font-medium">Désignation</th>
            <th className="text-right px-3 py-2 text-xs text-gray-400 font-medium">Total</th>
          </tr>
          </thead>
          <tbody>
          {items.map((item, i) => (
              <tr key={i} className={`border-b border-gray-50 dark:border-gray-800 last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-800/30'}`}>
                <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{item.label}</td>
                <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white whitespace-nowrap">
                  {formatAmount(item.total, currency)}
                </td>
              </tr>
          ))}
          </tbody>
          {items.length > 1 && (
              <tfoot>
              <tr className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                <td className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Total</td>
                <td className="px-3 py-2 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap">
                  {formatAmount(total, currency)}
                </td>
              </tr>
              </tfoot>
          )}
        </table>
      </div>
  );
};

// ─── Items Editor ─────────────────────────────────────────────────────────────
const ItemsEditor: React.FC<{
  items:     OcrItem[];
  currency?: string;
  onChange:  (items: OcrItem[]) => void;
}> = ({ items, currency = 'TND', onChange }) => {
  const addItem    = () => onChange([...items, { label: '', total: 0 }]);
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof OcrItem, value: string | number) =>
      onChange(items.map((it, i) => i === idx ? { ...it, [field]: value } : it));

  const cellInp = 'px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors w-full';

  return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Lignes</p>
            <CurrencyBadge currency={currency} />
          </div>
          <button type="button" onClick={addItem}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium transition-colors">
            <PlusCircle size={13} /> Ajouter
          </button>
        </div>
        {items.length === 0 ? (
            <div onClick={addItem}
                 className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl py-3 flex items-center justify-center gap-2 text-xs text-gray-400 cursor-pointer hover:border-blue-400 hover:text-blue-500 transition-colors">
              <PlusCircle size={14} /> Cliquer pour ajouter des lignes
            </div>
        ) : (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="grid grid-cols-[1fr_120px_32px] gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-400 font-medium">Désignation</span>
                <span className="text-xs text-gray-400 font-medium text-right">Total ({currency})</span>
                <span />
              </div>
              {items.map((item, i) => (
                  <div key={i}
                       className={`grid grid-cols-[1fr_120px_32px] gap-2 px-3 py-2 items-center border-b border-gray-50 dark:border-gray-800 last:border-0 ${i % 2 === 1 ? 'bg-gray-50/40 dark:bg-gray-800/20' : ''}`}>
                    <input type="text" value={item.label}
                           onChange={e => updateItem(i, 'label', e.target.value)}
                           placeholder="Désignation…" className={cellInp} />
                    <input type="number" min={0} step={0.001} value={item.total}
                           onChange={e => updateItem(i, 'total', parseFloat(e.target.value) || 0)}
                           className={`${cellInp} text-right`} />
                    <button type="button" onClick={() => removeItem(i)}
                            className="flex items-center justify-center text-red-400 hover:text-red-600 transition-colors">
                      <MinusCircle size={15} />
                    </button>
                  </div>
              ))}
              {items.length > 1 && (
                  <div className="grid grid-cols-[1fr_120px_32px] gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-t-2 border-gray-200 dark:border-gray-600">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white text-right">
                {formatAmount(items.reduce((s, it) => s + (it.total || 0), 0), currency)}
              </span>
                    <span />
                  </div>
              )}
            </div>
        )}
      </div>
  );
};

// ─── Image Viewer Modal ───────────────────────────────────────────────────────
const ImageViewer: React.FC<{
  src:       string;
  fileName?: string;
  onClose:   () => void;
}> = ({ src, fileName, onClose }) => {
  const [zoomed, setZoomed] = useState(false);
  const { t: tRaw } = useTranslation();
  const t = (key: string, fallback?: string): string => String(tRaw(key, fallback ?? key));

  const handleDownload = async () => {
    try {
      if (src.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = src; a.download = fileName || 'facture'; a.click();
      } else {
        const res = await fetch(src);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fileName || src.split('/').pop() || 'facture'; a.click();
        URL.revokeObjectURL(url);
      }
      toast.success(t('common.downloadStarted'));
    } catch {
      window.open(src, '_blank');
      toast.error(t('common.downloadFailedOpenTab'));
    }
  };

  return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 flex flex-col bg-gray-900 rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-[92vh]">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <ImageIcon size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-300 truncate">{fileName || t('charges.receipt')}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setZoomed(z => !z)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${zoomed ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                <ZoomIn size={13} /> {zoomed ? t('common.zoomOut') : t('common.zoomIn')}
              </button>
              {!src.startsWith('data:') && (
                  <a href={src} target="_blank" rel="noreferrer"
                     className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors">
                    <ExternalLink size={13} /> {t('common.open')}
                  </a>
              )}
              <button onClick={handleDownload}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                <Download size={13} /> {t('common.download')}
              </button>
              <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>
          <div
              className={`overflow-auto flex-1 flex items-center justify-center bg-gray-950 ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
              onClick={() => setZoomed(z => !z)}>
            <img src={src} alt={t('charges.receipt')}
                 className={`transition-all duration-300 select-none ${zoomed ? 'max-w-none w-auto h-auto' : 'max-w-full max-h-[75vh] object-contain'}`}
                 draggable={false} />
          </div>
          <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 flex-shrink-0">
            <p className="text-xs text-gray-500 text-center">{t('charges.imageViewerHint')}</p>
          </div>
        </div>
      </div>
  );
};

// ─── Skeleton Card ────────────────────────────────────────────────────────────
const SkeletonCard = () => (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 animate-pulse">
      <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl mb-3" />
      <div className="space-y-2">
        <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4" />
        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg w-1/2" />
      </div>
      <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-xl mt-3" />
    </div>
);

// ─── Grid Card ────────────────────────────────────────────────────────────────
const ChargeCard: React.FC<{
  charge:      any;
  t:           any;
  onView:      (c: any) => void;
  onEdit:      (c: any) => void;
  onDelete:    (c: any) => void;
  onPreview:   (c: any) => void;
  getImageSrc: (url: string) => string;
  isPdf:       (url: string) => boolean;
}> = ({ charge, t, onView, onEdit, onDelete, onPreview, getImageSrc, isPdf }) => (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col">
      <div className={`h-1 w-full ${TYPE_DOT_COLORS[charge.type] || 'bg-gray-400'}`} />

      {charge.imageUrl ? (
          <div
              onClick={() => !isPdf(charge.imageUrl) && onPreview(charge)}
              className={`h-32 flex items-center justify-center bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 relative overflow-hidden ${!isPdf(charge.imageUrl) ? 'cursor-zoom-in group' : ''}`}>
            {isPdf(charge.imageUrl) ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                    <File size={22} className="text-red-400" />
                  </div>
                  <span className="text-xs text-red-500 font-semibold uppercase">PDF</span>
                </div>
            ) : (
                <>
                  <img src={getImageSrc(charge.imageUrl)} alt=""
                       className="w-full h-full object-cover"
                       onError={(e: any) => { e.target.style.display = 'none'; }} />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn size={20} className="text-white" />
                  </div>
                </>
            )}
          </div>
      ) : (
          <div className="h-32 flex items-center justify-center bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center opacity-20 ${TYPE_DOT_COLORS[charge.type] || 'bg-gray-400'}`}>
              <FileText size={22} className="text-white" />
            </div>
          </div>
      )}

      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate leading-tight">
              {charge.description}
            </h3>
            {charge.isDevis && (
                <span className="text-xs text-amber-500 font-medium">{t('charges.isDevis')}</span>
            )}
          </div>
          <CurrencyBadge currency={charge.currency} />
        </div>

        <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[charge.type] || TYPE_COLORS.other}`}>
          {t(`charges.type.${charge.type}`, charge.type)}
        </span>
          {charge.date && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
            <Calendar size={10} /> {format(new Date(charge.date), 'dd/MM/yyyy')}
          </span>
          )}
        </div>

        <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {formatAmount(charge.amount, charge.currency)}
        </span>
          <div className="flex items-center gap-1">
            <button onClick={() => onView(charge)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title={t('common.view')}>
              <Eye size={13} />
            </button>
            <button onClick={() => onEdit(charge)}
                    className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    title={t('common.edit')}>
              <Pencil size={13} />
            </button>
            <button onClick={() => onDelete(charge)}
                    className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title={t('common.delete')}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ hasFilters: boolean; onCreate: () => void; t: any }> = ({ hasFilters, onCreate, t }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        {hasFilters ? <Search size={28} className="text-gray-400" /> : <Receipt size={28} className="text-gray-400" />}
      </div>
      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
        {hasFilters ? t('common.noResults') : t('charges.empty')}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-5">
        {hasFilters ? t('common.noResultsDesc') : t('charges.emptyDesc')}
      </p>
      {!hasFilters && (
          <button onClick={onCreate}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-500/20">
            <Plus size={15} /> {t('charges.addFirst')}
          </button>
      )}
    </div>
);

// ─── Pagination ───────────────────────────────────────────────────────────────
const Pagination: React.FC<{
  current:      number;
  total:        number;
  pageSize:     number;
  onPage:       (p: number) => void;
  onSizeChange: (s: number) => void;
  t:            any;
}> = ({ current, total, pageSize, onPage, onSizeChange, t }) => {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1 && total <= PAGE_SIZE_OPTIONS[0]) return null;

  const start = (current - 1) * pageSize + 1;
  const end   = Math.min(current * pageSize, total);

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(totalPages - 1, current + 1); i++) pages.push(i);
    if (current < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span>{start}–{end} {t('common.of')} <span className="font-semibold text-gray-700 dark:text-gray-300">{total}</span></span>
          <select
              value={pageSize}
              onChange={e => { onSizeChange(Number(e.target.value)); onPage(1); }}
              className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/25">
            {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s} {t('clients.perPage')}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onPage(current - 1)} disabled={current === 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:cursor-not-allowed">
            <ChevronLeft size={14} />
          </button>
          {pages.map((p, i) =>
              p === '...' ? (
                  <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
              ) : (
                  <button key={p} onClick={() => onPage(p as number)}
                          className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all ${current === p ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    {p}
                  </button>
              )
          )}
          <button onClick={() => onPage(current + 1)} disabled={current === totalPages}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:cursor-not-allowed">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ChargesPage: React.FC = () => {
  const { t: tRaw, i18n } = useTranslation();
  // Cast explicite pour éviter TS2322 quand t() est utilisé comme children JSX
  const t = (key: string, fallback?: string): string => String(tRaw(key, fallback ?? key));
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  const queryClient = useQueryClient();
  const { state: confirmState, confirm, proceed, cancel } = useConfirmDialog();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [showForm, setShowForm]         = useState(false);
  const [formMode, setFormMode]         = useState<FormMode>('manual');
  const [ocrMode, setOcrMode]           = useState<OcrMode>('upload');
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [detailCharge, setDetailCharge] = useState<any>(null);

  // ── View state ─────────────────────────────────────────────────────────────
  const [viewMode, setViewMode]       = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter]   = useState<DateFilter>(defaultDateFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize]       = useState(12);
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter]   = useState('all');

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm]           = useState<FormState>(defaultForm);
  const [formItems, setFormItems] = useState<OcrItem[]>([]);

  // ── OCR state ──────────────────────────────────────────────────────────────
  const [ocrUrl, setOcrUrl]         = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrItems, setOcrItems]     = useState<OcrItem[]>([]);

  // ── Upload state ───────────────────────────────────────────────────────────
  const [imagePreview, setImagePreview]     = useState('');
  const [pdfFileName, setPdfFileName]       = useState('');
  const [uploadedBase64, setUploadedBase64] = useState('');
  const [uploadedMime, setUploadedMime]     = useState('');
  const [dragOver, setDragOver]             = useState(false);

  // ── Viewer state ───────────────────────────────────────────────────────────
  const [viewerSrc, setViewerSrc]   = useState('');
  const [viewerName, setViewerName] = useState('');
  const [showViewer, setShowViewer] = useState(false);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowViewer(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getImageSrc = (imageUrl: string): string => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('data:')) return imageUrl;
    if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/') && imageUrl.length > 100)
      return `data:image/jpeg;base64,${imageUrl}`;
    return imageUrl;
  };

  const isPdf = (url: string) =>
      url.toLowerCase().endsWith('.pdf') || url.startsWith('data:application/pdf');

  const openViewer = (src: string, name?: string) => {
    setViewerSrc(getImageSrc(src));
    setViewerName(name || t('charges.receipt'));
    setShowViewer(true);
  };

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: charges = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['charges'],
    queryFn:  () => chargesApi.getAll(),
  });

  const allCharges = charges as any[];

  // ── Filtered & paginated data ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let data = [...allCharges];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter((c: any) =>
          c.description?.toLowerCase().includes(q) ||
          c.type?.toLowerCase().includes(q) ||
          c.source?.toLowerCase().includes(q) ||
          c.notes?.toLowerCase().includes(q)
      );
    }

    if (typeFilter !== 'all') {
      data = data.filter((c: any) => c.type === typeFilter);
    }

    if (dateFilter.from || dateFilter.to) {
      data = data.filter((c: any) => {
        if (!c.date) return false;
        const d = parseISO(c.date.split('T')[0]);
        if (dateFilter.from && dateFilter.to) {
          return isWithinInterval(d, {
            start: startOfDay(parseISO(dateFilter.from)),
            end:   endOfDay(parseISO(dateFilter.to)),
          });
        }
        if (dateFilter.from) return d >= startOfDay(parseISO(dateFilter.from));
        if (dateFilter.to)   return d <= endOfDay(parseISO(dateFilter.to));
        return true;
      });
    }

    return data;
  }, [allCharges, searchQuery, typeFilter, dateFilter]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  React.useEffect(() => { setCurrentPage(1); }, [searchQuery, typeFilter, dateFilter, pageSize]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: chargesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      toast.success(t('charges.created'));
      resetForm();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => chargesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      toast.success(t('charges.updated'));
      resetForm();
    },
  });

  const deleteMut = useMutation({
    mutationFn: chargesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      toast.success(t('charges.deleted'));
    },
  });

  // ── Form helpers ───────────────────────────────────────────────────────────
  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(defaultForm);
    setFormItems([]);
    setOcrUrl('');
    setImagePreview('');
    setPdfFileName('');
    setUploadedBase64('');
    setUploadedMime('');
    setOcrItems([]);
    setFormMode('manual');
  };

  const clearUpload = () => {
    setImagePreview('');
    setPdfFileName('');
    setUploadedBase64('');
    setUploadedMime('');
    setForm(f => ({ ...f, imageUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openEdit = (c: any) => {
    setEditingId(c._id);
    setForm({
      description: c.description || '',
      amount:      c.amount      || 0,
      amountHT:    c.amountHT    || 0,
      tva:         c.tva         || 0,
      date:        c.date?.split('T')[0] || new Date().toISOString().split('T')[0],
      type:        c.type        || 'other',
      source:      c.source      || '',
      notes:       c.notes       || '',
      imageUrl:    c.imageUrl    || '',
      currency:    c.currency    || 'TND',
      isDevis:     c.isDevis     ?? false,
    });
    setFormItems(c.items || []);
    if (c.imageUrl) setImagePreview(c.imageUrl);
    setFormMode('manual');
    setShowForm(true);
  };

  const handleDelete = (c: any) => confirm(
      {
        title:         `${t('charges.deleteTitle')} "${c.description}"`,
        message:       `${t('charges.deleteMsg')} ${formatAmount(c.amount, c.currency)}`,
        dangerMessage: t('charges.deleteDanger'),
        confirmLabel:  t('charges.deleteConfirm'),
      },
      () => deleteMut.mutate(c._id),
  );

  // ── File handling ──────────────────────────────────────────────────────────
  const processFile = useCallback(async (file: File) => {
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      toast.error(`${t('charges.invalidFile')} (JPG, PNG, WEBP, GIF, PDF)`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`${t('charges.fileTooLarge')} (max ${MAX_FILE_SIZE_MB} MB)`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl     = e.target?.result as string;
      const [meta, b64] = dataUrl.split(',');
      const mime        = meta.match(/data:([^;]+)/)?.[1] || file.type;
      setUploadedBase64(b64);
      setUploadedMime(mime);
      if (mime === 'application/pdf') {
        setImagePreview('');
        setPdfFileName(file.name);
        setForm(f => ({ ...f, imageUrl: '' }));
      } else {
        setImagePreview(dataUrl);
        setPdfFileName('');
        setForm(f => ({ ...f, imageUrl: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  }, [t]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  const hasUploadedFile = imagePreview.startsWith('data:') || pdfFileName !== '';

  // ── OCR ───────────────────────────────────────────────────────────────────
  const applyOcrSuggestion = (s: any, urlSource?: string) => {
    if (!s) return;
    setForm(f => ({
      ...f,
      description: s.description || f.description,
      amount:      s.amount      ?? f.amount,
      amountHT:    s.amountHT    ?? f.amountHT,
      tva:         s.tva         ?? f.tva,
      date:        s.date        || f.date,
      type:        s.type        || f.type,
      source:      s.source      || f.source,
      currency:    s.currency    || f.currency,
      isDevis:     s.isDevis     ?? f.isDevis,
      ...(urlSource ? { imageUrl: urlSource } : {}),
    }));
    if (s.items?.length) {
      setOcrItems(s.items);
      setFormItems(s.items);
    }
    setFormMode('manual');
    toast.success(t('charges.ocrSuccess'));
  };

  const runOcrFromUrl = async () => {
    if (!ocrUrl.trim()) { toast.error(t('charges.enterUrl')); return; }
    setOcrLoading(true);
    try {
      const res = await api.post('/charges/ocr/url', { imageUrl: ocrUrl });
      applyOcrSuggestion(res.data?.suggestion, ocrUrl);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('charges.ocrFailed'));
    } finally {
      setOcrLoading(false);
    }
  };

  const runOcrFromUpload = async () => {
    if (!uploadedBase64 || !uploadedMime) { toast.error(t('charges.uploadFirst')); return; }
    setOcrLoading(true);
    try {
      const res = await api.post('/charges/ocr/upload', { base64: uploadedBase64, mimeType: uploadedMime });
      applyOcrSuggestion(res.data?.suggestion);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('charges.ocrFailed'));
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = formItems.filter(it => it.label.trim() && it.total >= 0);
    const payload    = { ...form, items: validItems };
    if (editingId) updateMut.mutate({ id: editingId, data: payload });
    else           createMut.mutate(payload as any);
  };

  const inp = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all';

  const renderDropZoneContent = () => {
    if (pdfFileName) return <PdfPreview fileName={pdfFileName} />;
    if (imagePreview) return (
        <img src={imagePreview} alt="preview" className="mx-auto max-h-32 rounded-lg object-contain" />
    );
    return (
        <div className="flex flex-col items-center gap-2">
          <Upload size={24} className="text-gray-400" />
          <p className="text-sm text-gray-500">{t('charges.dropHere')}</p>
          <p className="text-xs text-gray-400">
            JPG, PNG, WEBP, GIF, <span className="font-semibold text-red-400">PDF</span> — max {MAX_FILE_SIZE_MB} MB
          </p>
        </div>
    );
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalByType = useMemo(() =>
          CHARGE_TYPES.reduce((acc, type) => {
            acc[type] = allCharges.filter(c => c.type === type).length;
            return acc;
          }, {} as Record<string, number>)
      , [allCharges]);

  const devisCount = allCharges.filter(c => c.isDevis).length;
  const hasFilters = !!(searchQuery || dateFilter.from || dateFilter.to || typeFilter !== 'all');
  const activeFiltersCount = (dateFilter.from ? 1 : 0) + (dateFilter.to ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0);

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'description', header: t('charges.description'), sortable: true,
      render: (v: string, row: any) => (
          <div className="flex items-center gap-2">
            {row.imageUrl && (
                <button
                    onClick={e => { e.stopPropagation(); if (!isPdf(row.imageUrl)) openViewer(row.imageUrl, row.description); }}
                    className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700 bg-gray-100 hover:ring-2 hover:ring-blue-500 transition-all group relative"
                    title={t('charges.viewReceipt')}>
                  {isPdf(row.imageUrl) ? (
                      <div className="w-full h-full flex items-center justify-center bg-red-50">
                        <File size={14} className="text-red-400" />
                      </div>
                  ) : (
                      <>
                        <img src={getImageSrc(row.imageUrl)} alt=""
                             className="w-full h-full object-cover"
                             onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ZoomIn size={12} className="text-white" />
                        </div>
                      </>
                  )}
                </button>
            )}
            <div className="min-w-0">
              <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[160px] block text-sm">{v}</span>
              {row.isDevis && (
                  <span className="text-xs text-amber-500 font-medium">{t('charges.isDevis')}</span>
              )}
            </div>
          </div>
      ),
    },
    {
      key: 'type', header: t('common.type'), sortable: true,
      render: (v: string) => (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[v] || TYPE_COLORS.other}`}>
          {t(`charges.type.${v}`, v)}
        </span>
      ),
    },
    {
      key: 'amount', header: t('charges.amountTTC'), sortable: true,
      render: (v: number, row: any) => (
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-gray-900 dark:text-white">{formatAmount(v, row.currency)}</span>
            <CurrencyBadge currency={row.currency} />
          </div>
      ),
    },
    {
      key: 'tva', header: t('charges.tva'),
      render: (v: number) => v ? `${v}%` : '—',
    },
    {
      key: 'source', header: t('charges.reference'),
      render: (v: string) => v
          ? <span className="text-sm text-gray-600 dark:text-gray-300">{v}</span>
          : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>,
    },
    {
      key: 'date', header: t('common.date'), sortable: true,
      render: (v: string) => v
          ? <span className="text-xs text-gray-400">{format(new Date(v), 'dd/MM/yyyy')}</span>
          : '—',
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
      <div className="space-y-4 sm:space-y-5" dir={dir}>

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {t('charges.title')}
            </h1>
            <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm mt-0.5">
              {filtered.length !== allCharges.length ? (
                  <><span className="text-blue-500 font-semibold">{filtered.length}</span> / {allCharges.length} {t('charges.count')}</>
              ) : (
                  <>{allCharges.length} {t('charges.count')}</>
              )}
              {devisCount > 0 && !hasFilters && (
                  <span className="text-amber-500 ms-1.5">· {devisCount} {t('charges.devisCount')}</span>
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
                onClick={() => {
                  setEditingId(null);
                  setForm(defaultForm);
                  setFormItems([]);
                  clearUpload();
                  setOcrItems([]);
                  setFormMode('manual');
                  setShowForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-500/20">
              <Plus size={16} /> {t('charges.new')}
            </button>
          </div>
        </div>

        {/* ── Stat chips (type filter) ── */}
        {allCharges.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                  onClick={() => setTypeFilter('all')}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${typeFilter === 'all' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                {t('common.all')} ({allCharges.length})
              </button>
              {CHARGE_TYPES.filter(type => totalByType[type] > 0).map(type => (
                  <button
                      key={type}
                      onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${typeFilter === type ? `${TYPE_COLORS[type]} border-current shadow-sm` : `bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300`}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${TYPE_DOT_COLORS[type]}`} />
                    {t(`charges.type.${type}`, type)} ({totalByType[type]})
                  </button>
              ))}
              {devisCount > 0 && (
                  <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-medium">
                    <FileText size={11} /> {devisCount} {t('charges.devisCount')}
                  </div>
              )}
            </div>
        )}

        {/* ── Toolbar ── */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search size={15} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('charges.searchPlaceholder')}
                className="w-full ps-10 pe-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
                <button onClick={() => setSearchQuery('')}
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={13} />
                </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Date filter toggle */}
            <button
                onClick={() => setShowFilters(f => !f)}
                className={`relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${showFilters || activeFiltersCount > 0 ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400' : 'bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'}`}>
              <SlidersHorizontal size={15} />
              <span className="hidden sm:inline">{t('common.filter')}</span>
              {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
              )}
            </button>

            {/* View toggle */}
            <div className="hidden sm:flex items-center gap-0.5 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                  title={t('clients.tableView')}>
                <List size={15} />
              </button>
              <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                  title={t('clients.cardView')}>
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Date Filter Panel ── */}
        {showFilters && (
            <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <CalendarRange size={14} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('clients.filterByDateTitle')}
            </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-500">{t('clients.dateFrom')}</label>
                  <input type="date" value={dateFilter.from}
                         onChange={e => setDateFilter(f => ({ ...f, from: e.target.value }))}
                         className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-500">{t('clients.dateTo')}</label>
                  <input type="date" value={dateFilter.to}
                         onChange={e => setDateFilter(f => ({ ...f, to: e.target.value }))}
                         className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all" />
                </div>
                {(dateFilter.from || dateFilter.to) && (
                    <button onClick={() => setDateFilter(defaultDateFilter)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800/40 transition-colors">
                      <X size={12} /> {t('clients.clearFilter')}
                    </button>
                )}
              </div>
            </div>
        )}

        {/* ── Active filters tags ── */}
        {hasFilters && (
            <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <SlidersHorizontal size={12} /> {t('clients.filtersActive')}
          </span>
              {searchQuery && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
              "{searchQuery}" <button onClick={() => setSearchQuery('')}><X size={11} /></button>
            </span>
              )}
              {typeFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
              {t(`charges.type.${typeFilter}`, typeFilter)} <button onClick={() => setTypeFilter('all')}><X size={11} /></button>
            </span>
              )}
              {(dateFilter.from || dateFilter.to) && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium">
              <Calendar size={10} /> {dateFilter.from || '…'} → {dateFilter.to || '…'}
                    <button onClick={() => setDateFilter(defaultDateFilter)}><X size={11} /></button>
            </span>
              )}
              <button
                  onClick={() => { setSearchQuery(''); setTypeFilter('all'); setDateFilter(defaultDateFilter); }}
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
            <EmptyState
                hasFilters={hasFilters}
                onCreate={() => {
                  setEditingId(null);
                  setForm(defaultForm);
                  setFormItems([]);
                  clearUpload();
                  setFormMode('manual');
                  setShowForm(true);
                }}
                t={t}
            />
        ) : (
            <>
              {/* Cards (mobile always, grid mode on desktop) */}
              <div className={`${viewMode === 'grid' ? 'block' : 'block sm:hidden'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginated.map((charge: any) => (
                      <ChargeCard
                          key={charge._id}
                          charge={charge}
                          t={t}
                          onView={setDetailCharge}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                          onPreview={c => openViewer(c.imageUrl, c.description)}
                          getImageSrc={getImageSrc}
                          isPdf={isPdf}
                      />
                  ))}
                </div>
              </div>

              {/* Table (list mode, desktop only) */}
              {viewMode === 'list' && (
                  <div className="hidden sm:block">
                    <DataTable
                        data={paginated}
                        columns={columns}
                        searchKeys={[]}
                        isLoading={false}
                        emptyMessage={t('charges.empty')}
                        onRowClick={(row) => setDetailCharge(row)}
                        actions={(row) => (
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                  onClick={e => { e.stopPropagation(); setDetailCharge(row); }}
                                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                  title={t('common.view')}>
                                <Eye size={14} />
                              </button>
                              <button
                                  onClick={e => { e.stopPropagation(); openEdit(row); }}
                                  className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                  title={t('common.edit')}>
                                <Pencil size={14} />
                              </button>
                              <button
                                  onClick={e => { e.stopPropagation(); handleDelete(row); }}
                                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title={t('common.delete')}>
                                <Trash2 size={14} />
                              </button>
                              <ChevronRight size={12} className="text-gray-300 dark:text-gray-600 ms-0.5" />
                            </div>
                        )}
                    />
                  </div>
              )}

              <Pagination
                  current={currentPage}
                  total={filtered.length}
                  pageSize={pageSize}
                  onPage={setCurrentPage}
                  onSizeChange={setPageSize}
                  t={t}
              />
            </>
        )}

        {/* ── Image Viewer ── */}
        {showViewer && viewerSrc && (
            <ImageViewer src={viewerSrc} fileName={viewerName} onClose={() => setShowViewer(false)} />
        )}

        {/* ═══════════════════════════════════════
          ── Detail Modal ──
      ═══════════════════════════════════════ */}
        {detailCharge && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir={dir}>
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDetailCharge(null)} />
              <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
                <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

                {/* Header */}
                <div className="px-5 pt-4 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex-shrink-0">
                      <Receipt size={20} className="text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-bold text-gray-900 dark:text-white truncate">
                          {detailCharge.description}
                        </h2>
                        {detailCharge.isDevis && (
                            <span className="text-xs bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                        {t('charges.isDevis')}
                      </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[detailCharge.type] || TYPE_COLORS.other}`}>
                      {t(`charges.type.${detailCharge.type}`, detailCharge.type)}
                    </span>
                        <CurrencyBadge currency={detailCharge.currency} />
                        {detailCharge.date && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar size={10} /> {format(new Date(detailCharge.date), 'dd/MM/yyyy')}
                      </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setDetailCharge(null)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400 shrink-0">
                    <X size={18} />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                  {/* Image preview */}
                  {detailCharge.imageUrl && !isPdf(detailCharge.imageUrl) && (
                      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <div className="relative cursor-zoom-in group"
                             onClick={() => openViewer(detailCharge.imageUrl, detailCharge.description)}>
                          <img src={getImageSrc(detailCharge.imageUrl)} alt={t('charges.receipt')}
                               className="w-full max-h-64 object-contain"
                               onError={(e) => {
                                 const img = e.target as HTMLImageElement;
                                 if (!img.src.startsWith('data:') && detailCharge.imageUrl.length > 100)
                                   img.src = `data:image/jpeg;base64,${detailCharge.imageUrl}`;
                                 else (img.parentElement as HTMLElement).style.display = 'none';
                               }} />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="bg-white/90 rounded-xl px-3 py-2 flex items-center gap-1.5 text-xs font-medium text-gray-800">
                              <ZoomIn size={14} /> {t('common.zoomIn')}
                            </div>
                          </div>
                        </div>
                        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
                          <ImageIcon size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-500 truncate flex-1">{t('charges.receipt')}</span>
                          <button onClick={() => openViewer(detailCharge.imageUrl, detailCharge.description)}
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">
                            <ZoomIn size={11} /> {t('common.view')}
                          </button>
                        </div>
                      </div>
                  )}

                  {detailCharge.imageUrl && isPdf(detailCharge.imageUrl) && (
                      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                            <File size={18} className="text-red-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('charges.pdfDocument')}</p>
                            <p className="text-xs text-gray-400">{t('charges.attachedReceipt')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {detailCharge.imageUrl.startsWith('http') && (
                              <a href={detailCharge.imageUrl} target="_blank" rel="noreferrer"
                                 className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 text-red-600 rounded-lg text-xs font-medium transition-colors">
                                <ExternalLink size={12} /> {t('common.open')}
                              </a>
                          )}
                          <a href={detailCharge.imageUrl} download
                             className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors">
                            <Download size={12} /> {t('common.download')}
                          </a>
                        </div>
                      </div>
                  )}

                  {/* Amounts */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">{t('charges.amountHT')}</p>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                        {formatAmount(detailCharge.amountHT || detailCharge.amount, detailCharge.currency)}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <p className="text-xs text-gray-500 font-medium mb-1">{t('charges.amountTTC')}</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatAmount(
                            detailCharge.amount + (detailCharge.tva ? (detailCharge.amountHT || detailCharge.amount) * detailCharge.tva / 100 : 0),
                            detailCharge.currency,
                        )}
                      </p>
                    </div>
                  </div>

                  {detailCharge.items?.length > 0 && (
                      <ItemsTable items={detailCharge.items} currency={detailCharge.currency} />
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {detailCharge.tva > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                          <p className="text-xs text-gray-400 mb-1">{t('charges.tva')}</p>
                          <p className="font-semibold text-gray-800 dark:text-gray-200">{detailCharge.tva}%</p>
                        </div>
                    )}
                    {detailCharge.source && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                          <p className="text-xs text-gray-400 mb-1">{t('charges.reference')}</p>
                          <p className="font-semibold text-gray-800 dark:text-gray-200">{detailCharge.source}</p>
                        </div>
                    )}
                    {detailCharge.createdByName && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                          <p className="text-xs text-gray-400 mb-1">{t('charges.createdBy')}</p>
                          <p className="font-semibold text-gray-800 dark:text-gray-200">{detailCharge.createdByName}</p>
                        </div>
                    )}
                    {detailCharge.createdAt && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                          <p className="text-xs text-gray-400 mb-1">{t('charges.createdAt')}</p>
                          <p className="font-semibold text-gray-800 dark:text-gray-200">
                            {format(new Date(detailCharge.createdAt), 'dd/MM/yyyy')}
                          </p>
                        </div>
                    )}
                  </div>

                  {detailCharge.notes && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800/30 rounded-xl p-3 text-xs text-yellow-800 dark:text-yellow-200">
                        <span className="font-semibold">{t('common.notes')} : </span>{detailCharge.notes}
                      </div>
                  )}
                </div>

                {/* Footer actions */}
                <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-2 shrink-0 bg-gray-50/50 dark:bg-gray-900">
                  <button
                      onClick={() => { setDetailCharge(null); openEdit(detailCharge); }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
                    <Pencil size={14} /> {t('common.edit')}
                  </button>
                  <button
                      onClick={() => { setDetailCharge(null); handleDelete(detailCharge); }}
                      className="px-4 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl text-sm font-medium transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* ═══════════════════════════════════════
          ── Form Modal ──
      ═══════════════════════════════════════ */}
        {showForm && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir={dir}>
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={resetForm} />
              <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
                <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

                {/* Header */}
                <div className="px-5 sm:px-6 pt-3 sm:pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/30">
                      <Receipt size={16} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                        {editingId ? t('charges.editTitle') : t('charges.newTitle')}
                      </h2>
                      {!editingId && (
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => setFormMode('manual')}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${formMode === 'manual' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                              <FileText size={11} /> {t('charges.modeManual')}
                            </button>
                            <button onClick={() => setFormMode('ocr')}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${formMode === 'ocr' ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                              <Sparkles size={11} /> {t('charges.modeOcr')}
                            </button>
                          </div>
                      )}
                    </div>
                  </div>
                  <button onClick={resetForm} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400">
                    <X size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">

                  {/* OCR Panel */}
                  {formMode === 'ocr' && !editingId && (
                      <div className="mb-4 space-y-3">
                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/30 rounded-xl p-3 text-xs text-purple-700 dark:text-purple-300 flex items-start gap-2">
                          <Sparkles size={14} className="flex-shrink-0 mt-0.5" />
                          <span>{t('charges.ocrHint')}</span>
                        </div>

                        <div className="flex gap-2">
                          <button onClick={() => setOcrMode('upload')}
                                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors border ${ocrMode === 'upload' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                            <Upload size={12} /> {t('charges.uploadFile')}
                          </button>
                          <button onClick={() => setOcrMode('url')}
                                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors border ${ocrMode === 'url' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                            <Link size={12} /> {t('charges.imageUrl')}
                          </button>
                        </div>

                        {ocrMode === 'upload' && (
                            <div>
                              <div
                                  onClick={() => fileInputRef.current?.click()}
                                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                  onDragLeave={() => setDragOver(false)}
                                  onDrop={handleDrop}
                                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all relative ${dragOver ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : hasUploadedFile ? 'border-purple-300 dark:border-purple-700 bg-purple-50/30 dark:bg-purple-900/10' : 'border-gray-300 dark:border-gray-700 hover:border-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-900/10'}`}>
                                {hasUploadedFile && (
                                    <button type="button" onClick={e => { e.stopPropagation(); clearUpload(); }}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs z-10 hover:bg-red-600">✕</button>
                                )}
                                {renderDropZoneContent()}
                              </div>
                              <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS} className="hidden" onChange={handleFileChange} />
                              {hasUploadedFile && (
                                  <button onClick={runOcrFromUpload} disabled={ocrLoading}
                                          className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl text-sm font-semibold transition-colors">
                                    {ocrLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    {ocrLoading ? t('charges.ocrRunning') : t('charges.extractWithOcr')}
                                  </button>
                              )}
                            </div>
                        )}

                        {ocrMode === 'url' && (
                            <div className="space-y-2">
                              <input value={ocrUrl} onChange={e => setOcrUrl(e.target.value)}
                                     placeholder="https://example.com/facture.pdf" className={inp} />
                              <button onClick={runOcrFromUrl} disabled={ocrLoading || !ocrUrl.trim()}
                                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl text-sm font-semibold transition-colors">
                                {ocrLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                {ocrLoading ? t('charges.ocrRunning') : t('charges.extractWithOcr')}
                              </button>
                            </div>
                        )}

                        {ocrItems.length > 0 && <ItemsTable items={ocrItems} currency={form.currency} />}

                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                          <span className="text-xs text-gray-400">{t('charges.orFillManually')}</span>
                          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                        </div>
                      </div>
                  )}

                  {/* Manual Form */}
                  <form onSubmit={handleSubmit} className="space-y-4" id="charge-form">

                    {formMode === 'manual' && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                            {t('charges.receipt')}
                          </label>
                          <div
                              onClick={() => fileInputRef.current?.click()}
                              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                              onDragLeave={() => setDragOver(false)}
                              onDrop={handleDrop}
                              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all relative ${dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700 hover:border-blue-400'}`}>
                            {imagePreview ? (
                                <div className="relative inline-block group">
                                  <img src={imagePreview} alt="preview" className="max-h-28 rounded-lg object-contain mx-auto" />
                                  <button type="button" onClick={e => { e.stopPropagation(); clearUpload(); }}
                                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✕</button>
                                </div>
                            ) : pdfFileName ? (
                                <div className="relative">
                                  <PdfPreview fileName={pdfFileName} />
                                  <button type="button" onClick={e => { e.stopPropagation(); clearUpload(); }}
                                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✕</button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-1.5 py-2">
                                  <Upload size={20} className="text-gray-400" />
                                  <p className="text-xs text-gray-500">{t('charges.dropOrClick')}</p>
                                  <p className="text-xs text-gray-400">JPG, PNG, PDF…</p>
                                </div>
                            )}
                          </div>
                          <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS} className="hidden" onChange={handleFileChange} />
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                          {t('charges.description')} <span className="text-red-400 normal-case font-normal">*</span>
                        </label>
                        <input required value={form.description}
                               onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                               placeholder={t('charges.descriptionPlaceholder')}
                               className={inp} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                          {t('charges.amountTTC')} <span className="text-red-400 normal-case font-normal">*</span>
                        </label>
                        <input required type="number" min={0} step={0.001} value={form.amount}
                               onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))}
                               className={inp} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                          {t('charges.tva')} (%)
                        </label>
                        <input type="number" min={0} max={100} value={form.tva}
                               onChange={e => setForm(f => ({ ...f, tva: +e.target.value }))}
                               className={inp} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                          {t('common.date')} <span className="text-red-400 normal-case font-normal">*</span>
                        </label>
                        <input required type="date" value={form.date}
                               onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                               className={inp} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                          {t('common.type')}
                        </label>
                        <select value={form.type}
                                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                className={inp}>
                          {CHARGE_TYPES.map(ct => (
                              <option key={ct} value={ct}>{t(`charges.type.${ct}`, ct)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                          {t('charges.currency')}
                        </label>
                        <select value={form.currency}
                                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                                className={inp}>
                          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                          {t('charges.reference')}
                        </label>
                        <input value={form.source}
                               onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                               placeholder={t('charges.referencePlaceholder')}
                               className={inp} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                          {t('common.notes')}
                        </label>
                        <input value={form.notes}
                               onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                               placeholder={t('charges.notesPlaceholder')}
                               className={inp} />
                      </div>
                    </div>

                    {form.tva > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2.5 flex items-center justify-between text-sm">
                          <span className="text-gray-500">{t('charges.amountTTC')}</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                      {formatAmount(form.amount * (1 + form.tva / 100), form.currency)}
                    </span>
                        </div>
                    )}

                    {/* isDevis toggle */}
                    <div
                        className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${form.isDevis ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700'}`}
                        onClick={() => setForm(f => ({ ...f, isDevis: !f.isDevis }))}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${form.isDevis ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                          <FileText size={15} className="text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {form.isDevis ? t('charges.isDevis') : t('charges.notDevis')}
                          </p>
                          <p className="text-xs text-gray-400">{t('charges.devisHint')}</p>
                        </div>
                      </div>
                      <div className={`w-11 h-6 rounded-full transition-all relative ${form.isDevis ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isDevis ? 'start-6' : 'start-1'}`} />
                      </div>
                    </div>

                    <div className="pt-1">
                      <ItemsEditor items={formItems} currency={form.currency} onChange={setFormItems} />
                    </div>
                  </form>
                </div>

                {/* Footer actions */}
                <div className="px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 shrink-0 bg-gray-50/50 dark:bg-gray-900">
                  <button type="button" onClick={resetForm}
                          className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    {t('common.cancel')}
                  </button>
                  <button
                      type="submit"
                      form="charge-form"
                      disabled={createMut.isPending || updateMut.isPending}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-500/20">
                    {createMut.isPending || updateMut.isPending
                        ? t('common.saving')
                        : editingId ? t('common.edit') : t('charges.addCharge')}
                  </button>
                </div>
              </div>
            </div>
        )}

        <ConfirmDialog {...confirmState} onProceed={proceed} onCancel={cancel} />
      </div>
  );
};

export default ChargesPage;