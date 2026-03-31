import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accountingApi } from '@/api';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp, TrendingDown, Scale, Receipt, Calendar, RefreshCw,
  DollarSign, FileText, CreditCard, Info, PieChart, Minus
} from 'lucide-react';
import { format } from 'date-fns';
import { TFunction } from 'i18next';

// Types
interface AccountingSummary {
  period: {
    startDate: string;
    endDate: string;
  };
  revenue: {
    totalHT: number;
    totalTTC: number;
    totalPaid: number;
    totalRemaining: number;
    invoiceCount: number;
  };
  purchases: {
    totalHT: number;
    totalTTC: number;
    totalPaid: number;
    count: number;
  };
  charges: {
    total: number;
    byType: Record<string, number>;
  };
  tva: {
    collected: number;
    deductible: number;
    balance: number;
  };
  profit: {
    grossProfit: number;
    netProfit: number;
  };
}

type TrendType = 'up' | 'down' | 'neutral';

const formatTND = (v: number) => `${(v || 0).toFixed(3)} TND`;

// ── Metric Card Component ──────────────────────────────────────────────────────
const MetricCard: React.FC<{
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  isLoading: boolean;
  dir?: string;
  trend?: TrendType;
}> = ({ title, value, sub, icon: Icon, color, isLoading, dir = 'ltr', trend }) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;

  return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all duration-200 group">
        <div className={`flex items-${dir === 'rtl' ? 'start' : 'start'} justify-between mb-3`}>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <div className={`p-2 rounded-xl ${color} group-hover:scale-110 transition-transform`}>
            <Icon size={18} className="text-white" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {isLoading ? '...' : value}
          </p>
          {trend && TrendIcon && (
              <TrendIcon size={16} className={trend === 'up' ? 'text-emerald-500' : 'text-red-500'} />
          )}
        </div>
        {sub && (
            <p className="text-xs text-gray-400 mt-0.5">
              {isLoading ? '...' : sub}
            </p>
        )}
      </div>
  );
};

// ── Info Row Component ─────────────────────────────────────────────────────────
const InfoRow: React.FC<{
  label: string;
  value: string;
  highlight?: boolean;
  highlightColor?: string;
  isLoading: boolean;
  icon?: React.ElementType;
}> = ({ label, value, highlight, highlightColor = 'text-emerald-600', isLoading, icon: Icon }) => (
    <div className={`flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0 ${highlight ? 'bg-gray-50 dark:bg-gray-800 rounded-xl px-3 -mx-3' : ''}`}>
    <span className={`flex items-center gap-2 text-sm ${highlight ? 'font-semibold text-gray-700 dark:text-gray-300' : 'text-gray-600 dark:text-gray-400'}`}>
      {Icon && <Icon size={14} className="text-gray-400" />}
      {label}
    </span>
      <span className={`font-medium text-sm ${highlight ? highlightColor : 'text-gray-900 dark:text-white'}`}>
      {isLoading ? '...' : value}
    </span>
    </div>
);

