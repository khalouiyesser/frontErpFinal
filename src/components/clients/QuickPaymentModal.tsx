import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, User, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsApi } from '../../api';
import { Modal, ModalHeader, ModalBody } from '../ui/Modal';
import { FormField } from '../ui/FormField';
import { useI18n } from '../../context/I18nContext';

const formatTND = (v: number) =>
    Number(v).toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' TND';

interface QuickPaymentModalProps {
    client: any | null;
    onClose: () => void;
}

export const QuickPaymentModal: React.FC<QuickPaymentModalProps> = ({ client, onClose }) => {
    const { t, dir } = useI18n();
    const queryClient = useQueryClient();

    const [amount,  setAmount]  = useState('');
    const [note,    setNote]    = useState('');
    const [success, setSuccess] = useState(false);

    const reset = () => { setAmount(''); setNote(''); setSuccess(false); };

    const handleClose = () => { reset(); onClose(); };

    const mutation = useMutation({
        mutationFn: (data: { amount: number; note?: string }) =>
            clientsApi.addPayment(client._id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['client-stats', client._id] });
            setSuccess(true);
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message;
            toast.error(Array.isArray(msg) ? msg[0] : msg || t('error.generic'));
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsed = parseFloat(amount);
        if (!parsed || parsed <= 0) { toast.error('Montant invalide'); return; }
        mutation.mutate({ amount: parsed, note: note || undefined });
    };

    const parsed = parseFloat(amount);
    const valid  = !!amount && parsed > 0 && !!note.trim();

    const iconEl = (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/30">
            <Banknote size={17} className="text-white" />
        </div>
    );

    return (
        <Modal open={!!client} onClose={handleClose} size="sm" dir={dir}>
            <ModalHeader
                title="Paiement rapide"
                subtitle={client ? `${client.name}${client.firstName ? ` ${client.firstName}` : ''}` : ''}
                icon={iconEl}
                onClose={handleClose}
            />

            <ModalBody>
                {success ? (
                    /* ── Success state ── */
                    <div className="text-center py-6">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 size={32} className="text-emerald-500" />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-1">Paiement enregistré !</h3>
                        <p className="text-sm text-gray-400 mb-1">
                            <span className="font-semibold text-emerald-600">+{formatTND(parsed)}</span>
                            {' '}pour {client?.name}
                        </p>
                        {note && <p className="text-xs text-gray-400 italic mb-4">« {note} »</p>}
                        <div className="flex gap-2 mt-5">
                            <button
                                onClick={reset}
                                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                Nouveau paiement
                            </button>
                            <button
                                onClick={handleClose}
                                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
                            >
                                {t('common.close')}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── Payment form ── */
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Credit warning */}
                        {client?.creditUsed > 0 && (
                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Crédit en cours</p>
                                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                                        Crédit utilisé : <span className="font-bold">{formatTND(client.creditUsed)}</span>
                                        {client.creditLimit > 0 && ` / ${formatTND(client.creditLimit)}`}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Amount */}
                        <FormField label="Montant (TND)" required>
                            <div className="relative">
                                <Banknote size={15} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input
                                    type="number"
                                    min="0.001"
                                    step="0.001"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    required
                                    placeholder="0.000"
                                    autoFocus
                                    className="w-full ps-10 pe-16 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-lg font-bold text-gray-900 dark:text-white placeholder:text-gray-300 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition-all"
                                />
                                <span className="absolute end-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">TND</span>
                            </div>
                            {parsed > 0 && (
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 ms-0.5 font-medium">
                                    ✓ {formatTND(parsed)}
                                </p>
                            )}
                        </FormField>

                        {/* Note */}
                        <FormField label="Note" required>
                            <div className="relative">
                                <FileText size={14} className="absolute start-3.5 top-3 text-gray-400 pointer-events-none" />
                                <textarea
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    rows={2}
                                    required
                                    placeholder="Ex: Règlement facture du 01/03..."
                                    className="w-full ps-10 py-2.5 pe-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 resize-none transition-all"
                                />
                            </div>
                        </FormField>

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={mutation.isPending || !valid}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 dark:disabled:bg-emerald-900/40 disabled:cursor-not-allowed active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-emerald-500/20"
                            >
                                {mutation.isPending ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Enregistrement...
                                    </>
                                ) : (
                                    <>
                                        <Banknote size={15} />
                                        Enregistrer
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </ModalBody>
        </Modal>
    );
};