import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Building2, User, Phone, Mail, MapPin, CreditCard, FileText,
    UserCheck, UserX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsApi } from '../../api';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal';
import { FormField, InputWithIcon, TextareaWithIcon } from '../ui/FormField';
import { useI18n } from '../../context/I18nContext';

interface ClientFormData {
    name:        string;
    firstName:   string;
    phone:       string;
    email:       string;
    sector:      string;
    creditLimit: number;
    isActive:    boolean;
    notes:       string;
}

const DEFAULT: ClientFormData = {
    name: '', firstName: '', phone: '+216', email: '',
    sector: '', creditLimit: 0, isActive: true, notes: '',
};

interface ClientFormModalProps {
    open:       boolean;
    onClose:    () => void;
    editClient?: any | null;  // existing client data when editing
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
                                                                    open, onClose, editClient,
                                                                }) => {
    const { t, dir } = useI18n();
    const queryClient = useQueryClient();

    const [form, setForm] = useState<ClientFormData>(DEFAULT);
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

    // Populate form when editing
    useEffect(() => {
        if (editClient) {
            setForm({
                name:        editClient.name        || '',
                firstName:   editClient.firstName   || '',
                phone:       editClient.phone       || '+216',
                email:       editClient.email       || '',
                sector:      editClient.sector      || '',
                creditLimit: editClient.creditLimit || 0,
                isActive:    editClient.isActive    ?? true,
                notes:       editClient.notes       || '',
            });
        } else {
            setForm(DEFAULT);
        }
    }, [editClient, open]);

    const isEditing = !!editClient;

    const onSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        toast.success(isEditing ? t('clients.edit') : t('clients.new'));
        onClose();
    };

    const onError = (err: any) => {
        if (err?.response?.status === 409) { setShowDuplicateWarning(true); return; }
        const msg = err?.response?.data?.message;
        toast.error(Array.isArray(msg) ? msg[0] : msg || t('error.generic'));
    };

    const createMut = useMutation({ mutationFn: clientsApi.create, onSuccess, onError });
    const updateMut = useMutation({
        mutationFn: (data: any) => clientsApi.update(editClient._id, data),
        onSuccess,
        onError,
    });

    const isPending = createMut.isPending || updateMut.isPending;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: any = { ...form };
        if (!payload.firstName) delete payload.firstName;
        if (!payload.email)     delete payload.email;
        if (!payload.sector)    delete payload.sector;
        if (!payload.notes)     delete payload.notes;
        if (isEditing) updateMut.mutate(payload);
        else           createMut.mutate(payload);
    };

    const set = <K extends keyof ClientFormData>(k: K) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setForm(f => ({ ...f, [k]: e.target.type === 'number' ? +e.target.value : e.target.value }));

    const iconBg = 'w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/30';

    return (
        <>
            <Modal open={open} onClose={onClose} size="lg" dir={dir}>
                <ModalHeader
                    title={isEditing ? t('clients.edit') : t('clients.new')}
                    subtitle={isEditing ? 'Modifier les informations du client' : 'Remplissez les informations du client'}
                    icon={
                        <div className={iconBg}>
                            <User size={16} className="text-white" />
                        </div>
                    }
                    onClose={onClose}
                />

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <ModalBody>
                        {/* Row 1: Nom · Prénom */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <FormField label="Nom" required>
                                <InputWithIcon
                                    icon={<Building2 size={14} />}
                                    value={form.name}
                                    onChange={set('name')}
                                    required
                                    placeholder="Nom ou raison sociale"
                                />
                            </FormField>
                            <FormField label="Prénom">
                                <InputWithIcon
                                    icon={<User size={14} />}
                                    value={form.firstName}
                                    onChange={set('firstName')}
                                    placeholder="Optionnel"
                                />
                            </FormField>
                        </div>

                        {/* Row 2: Téléphone · Email */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <FormField label="Téléphone" required hint="Format : +216 suivi de 8 chiffres">
                                <InputWithIcon
                                    icon={<Phone size={14} />}
                                    value={form.phone}
                                    onChange={set('phone')}
                                    required
                                    pattern="^\+216[0-9]{8}$"
                                    placeholder="+21620000000"
                                />
                            </FormField>
                            <FormField label="Email">
                                <InputWithIcon
                                    icon={<Mail size={14} />}
                                    type="email"
                                    value={form.email}
                                    onChange={set('email')}
                                    placeholder="client@exemple.com"
                                />
                            </FormField>
                        </div>

                        {/* Row 3: Secteur · Crédit */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <FormField label="Secteur / Région">
                                <InputWithIcon
                                    icon={<MapPin size={14} />}
                                    value={form.sector}
                                    onChange={set('sector')}
                                    placeholder="Ex: Commerce, Industrie, Sfax..."
                                />
                            </FormField>
                            <FormField label="Limite de crédit (TND)" hint="Laisser vide = pas de limite">
                                <InputWithIcon
                                    icon={<CreditCard size={14} />}
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={form.creditLimit === 0 ? '' : form.creditLimit}
                                    onChange={e => setForm(f => ({
                                        ...f,
                                        creditLimit: e.target.value === '' ? 0 : +e.target.value,
                                    }))}
                                    placeholder="Montant"
                                    inputClassName="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </FormField>
                        </div>

                        {/* Row 4: Notes */}
                        <FormField label="Notes internes">
                            <TextareaWithIcon
                                icon={<FileText size={14} />}
                                value={form.notes}
                                onChange={set('notes')}
                                rows={3}
                                placeholder="Informations supplémentaires, remarques..."
                            />
                        </FormField>

                        {/* Active toggle */}
                        <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                            className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                                form.isActive
                                    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
                                    : 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700'
                            }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                    form.isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}>
                                    {form.isActive
                                        ? <UserCheck size={15} className="text-white" />
                                        : <UserX size={15} className="text-white" />
                                    }
                                </div>
                                <div className="text-start">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {form.isActive ? 'Client actif' : 'Client inactif'}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {form.isActive ? 'Apparaît dans les ventes' : 'Masqué des ventes'}
                                    </p>
                                </div>
                            </div>
                            {/* Toggle pill */}
                            <div className={`w-11 h-6 rounded-full relative transition-colors ${
                                form.isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                            }`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                                    form.isActive ? 'start-6' : 'start-1'
                                }`} />
                            </div>
                        </button>
                    </ModalBody>

                    <ModalFooter>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-blue-500/20 min-w-[100px]"
                        >
                            {isPending ? (
                                <span className="flex items-center gap-2 justify-center">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {t('common.loading')}
                </span>
                            ) : (
                                isEditing ? t('common.edit') : t('common.create')
                            )}
                        </button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Duplicate phone warning */}
            {showDuplicateWarning && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Phone size={26} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-1.5">Client déjà existant</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                            Un client avec ce numéro de téléphone existe déjà dans votre base.
                        </p>
                        <button
                            onClick={() => setShowDuplicateWarning(false)}
                            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                        >
                            {t('common.confirm')}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};