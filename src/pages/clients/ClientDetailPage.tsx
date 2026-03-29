import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '../../api';
import { paymentVenteApi } from '../../api';
import {
  ArrowLeft, Phone, Mail, MapPin, TrendingUp, ShoppingCart, CreditCard, Download,
  Package, ChevronRight, ChevronLeft, Filter, Pencil, Trash2, X, Save,
  UserCheck, UserX, Calendar, BarChart3, Wallet, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

const formatTND = (v: number) => `${(v || 0).toFixed(3)} TND`;
const todayStr  = () => new Date().toISOString().split('T')[0];

// ─────────────────────────────────────────────────────────────────────────────
const ClientDetailPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate      = useNavigate();
  const { t, i18n }  = useTranslation();
  const dir           = i18n.language === 'ar' ? 'rtl' : 'ltr';

  const statusConfig: Record<string, { label: string; cls: string }> = {
    paid:    { label: t('sales.status.paid'),    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    partial: { label: t('sales.status.partial'), cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    pending: { label: t('sales.status.pending'), cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  };

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedSale,    setSelectedSale]    = useState<any>(null);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate,   setExportEndDate]   = useState('');
  const [exportQuick,     setExportQuick]     = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate,   setFilterEndDate]   = useState('');
  const [filterQuick,     setFilterQuick]     = useState('');
  const [payFilterStart,  setPayFilterStart]  = useState('');
  const [payFilterEnd,    setPayFilterEnd]    = useState('');
  const [payFilterQuick,  setPayFilterQuick]  = useState('');
  const [editingPayment,  setEditingPayment]  = useState<any>(null);
  const [editAmount,      setEditAmount]      = useState('');
  const [editNote,        setEditNote]        = useState('');

  const queryClient = useQueryClient();

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updatePaymentMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { amount?: number; note?: string } }) =>
        paymentVenteApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-stats', clientId] });
      setEditingPayment(null);
      toast.success('Paiement modifié');
    },
    onError: () => toast.error(t('error.generic')),
  });

  const deletePaymentMut = useMutation({
    mutationFn: (id: string) => paymentVenteApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-stats', clientId] });
      toast.success(t('common.delete'));
    },
    onError: () => toast.error(t('error.generic')),
  });

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: detailClient, isLoading: clientLoading } = useQuery({
    queryKey: ['client-detail', clientId],
    queryFn:  () => clientsApi.getOne(clientId!),
    enabled:  !!clientId,
  });

  const { data: clientStats, isLoading: statsLoading } = useQuery({
    queryKey: ['client-stats', clientId],
    queryFn:  () => clientsApi.getStats(clientId!),
    enabled:  !!clientId,
  });

  useEffect(() => {
    setSelectedSale(null);
    setExportStartDate(''); setExportEndDate(''); setExportQuick('');
    setFilterStartDate(''); setFilterEndDate(''); setFilterQuick('');
    setPayFilterStart('');  setPayFilterEnd('');  setPayFilterQuick('');
  }, [clientId]);

  // ── Filtered data ──────────────────────────────────────────────────────────
  const filteredSales = useMemo(() => {
    const sales: any[] = clientStats?.recentSales || [];
    if (!filterStartDate && !filterEndDate) return sales;
    return sales.filter((s) => {
      if (!s.createdAt) return false;
      const d = new Date(s.createdAt).toISOString().split('T')[0];
      if (filterStartDate && d < filterStartDate) return false;
      if (filterEndDate   && d > filterEndDate)   return false;
      return true;
    });
  }, [clientStats?.recentSales, filterStartDate, filterEndDate]);

  const filteredPayments = useMemo(() => {
    const payments: any[] = clientStats?.payments || [];
    if (!payFilterStart && !payFilterEnd) return payments;
    return payments.filter((p) => {
      const d = p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : null;
      if (!d) return false;
      if (payFilterStart && d < payFilterStart) return false;
      if (payFilterEnd   && d > payFilterEnd)   return false;
      return true;
    });
  }, [clientStats?.payments, payFilterStart, payFilterEnd]);

  // ── Quick dates ────────────────────────────────────────────────────────────
  const buildQuickDates = (period: string) => {
    const end   = todayStr();
    const start = new Date();
    switch (period) {
      case '1d': start.setDate(start.getDate() - 1);         break;
      case '3d': start.setDate(start.getDate() - 3);         break;
      case '7d': start.setDate(start.getDate() - 7);         break;
      case '1m': start.setMonth(start.getMonth() - 1);       break;
      case '3m': start.setMonth(start.getMonth() - 3);       break;
      case '6m': start.setMonth(start.getMonth() - 6);       break;
      case '1y': start.setFullYear(start.getFullYear() - 1); break;
      default: return null;
    }
    return { start: start.toISOString().split('T')[0], end };
  };

  const applyExportQuick    = (k: string) => { const d = buildQuickDates(k); if (!d) return; setExportStartDate(d.start); setExportEndDate(d.end); setExportQuick(k); };
  const applyFilterQuick    = (k: string) => { const d = buildQuickDates(k); if (!d) return; setFilterStartDate(d.start); setFilterEndDate(d.end); setFilterQuick(k); };
  const applyPayFilterQuick = (k: string) => { const d = buildQuickDates(k); if (!d) return; setPayFilterStart(d.start); setPayFilterEnd(d.end); setPayFilterQuick(k); };

  const clearFilterDates    = () => { setFilterStartDate(''); setFilterEndDate(''); setFilterQuick(''); };
  const clearPayFilterDates = () => { setPayFilterStart('');  setPayFilterEnd('');  setPayFilterQuick(''); };

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = async (fmt: string) => {
    if (!exportStartDate || !exportEndDate) { toast.error(t('common.required')); return; }
    try {
      const blob = await clientsApi.exportBilan(clientId!, { startDate: exportStartDate, endDate: exportEndDate, format: fmt });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `bilan-${detailClient?.name}-${exportStartDate}-${exportEndDate}.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error(t('error.generic')); }
  };

  // ── Reusable components ────────────────────────────────────────────────────
  const inputCls = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all';

  const quickPeriods = [
    { key: '1d', label: '1j' }, { key: '3d', label: '3j' }, { key: '7d', label: '7j' },
    { key: '1m', label: '1m' }, { key: '3m', label: '3m' }, { key: '6m', label: '6m' },
    { key: '1y', label: '1an' },
  ];

  const QuickButtons = ({ active, onApply }: { active: string; onApply: (k: string) => void }) => (
      <div className="flex gap-1 flex-wrap">
        {quickPeriods.map(({ key, label }) => (
            <button key={key} onClick={() => onApply(key)}
                    className={`px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                        active === key
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}>
              {label}
            </button>
        ))}
      </div>
  );

  const DateRow = ({ from, to, setFrom, setTo, clearQuick }: any) => (
      <div className="flex gap-2 items-center">
        <input type="date" value={from} max={to || todayStr()}
               onChange={e => { setFrom(e.target.value); clearQuick(); }}
               className={inputCls} />
        <span className="text-gray-400 text-xs shrink-0">→</span>
        <input type="date" value={to} min={from} max={todayStr()}
               onChange={e => { setTo(e.target.value); clearQuick(); }}
               className={inputCls} />
      </div>
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (clientLoading) return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
  );

  const totalRevenue = clientStats?.totalRevenue || 0;
  const totalPaid    = clientStats?.totalPaid    || 0;
  const totalCredit  = clientStats?.totalCredit  || 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
      <div className="space-y-4" dir={dir}>

        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/clients')}
                      className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <ArrowLeft size={15} />
              </button>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white text-base font-bold">
                {(detailClient?.name || '?').charAt(0).toUpperCase()}
              </span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {detailClient?.name}{detailClient?.firstName ? ` ${detailClient.firstName}` : ''}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                  {detailClient?.phone  && <span className="flex items-center gap-1 text-xs text-gray-400"><Phone size={10} />{detailClient.phone}</span>}
                  {detailClient?.email  && <span className="flex items-center gap-1 text-xs text-gray-400"><Mail size={10} />{detailClient.email}</span>}
                  {detailClient?.sector && <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin size={10} />{detailClient.sector}</span>}
                </div>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${
                detailClient?.isActive
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            }`}>
            {detailClient?.isActive ? <UserCheck size={10} /> : <UserX size={10} />}
              {detailClient?.isActive ? t('common.active') : t('common.inactive')}
          </span>
          </div>

          {/* ── KPI row ── */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            {statsLoading ? (
                [1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)
            ) : [
              { label: t('dashboard.totalRevenue'), value: formatTND(totalRevenue), icon: BarChart3,   color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20'    },
              { label: t('sales.paid'),              value: formatTND(totalPaid),    icon: Wallet,      color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { label: t('clients.creditUsed'),      value: formatTND(totalCredit),  icon: CreditCard,  color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20'  },
            ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                    <Icon size={16} className={color} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{value}</p>
                  </div>
                </div>
            ))}
          </div>

          {/* ── Credit bar ── */}
          {clientStats?.client?.creditLimit > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <CreditCard size={11} /> {t('clients.creditLimit')}
              </span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {formatTND(clientStats.client.creditUsed || 0)} / {formatTND(clientStats.client.creditLimit)}
              </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                  <div className="bg-amber-500 h-1.5 rounded-full transition-all"
                       style={{ width: `${Math.min(100, ((clientStats.client.creditUsed || 0) / clientStats.client.creditLimit) * 100)}%` }} />
                </div>
              </div>
          )}
        </div>

        {/* ── MAIN GRID : 2 colonnes desktop ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ── COL LEFT : Achats ─────────────────────────────────────────────── */}
          <div className="space-y-3">

            {/* Filtre achats */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Filter size={13} className="text-gray-400" /> {t('common.filter')}
                </h3>
                {(filterStartDate || filterEndDate) && (
                    <button onClick={clearFilterDates} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-0.5">
                      <X size={11} /> {t('common.reset')}
                    </button>
                )}
              </div>
              <QuickButtons active={filterQuick} onApply={applyFilterQuick} />
              <div className="mt-2">
                <DateRow from={filterStartDate} to={filterEndDate}
                         setFrom={setFilterStartDate} setTo={setFilterEndDate}
                         clearQuick={() => setFilterQuick('')} />
              </div>
            </div>

            {/* Liste achats */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <ShoppingCart size={13} className="text-gray-400" /> {t('nav.purchases')}
                </h3>
                {clientStats?.count > 0 && (
                    <span className="text-xs text-gray-400">
                  {filteredSales.length}{filterStartDate || filterEndDate ? ` / ${clientStats.count}` : ''}
                </span>
                )}
              </div>
              <div className="p-3">
                {statsLoading ? (
                    <div className="space-y-2">
                      {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
                    </div>
                ) : filteredSales.length === 0 ? (
                    <div className="text-center py-8">
                      <Package size={28} className="text-gray-200 dark:text-gray-700 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">{filterStartDate || filterEndDate ? t('common.noData') : t('clients.noSales')}</p>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                      {filteredSales.map((s: any) => (
                          <button key={s._id} onClick={() => setSelectedSale(s)}
                                  className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/10 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all text-left">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{formatTND(s.totalTTC)}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {s.createdAt ? format(new Date(s.createdAt), 'dd/MM/yyyy') : '—'}
                                {s.items?.length > 0 && ` · ${s.items.length} art.`}
                                {s.amountRemaining > 0 && <span className="text-red-500"> · -{formatTND(s.amountRemaining)}</span>}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ms-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusConfig[s.status]?.cls || ''}`}>
                          {statusConfig[s.status]?.label || s.status}
                        </span>
                              <ChevronRight size={12} className="text-gray-400 rtl:rotate-180" />
                            </div>
                          </button>
                      ))}
                    </div>
                )}
              </div>
            </div>
          </div>

          {/* ── COL RIGHT : Paiements ─────────────────────────────────────────── */}
          <div className="space-y-3">

            {/* Filtre paiements */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Calendar size={13} className="text-gray-400" /> {t('sales.addPayment')}
                </h3>
                {(payFilterStart || payFilterEnd) && (
                    <button onClick={clearPayFilterDates} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-0.5">
                      <X size={11} /> {t('common.reset')}
                    </button>
                )}
              </div>
              <QuickButtons active={payFilterQuick} onApply={applyPayFilterQuick} />
              <div className="mt-2">
                <DateRow from={payFilterStart} to={payFilterEnd}
                         setFrom={setPayFilterStart} setTo={setPayFilterEnd}
                         clearQuick={() => setPayFilterQuick('')} />
              </div>
            </div>

            {/* Table paiements */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Wallet size={13} className="text-gray-400" /> Paiements
                </h3>
                {clientStats?.payments?.length > 0 && (
                    <span className="text-xs text-gray-400">
                  {filteredPayments.length}{payFilterStart || payFilterEnd ? ` / ${clientStats.payments.length}` : ''}
                </span>
                )}
              </div>

              {statsLoading ? (
                  <div className="p-3 space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
                  </div>
              ) : filteredPayments.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard size={28} className="text-gray-200 dark:text-gray-700 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">{t('common.noData')}</p>
                  </div>
              ) : (
                  <table className="w-full text-sm">
                    <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('common.date')}</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Montant</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">{t('common.notes')}</th>
                      <th className="px-2 py-2 w-14" />
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredPayments.map((p: any, idx: number) => (
                        <tr key={p._id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          {editingPayment?._id === p._id ? (
                              <>
                                <td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">
                                  {p.createdAt ? format(new Date(p.createdAt), 'dd/MM/yy HH:mm') : '—'}
                                </td>
                                <td className="px-2 py-1.5">
                                  <input type="number" step="0.001" min="0.001" value={editAmount}
                                         onChange={e => setEditAmount(e.target.value)}
                                         className="w-full px-2 py-1.5 rounded-lg border border-emerald-400 bg-white dark:bg-gray-800 text-sm font-bold text-right text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/25" />
                                </td>
                                <td className="px-2 py-1.5 hidden sm:table-cell">
                                  <input type="text" value={editNote} onChange={e => setEditNote(e.target.value)}
                                         placeholder="Note..."
                                         className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/25 text-gray-900 dark:text-white" />
                                </td>
                                <td className="px-2 py-1.5">
                                  <div className="flex gap-1 justify-end">
                                    <button onClick={() => updatePaymentMut.mutate({ id: p._id, data: { amount: parseFloat(editAmount), note: editNote } })}
                                            disabled={updatePaymentMut.isPending || !editAmount || parseFloat(editAmount) <= 0}
                                            className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 transition-colors">
                                      <Save size={11} />
                                    </button>
                                    <button onClick={() => setEditingPayment(null)}
                                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                      <X size={11} />
                                    </button>
                                  </div>
                                </td>
                              </>
                          ) : (
                              <>
                                <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                  {p.createdAt ? format(new Date(p.createdAt), 'dd/MM/yy HH:mm') : '—'}
                                </td>
                                <td className="px-3 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap text-sm">
                                  +{formatTND(p.amount)}
                                </td>
                                <td className="px-3 py-2.5 text-xs text-gray-400 italic hidden sm:table-cell truncate max-w-[100px]">
                                  {p.note || '—'}
                                </td>
                                <td className="px-2 py-2.5">
                                  <div className="flex gap-1 justify-end">
                                    <button onClick={() => { setEditingPayment(p); setEditAmount(String(p.amount)); setEditNote(p.note || ''); }}
                                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title={t('common.edit')}>
                                      <Pencil size={11} />
                                    </button>
                                    <button onClick={() => { if (window.confirm(t('common.confirm_delete'))) deletePaymentMut.mutate(p._id); }}
                                            disabled={deletePaymentMut.isPending}
                                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors" title={t('common.delete')}>
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </td>
                              </>
                          )}
                        </tr>
                    ))}
                    </tbody>
                    <tfoot>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                      <td className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('common.total')}</td>
                      <td className="px-3 py-2 text-right text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {formatTND(filteredPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0))}
                      </td>
                      <td className="hidden sm:table-cell" /><td />
                    </tr>
                    </tfoot>
                  </table>
              )}
            </div>
          </div>
        </div>

        {/* ── EXPORT ─────────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 mb-3">
            <Download size={13} className="text-gray-400" /> {t('common.export')} — Bilan client
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 space-y-2">
              <QuickButtons active={exportQuick} onApply={applyExportQuick} />
              <DateRow from={exportStartDate} to={exportEndDate}
                       setFrom={setExportStartDate} setTo={setExportEndDate}
                       clearQuick={() => setExportQuick('')} />
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => handleExport('pdf')} disabled={!exportStartDate || !exportEndDate}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 dark:disabled:bg-red-900/40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-all active:scale-95">
                <Download size={13} /> PDF
              </button>
              <button onClick={() => handleExport('xlsx')} disabled={!exportStartDate || !exportEndDate}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 dark:disabled:bg-emerald-900/40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-all active:scale-95">
                <Download size={13} /> Excel
              </button>
            </div>
          </div>
        </div>

        {/* ── SALE DETAIL MODAL ──────────────────────────────────────────────── */}
        {selectedSale && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir={dir}>
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedSale(null)} />
              <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg mx-0 sm:mx-4 max-h-[90vh] overflow-y-auto">
                <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

                {/* Modal header */}
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedSale(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-400">
                      <ChevronLeft size={16} className="rtl:rotate-180" />
                    </button>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t('sales.invoice')}</h2>
                      <p className="text-xs text-gray-400">
                        {selectedSale.createdAt ? format(new Date(selectedSale.createdAt), "dd/MM/yyyy 'à' HH:mm") : '—'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusConfig[selectedSale.status]?.cls || ''}`}>
                {statusConfig[selectedSale.status]?.label || selectedSale.status}
              </span>
                </div>

                <div className="p-4 space-y-4">
                  {/* Résumé financier */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: t('sales.totalTTC'),        value: formatTND(selectedSale.totalTTC),        cls: 'text-blue-600'    },
                      { label: t('sales.paid'),             value: formatTND(selectedSale.amountPaid),      cls: 'text-emerald-600' },
                      { label: t('sales.remaining'),        value: formatTND(selectedSale.amountRemaining), cls: selectedSale.amountRemaining > 0 ? 'text-red-500' : 'text-gray-400' },
                    ].map(({ label, value, cls }) => (
                        <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5 text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
                          <p className={`text-sm font-bold ${cls}`}>{value}</p>
                        </div>
                    ))}
                  </div>

                  {/* Produits */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Package size={12} /> {t('products.title')}
                    </h3>
                    <div className="space-y-1.5">
                      {(selectedSale.items || []).map((item: any, idx: number) => (
                          <div key={idx} className="flex items-start justify-between p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.productName}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {item.quantity} × {formatTND(item.unitPrice)}
                                {item.tva > 0 && <span className="ms-1.5 text-purple-500">TVA {item.tva}%</span>}
                              </p>
                            </div>
                            <div className="text-right shrink-0 ms-3">
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{formatTND(item.totalTTC)}</p>
                              {item.tva > 0 && <p className="text-xs text-gray-400">HT: {formatTND(item.totalHT)}</p>}
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>

                  {/* Totaux */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{t('sales.totalHT')}</span><span>{formatTND(selectedSale.totalHT)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>TVA</span><span>{formatTND(selectedSale.totalTTC - selectedSale.totalHT)}</span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-1.5 flex justify-between text-sm font-bold text-gray-900 dark:text-white">
                      <span>{t('sales.totalTTC')}</span><span>{formatTND(selectedSale.totalTTC)}</span>
                    </div>
                  </div>

                  {/* Historique paiements */}
                  {(selectedSale.payments || []).length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <CreditCard size={12} /> {t('sales.addPayment')}
                        </h3>
                        <div className="space-y-1.5">
                          {selectedSale.payments.map((p: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-2.5 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
                                <div>
                                  <p className="text-xs text-gray-500">{p.date ? format(new Date(p.date), "dd/MM/yyyy 'à' HH:mm") : '—'}</p>
                                  {p.note && <p className="text-xs text-gray-400 italic mt-0.5">{p.note}</p>}
                                </div>
                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+{formatTND(p.amount)}</p>
                              </div>
                          ))}
                        </div>
                      </div>
                  )}

                  {/* Notes */}
                  {selectedSale.notes && (
                      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl p-3">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 uppercase tracking-wide">{t('common.notes')}</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{selectedSale.notes}</p>
                      </div>
                  )}
                </div>
              </div>
            </div>
        )}
      </div>
  );
};

export default ClientDetailPage;