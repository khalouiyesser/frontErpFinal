import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Pencil, Trash2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { paymentVenteApi } from '../../api';
import { EmptyState } from '../ui/EmptyState';
import { cn } from '../../utils';

const formatTND = (v: number) =>
    Number(v || 0).toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

interface PaymentsTableProps {
    payments:  any[];
    clientId:  string;
    isLoading: boolean;
    label?:    string;
}

export const PaymentsTable: React.FC<PaymentsTableProps> = ({
                                                                payments, clientId, isLoading, label = 'Paiements',
                                                            }) => {
    const queryClient = useQueryClient();
    const [editingId, setEditingId]   = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState('');
    const [editNote,   setEditNote]   = useState('');

    const updateMut = useMutation({
        mutationFn: ({ id, data }: { id: string; data: { amount?: number; note?: string } }) =>
            paymentVenteApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-stats', clientId] });
            setEditingId(null);
            toast.success('Paiement modifié');
        },
        onError: () => toast.error('Erreur lors de la modification'),
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => paymentVenteApi.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client-stats', clientId] });
            toast.success('Paiement supprimé');
        },
        onError: () => toast.error('Erreur lors de la suppression'),
    });

    const startEdit = (p: any) => {
        setEditingId(p._id);
        setEditAmount(String(p.amount));
        setEditNote(p.note || '');
    };

    const saveEdit = (p: any) => {
        const amount = parseFloat(editAmount);
        if (!amount || amount <= 0) return;
        updateMut.mutate({ id: p._id, data: { amount, note: editNote } });
    };

    const confirmDelete = (p: any) => {
        if (window.confirm('Supprimer ce paiement ?')) deleteMut.mutate(p._id);
    };

    const inputCls = 'w-full px-2 py-1 rounded-lg border bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/30';
    const total    = payments.reduce((s, p) => s + (p.amount || 0), 0);

    if (isLoading) return (
        <div className="space-y-2">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
            ))}
        </div>
    );

    if (payments.length === 0) return (
        <EmptyState icon={CreditCard} message="Aucun paiement enregistré" className="py-8" />
    );

    return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-xs sm:text-sm">
                <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400">
                    <th className="text-start px-3 py-2.5 font-semibold">Date</th>
                    <th className="text-end px-3 py-2.5 font-semibold">Montant</th>
                    <th className="text-start px-3 py-2.5 font-semibold hidden sm:table-cell">Note</th>
                    <th className="px-2 py-2.5 w-16" />
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {payments.map((p: any, idx: number) => (
                    <tr
                        key={p._id || idx}
                        className="bg-white dark:bg-gray-800 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors"
                    >
                        {editingId === p._id ? (
                            /* ── Edit row ── */
                            <>
                                <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                                    {p.createdAt ? format(new Date(p.createdAt), 'dd/MM/yyyy HH:mm') : '—'}
                                </td>
                                <td className="px-2 py-1.5">
                                    <input
                                        type="number" step="0.001" min="0.001"
                                        value={editAmount}
                                        onChange={e => setEditAmount(e.target.value)}
                                        className={cn(inputCls, 'border-emerald-300 dark:border-emerald-700 font-bold text-end')}
                                    />
                                </td>
                                <td className="px-2 py-1.5 hidden sm:table-cell">
                                    <input
                                        type="text" value={editNote}
                                        onChange={e => setEditNote(e.target.value)}
                                        placeholder="Note..."
                                        className={cn(inputCls, 'border-gray-200 dark:border-gray-600')}
                                    />
                                </td>
                                <td className="px-2 py-1.5">
                                    <div className="flex gap-1 justify-end">
                                        <button
                                            onClick={() => saveEdit(p)}
                                            disabled={updateMut.isPending || !editAmount || parseFloat(editAmount) <= 0}
                                            className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 transition-colors"
                                        >
                                            <Save size={11} />
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
                                        >
                                            <X size={11} />
                                        </button>
                                    </div>
                                </td>
                            </>
                        ) : (
                            /* ── Read row ── */
                            <>
                                <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                    {p.createdAt ? format(new Date(p.createdAt), 'dd/MM/yyyy HH:mm') : '—'}
                                </td>
                                <td className="px-3 py-2.5 text-end font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                    +{formatTND(p.amount)} TND
                                </td>
                                <td className="px-3 py-2.5 text-gray-400 italic hidden sm:table-cell truncate max-w-[140px]">
                                    {p.note || '—'}
                                </td>
                                <td className="px-2 py-2.5">
                                    <div className="flex gap-1 justify-end">
                                        <button
                                            onClick={() => startEdit(p)}
                                            className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500 transition-colors"
                                        >
                                            <Pencil size={11} />
                                        </button>
                                        <button
                                            onClick={() => confirmDelete(p)}
                                            disabled={deleteMut.isPending}
                                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 disabled:opacity-50 transition-colors"
                                        >
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
                <tr className="bg-gray-50 dark:bg-gray-700/60 border-t-2 border-gray-200 dark:border-gray-600">
                    <td className="px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Total</td>
                    <td className="px-3 py-2.5 text-end text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {formatTND(total)} TND
                    </td>
                    <td className="hidden sm:table-cell" />
                    <td />
                </tr>
                </tfoot>
            </table>
        </div>
    );
};