// ── Profit Breakdown Component ─────────────────────────────────────────────────
const ProfitBreakdown: React.FC<{
  revenueHT: number;
  purchasesHT: number;
  charges: number;
  netProfit: number;
  isLoading: boolean;
  t: TFunction;
  dir?: string;
}> = ({ revenueHT, purchasesHT, charges, netProfit, isLoading, t, dir = 'ltr' }) => {
  const grossProfit = revenueHT - purchasesHT;

  if (isLoading) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-40" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
            <Scale size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {t('accounting.profitBreakdown')}
          </h2>
        </div>

        <div className="space-y-2">
          {/* CA HT */}
          <div className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
            {t('accounting.revenueHT')}
          </span>
            <span className="font-medium text-gray-900 dark:text-white">
            {formatTND(revenueHT)}
          </span>
          </div>

          {/* Achats HT */}
          <div className="flex items-center justify-between py-2 pl-4">
          <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Minus size={12} className="text-red-400" />
            {t('accounting.purchasesHT')}
          </span>
            <span className="font-medium text-red-500 dark:text-red-400">
            -{formatTND(purchasesHT)}
          </span>
          </div>

          {/* Ligne de séparation */}
          <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-2" />

          {/* Bénéfice brut */}
          <div className="flex items-center justify-between py-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg px-3 -mx-1">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            = {t('accounting.grossProfit')}
          </span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
            {formatTND(grossProfit)}
          </span>
          </div>

          {/* Charges */}
          <div className="flex items-center justify-between py-2 pl-4">
          <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Minus size={12} className="text-red-400" />
            {t('accounting.charges')}
          </span>
            <span className="font-medium text-red-500 dark:text-red-400">
            -{formatTND(charges)}
          </span>
          </div>

          {/* Ligne de séparation */}
          <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-2" />

          {/* Bénéfice net */}
          <div className={`flex items-center justify-between py-3 rounded-xl px-3 -mx-1 transition-all ${
              netProfit >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800'
          }`}>
          <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-lg">=</span>
            {t('accounting.netProfit')}
          </span>
            <span className={`font-bold text-lg ${
                netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}>
            {formatTND(netProfit)}
          </span>
          </div>
        </div>

        {/* Note explicative */}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-start gap-2 text-xs text-gray-400 dark:text-gray-500">
            <Info size={12} className="shrink-0 mt-0.5" />
            <p>{t('accounting.profitNote')}</p>
          </div>
        </div>
      </div>
  );
};

// ── TVA Alert Card ─────────────────────────────────────────────────────────────
const TVAAlert: React.FC<{
  toPay: number;
  toRefund: number;
  balance: number;
  isLoading: boolean;
}> = ({ toPay, toRefund, balance, isLoading }) => {
  if (isLoading) return null;

  if (toPay > 0) {
    return (
        <div className="mt-4 bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-sm text-red-700 dark:text-red-400 flex items-start gap-2 border border-red-100 dark:border-red-800">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="font-semibold">{toPay.toFixed(3)} TND</p>
            <p className="text-xs opacity-80">TVA à payer pour cette période</p>
          </div>
        </div>
    );
  }

  if (toRefund > 0) {
    return (
        <div className="mt-4 bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-sm text-green-700 dark:text-green-400 flex items-start gap-2 border border-green-100 dark:border-green-800">
          <span className="text-lg">✓</span>
          <div>
            <p className="font-semibold">{toRefund.toFixed(3)} TND</p>
            <p className="text-xs opacity-80">Crédit TVA récupérable</p>
          </div>
        </div>
    );
  }

  if (balance === 0) {
    return (
        <div className="mt-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-sm text-gray-500 dark:text-gray-400 flex items-start gap-2 border border-gray-100 dark:border-gray-700">
          <span className="text-lg">✓</span>
          <div>
            <p className="font-semibold">TVA équilibrée</p>
            <p className="text-xs opacity-80">Collecte = Déductible</p>
          </div>
        </div>
    );
  }

  return null;
};

// ── Date Range Picker ─────────────────────────────────────────────────────────
const DateRangePicker: React.FC<{
  startDate: string;
  endDate: string;
  onStartChange: (date: string) => void;
  onEndChange: (date: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  t: TFunction;
  dir?: string;
}> = ({ startDate, endDate, onStartChange, onEndChange, onRefresh, isRefreshing, t, dir = 'ltr' }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return (
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Calendar size={14} className={`absolute ${dir === 'rtl' ? 'end-3' : 'start-3'} top-1/2 -translate-y-1/2 text-gray-400`} />
              <input
                  type="date"
                  value={startDate}
                  onChange={e => onStartChange(e.target.value)}
                  className={`w-full ${dir === 'rtl' ? 'pe-8' : 'ps-8'} px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              />
            </div>
            <span className="text-gray-400 text-xs">{t('common.to')}</span>
            <div className="relative flex-1">
              <Calendar size={14} className={`absolute ${dir === 'rtl' ? 'end-3' : 'start-3'} top-1/2 -translate-y-1/2 text-gray-400`} />
              <input
                  type="date"
                  value={endDate}
                  onChange={e => onEndChange(e.target.value)}
                  className={`w-full ${dir === 'rtl' ? 'pe-8' : 'ps-8'} px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              />
            </div>
          </div>
          <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            {t('common.refresh')}
          </button>
        </div>
    );
  }

  return (
      <div className="flex items-center gap-3">
        <div className="relative">
          <Calendar size={14} className={`absolute ${dir === 'rtl' ? 'end-3' : 'start-3'} top-1/2 -translate-y-1/2 text-gray-400`} />
          <input
              type="date"
              value={startDate}
              onChange={e => onStartChange(e.target.value)}
              className={`${dir === 'rtl' ? 'pe-8' : 'ps-8'} px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
          />
        </div>
        <span className="text-gray-400 text-sm">{t('common.to')}</span>
        <div className="relative">
          <Calendar size={14} className={`absolute ${dir === 'rtl' ? 'end-3' : 'start-3'} top-1/2 -translate-y-1/2 text-gray-400`} />
          <input
              type="date"
              value={endDate}
              onChange={e => onEndChange(e.target.value)}
              className={`${dir === 'rtl' ? 'pe-8' : 'ps-8'} px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
          />
        </div>
        <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            title={t('common.refresh')}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>
  );
};

// ── Charges Breakdown Component ────────────────────────────────────────────────
const ChargesBreakdown: React.FC<{
  chargesByType: Record<string, number>;
  totalCharges: number;
  isLoading: boolean;
  t: TFunction;
}> = ({ chargesByType, totalCharges, isLoading, t }) => {
  if (isLoading) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-32" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-8 bg-gray-100 dark:bg-gray-800 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
    );
  }

  if (Object.keys(chargesByType).length === 0) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/30">
              <Receipt size={18} className="text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {t('accounting.chargesBreakdown')}
            </h2>
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Receipt size={32} className="text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('charges.empty')}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Aucune charge enregistrée pour cette période
            </p>
          </div>
        </div>
    );
  }

  const sortedTypes = Object.entries(chargesByType).sort((a, b) => b[1] - a[1]);

  return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/30">
            <PieChart size={18} className="text-orange-600 dark:text-orange-400" />
          </div>
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {t('accounting.chargesBreakdown')}
          </h2>
        </div>

        <div className="space-y-2">
          {sortedTypes.map(([type, amount]) => {
            const percentage = (amount / totalCharges) * 100;
            return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 capitalize">
                  {t(`charges.type.${type}`, type)}
                </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                  {formatTND(amount)}
                </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div
                        className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t('common.total')}
          </span>
            <span className="font-bold text-lg text-orange-600 dark:text-orange-400">
            {formatTND(totalCharges)}
          </span>
          </div>
        </div>
      </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
const AccountingPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set default dates (current month)
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(format(firstDay, 'yyyy-MM-dd'));
    setEndDate(format(lastDay, 'yyyy-MM-dd'));
  }, []);

  const { data, isLoading, refetch, isRefetching } = useQuery<AccountingSummary>({
    queryKey: ['accounting', startDate, endDate],
    queryFn: () => accountingApi.getSummary({ startDate, endDate }),
    enabled: !!startDate && !!endDate,
  });

  const tvaToPay = (data?.tva?.balance || 0) > 0 ? (data?.tva?.balance || 0) : 0;
  const tvaToRefund = (data?.tva?.balance || 0) < 0 ? Math.abs(data?.tva?.balance || 0) : 0;

  const netProfit = data?.profit?.netProfit || 0;
  const grossProfit = data?.profit?.grossProfit || 0;
  const revenueHT = data?.revenue?.totalHT || 0;
  const purchasesHT = data?.purchases?.totalHT || 0;
  const totalCharges = data?.charges?.total || 0;
  const revenueTTC = data?.revenue?.totalTTC || 0;
  const purchasesTTC = data?.purchases?.totalTTC || 0;
  const totalPaid = data?.revenue?.totalPaid || 0;
  const totalRemaining = data?.revenue?.totalRemaining || 0;
  const tvaCollected = data?.tva?.collected || 0;
  const tvaDeductible = data?.tva?.deductible || 0;
  const tvaBalance = data?.tva?.balance || 0;
  const invoiceCount = data?.revenue?.invoiceCount || 0;
  const purchaseCount = data?.purchases?.count || 0;

  const metrics = [
    {
      title: t('accounting.revenueHT'),
      value: formatTND(revenueHT),
      sub: `${t('accounting.collected')}: ${formatTND(totalPaid)}`,
      icon: TrendingUp,
      color: 'bg-blue-600',
      trend: 'up' as TrendType
    },
    {
      title: t('accounting.purchasesHT'),
      value: formatTND(purchasesHT),
      sub: `${t('purchases.amountPaid')}: ${formatTND(data?.purchases?.totalPaid || 0)}`,
      icon: TrendingDown,
      color: 'bg-violet-600',
      trend: 'down' as TrendType
    },
    {
      title: t('accounting.charges'),
      value: formatTND(totalCharges),
      icon: Receipt,
      color: 'bg-orange-500'
    },
    {
      title: t('accounting.netProfit'),
      value: formatTND(netProfit),
      sub: `${t('accounting.grossProfit')}: ${formatTND(grossProfit)}`,
      icon: Scale,
      color: netProfit >= 0 ? 'bg-emerald-600' : 'bg-red-500',
      trend: netProfit >= 0 ? ('up' as TrendType) : ('down' as TrendType)
    }
  ];

  const tvaRows = [
    { label: t('accounting.tvaCollected'), value: tvaCollected, icon: TrendingUp, color: 'text-blue-600' },
    { label: t('accounting.tvaDeductible'), value: tvaDeductible, icon: TrendingDown, color: 'text-violet-600' },
    { label: t('accounting.tvaBalance'), value: tvaBalance, icon: Scale, color: tvaBalance >= 0 ? 'text-red-600' : 'text-green-600' }
  ];

  return (
      <div className="space-y-4 sm:space-y-6" dir={dir}>
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {t('accounting.title')}
            </h1>
            <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm mt-0.5 flex items-center gap-1">
              <Calendar size={12} />
              {startDate && endDate && (
                  <span>
                {format(new Date(startDate), 'dd/MM/yyyy')} - {format(new Date(endDate), 'dd/MM/yyyy')}
              </span>
              )}
            </p>
          </div>

          <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartChange={setStartDate}
              onEndChange={setEndDate}
              onRefresh={() => refetch()}
              isRefreshing={isRefetching}
              t={t}
              dir={dir}
          />
        </div>

        {/* ── Metrics Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {metrics.map((metric, idx) => (
              <MetricCard
                  key={idx}
                  title={metric.title}
                  value={metric.value}
                  sub={metric.sub}
                  icon={metric.icon}
                  color={metric.color}
                  isLoading={isLoading}
                  dir={dir}
                  trend={metric.trend}
              />
          ))}
        </div>

        {/* ── Main Grid: Profit Breakdown + TVA ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Profit Breakdown */}
          <ProfitBreakdown
              revenueHT={revenueHT}
              purchasesHT={purchasesHT}
              charges={totalCharges}
              netProfit={netProfit}
              isLoading={isLoading}
              t={t}
              dir={dir}
          />

          {/* TVA Section */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <CreditCard size={18} className="text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {t('accounting.tva')}
              </h2>
            </div>

            <div className="space-y-3">
              {tvaRows.map((row, idx) => (
                  <InfoRow
                      key={idx}
                      label={row.label}
                      value={formatTND(row.value)}
                      isLoading={isLoading}
                      icon={row.icon}
                  />
              ))}
            </div>

            <TVAAlert
                toPay={tvaToPay}
                toRefund={tvaToRefund}
                balance={tvaBalance}
                isLoading={isLoading}
            />

            {/* TVA Info Note */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-start gap-2 text-xs text-gray-400 dark:text-gray-500">
                <Info size={12} className="shrink-0 mt-0.5" />
                <p>
                  {t('accounting.tvaNote', 'La TVA est calculée sur la base des taux appliqués à chaque ligne de vente/achat')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Second Grid: Charges Breakdown + Additional Info ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Charges Breakdown */}
          <ChargesBreakdown
              chargesByType={data?.charges?.byType || {}}
              totalCharges={totalCharges}
              isLoading={isLoading}
              t={t}
          />

          {/* Additional Financial Info */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <FileText size={18} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {t('accounting.financialSummary')}
              </h2>
            </div>

            <div className="space-y-3">
              <InfoRow
                  label={t('accounting.revenueTTC')}
                  value={formatTND(revenueTTC)}
                  isLoading={isLoading}
                  icon={TrendingUp}
              />
              <InfoRow
                  label={t('accounting.purchasesTTC')}
                  value={formatTND(purchasesTTC)}
                  isLoading={isLoading}
                  icon={TrendingDown}
              />
              <InfoRow
                  label={t('sales.amountRemaining')}
                  value={formatTND(totalRemaining)}
                  isLoading={isLoading}
                  icon={DollarSign}
              />

              <div className="border-t border-gray-100 dark:border-gray-800 my-2" />

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.collectionRate')}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {revenueTTC ? Math.round((totalPaid / revenueTTC) * 100) : 0}%
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.netMargin')}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {revenueHT && netProfit ? Math.round((netProfit / revenueHT) * 100) : 0}%
                  </p>
                </div>
              </div>

              {(invoiceCount > 0 || purchaseCount > 0) && (
                  <div className="mt-2 text-center text-xs text-gray-400">
                    {invoiceCount > 0 && `${invoiceCount} ${t('dashboard.sales')}`}
                    {invoiceCount > 0 && purchaseCount > 0 && ' · '}
                    {purchaseCount > 0 && `${purchaseCount} ${t('dashboard.purchases')}`}
                  </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Empty State when no data ── */}
        {!isLoading && revenueHT === 0 && purchasesHT === 0 && totalCharges === 0 && startDate && endDate && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <Receipt size={28} className="text-gray-400" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                {t('common.noData')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                {t('accounting.noDataMessage', 'Aucune donnée comptable pour la période sélectionnée')}
              </p>
            </div>
        )}
      </div>
  );
};

export default AccountingPage;