import React from 'react';
import { ChevronLeft, Package, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { SaleStatusBadge } from '../ui/Badge';
import { useI18n } from '../../context/I18nContext';

const formatTND = (v: number) =>
    Number(v || 0).toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

interface SaleDetailPanelProps {
    sale:         any | null;
    onClose:      () => void;
    statusConfig: Record<string, { label: string; cls: string }>;
    dir?:         'ltr' | 'rtl';
}

export const SaleDetailPanel: React.FC<SaleDetailPanelProps> = ({
                                                                    sale, onClose, statusConfig, dir,
                                                                }) => {
    const { t } = useI18n();

    if (!sale) return null;

    const meta = statusConfig[sale.status] ?? { label: sale.status, cls: '' };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:justify-end" dir={dir}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative w-full sm:w-auto sm:max-w-md sm:h-full bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto rounded-t-2xl sm:rounded-none max-h-[92vh] sm:max-h-full">

                {/* Sticky header */}
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 sm:px-6 py-4 flex items-center justify-between z-10">
                    {/* Mobile drag handle */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full sm:hidden" />

                    <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-0">
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                        >
                            <ChevronLeft size={18} className="text-gray-500 rtl:rotate-180" />
                        </button>
                        <div>
                            <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                                {t('sales.invoice')}
                            </h2>
                            <p className="text-xs text-gray-400">
                                {sale.createdAt
                                    ? format(new Date(sale.createdAt), "dd/MM/yyyy 'à' HH:mm")
                                    : '—'}
                            </p>
                        </div>
                    </div>
                    <SaleStatusBadge status={sale.status} label={meta.label} />
                </div>

                <div className="p-4 sm:p-6 space-y-5">

                    {/* Financial summary */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: t('sales.totalTTC'), value: formatTND(sale.totalTTC),       cls: 'text-blue-600 dark:text-blue-400' },
                            { label: t('sales.paid'),     value: formatTND(sale.amountPaid),      cls: 'text-emerald-600 dark:text-emerald-400' },
                            {
                                label: t('sales.remaining'),
                                value: formatTND(sale.amountRemaining),
                                cls:   sale.amountRemaining > 0 ? 'text-red-500' : 'text-gray-400',
                            },
                        ].map(({ label, value, cls }) => (
                            <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5 text-center">
                                <p className="text-[0.65rem] text-gray-500 dark:text-gray-400 mb-1 line-clamp-1 uppercase font-semibold tracking-wide">
                                    {label}
                                </p>
                                <p className={`text-xs sm:text-sm font-black ${cls} truncate`}>{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Products */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-1.5">
                            <Package size={13} />
                            {t('products.title')}
                        </h3>
                        <div className="space-y-2">
                            {(sale.items || []).map((item: any, idx: number) => (
                                <div key={idx} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                {item.productName}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500">
                          {t('sales.quantity')}: <span className="font-medium text-gray-700 dark:text-gray-300">{item.quantity}</span>
                        </span>
                                                <span className="text-xs text-gray-500">
                          {t('sales.unitPrice')}: <span className="font-medium text-gray-700 dark:text-gray-300">{formatTND(item.unitPrice)} TND</span>
                        </span>
                                                {item.tva > 0 && (
                                                    <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-md font-medium">
                            TVA {item.tva}%
                          </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-end shrink-0">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white">{formatTND(item.totalTTC)} TND</p>
                                            {item.tva > 0 && (
                                                <p className="text-xs text-gray-400">HT: {formatTND(item.totalHT)} TND</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                            <span>{t('sales.totalHT')}</span>
                            <span>{formatTND(sale.totalHT)} TND</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                            <span>TVA</span>
                            <span>{formatTND(sale.totalTTC - sale.totalHT)} TND</span>
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-bold text-gray-900 dark:text-white">
                            <span>{t('sales.totalTTC')}</span>
                            <span>{formatTND(sale.totalTTC)} TND</span>
                        </div>
                    </div>

                    {/* Payment history */}
                    {(sale.payments || []).length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-1.5">
                                <CreditCard size={13} />
                                {t('sales.addPayment')}
                            </h3>
                            <div className="space-y-2">
                                {sale.payments.map((p: any, idx: number) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/20"
                                    >
                                        <div>
                                            <p className="text-xs text-gray-500">
                                                {p.date ? format(new Date(p.date), "dd/MM/yyyy 'à' HH:mm") : '—'}
                                            </p>
                                            {p.note && <p className="text-xs text-gray-400 italic mt-0.5">{p.note}</p>}
                                        </div>
                                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                            +{formatTND(p.amount)} TND
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {sale.notes && (
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl p-4">
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 uppercase tracking-wide">
                                {t('common.notes')}
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{sale.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};