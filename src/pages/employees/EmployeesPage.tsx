import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '../../api';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { Plus, Pencil, Trash2, X, Search, Users, Wallet, FileText, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Employee {
    _id: string;
    firstName: string;
    lastName:  string;
    phone:        string;
    email:        string;
    position:     string;
    department:   string;
    contractType: string;
    salary:       number;
    hireDate:     string;
    cin:          string;
    cnss:         string;
    rib:          string;
    isActive:     boolean;
    notes:        string;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const CONTRACTS = ['CDI', 'CDD', 'SIVP', 'Stage', 'Intérim', 'Autre'];

const CONTRACT_STYLE: Record<string, string> = {
    CDI:     'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    CDD:     'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    SIVP:    'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    Stage:   'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    Intérim: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    Autre:   'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

// Couleurs de fond avatar par index
const AVATAR_COLORS = [
    'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
    'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
    'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200',
];

const defaultForm = {
    firstName: '', lastName: '', phone: '+216', email: '',
    position: '', department: '', contractType: 'CDI',
    salary: 0, hireDate: new Date().toISOString().split('T')[0],
    cin: '', cnss: '', rib: '', isActive: true, notes: '',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt    = (v: number) => `${(v || 0).toFixed(3)} TND`;
const initials = (e: Employee) =>
    `${e.firstName?.[0] || ''}${e.lastName?.[0] || ''}`.toUpperCase();
const avatarColor = (e: Employee) =>
    AVATAR_COLORS[(e.firstName?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

// ── Sub-components ─────────────────────────────────────────────────────────────
const StatCard = ({
                      icon: Icon, label, value, sub, accent,
                  }: {
    icon: React.ElementType; label: string; value: string | number; sub?: string; accent: string;
}) => (
    <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 overflow-hidden group hover:-translate-y-0.5 transition-transform duration-200">
        <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${accent}`} />
        <div className={`inline-flex p-2 rounded-xl mb-3 ${accent.replace('bg-', 'bg-').replace('-600', '-50')} dark:bg-gray-800`}>
            <Icon size={16} className={accent.replace('bg-', 'text-')} />
        </div>
        <p className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-medium mb-1">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 dark:text-white leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
);

const FormField = ({
                       label, required: req, children,
                   }: {
    label: string; required?: boolean; children: React.ReactNode;
}) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {label} {req && <span className="text-amber-500">*</span>}
        </label>
        {children}
    </div>
);

const inp =
    'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-sm text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500 transition-colors';

// ── Main Page ──────────────────────────────────────────────────────────────────
const EmployeesPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { state: confirmState, confirm, proceed, cancel } = useConfirmDialog();

    const [showForm,   setShowForm]   = useState(false);
    const [editingId,  setEditingId]  = useState<string | null>(null);
    const [form,       setForm]       = useState(defaultForm);
    const [search,     setSearch]     = useState('');
    const [filterContract, setFilterContract] = useState<string>('all');

    // ── Data ────────────────────────────────────────────────────────────────────
    const { data: employees = [], isLoading } = useQuery({
        queryKey: ['employees'],
        queryFn:  () => employeesApi.getAll(),
    });

    const list = employees as Employee[];

    // ── Derived stats ────────────────────────────────────────────────────────────
    const stats = useMemo(() => ({
        total:   list.filter(e => e.isActive).length,
        salary:  list.filter(e => e.isActive).reduce((s, e) => s + (e.salary || 0), 0),
        cdi:     list.filter(e => e.contractType === 'CDI').length,
        depts:   new Set(list.map(e => e.department).filter(Boolean)).size,
    }), [list]);

    // ── Filtered rows ────────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return list.filter(e => {
            const matchSearch = !q || [e.firstName, e.lastName, e.phone, e.position, e.department]
                .some(f => f?.toLowerCase().includes(q));
            const matchContract = filterContract === 'all' || e.contractType === filterContract;
            return matchSearch && matchContract;
        });
    }, [list, search, filterContract]);

    // ── Mutations ────────────────────────────────────────────────────────────────
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['employees'] });

    const createMut = useMutation({
        mutationFn: employeesApi.create,
        onSuccess: () => { invalidate(); toast.success('Employé créé — compte utilisateur généré'); closeForm(); },
        onError:   (err: any) => toast.error(err?.response?.data?.message || 'Erreur lors de la création'),
    });

    const updateMut = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => employeesApi.update(id, data),
        onSuccess: () => { invalidate(); toast.success('Employé modifié'); closeForm(); },
        onError:   (err: any) => toast.error(err?.response?.data?.message || 'Erreur'),
    });

    const deleteMut = useMutation({
        mutationFn: employeesApi.remove,
        onSuccess: () => { invalidate(); toast.success('Employé supprimé'); },
    });

    // ── Handlers ─────────────────────────────────────────────────────────────────
    const openCreate = () => { setEditingId(null); setForm(defaultForm); setShowForm(true); };

    const openEdit = (e: Employee) => {
        setEditingId(e._id);
        setForm({
            firstName: e.firstName || '', lastName:  e.lastName || '',
            phone: e.phone || '+216',     email:     e.email || '',
            position:  e.position || '',  department: e.department || '',
            contractType: e.contractType || 'CDI',
            salary:   e.salary || 0,
            hireDate: e.hireDate?.split('T')[0] || '',
            cin: e.cin || '', cnss: e.cnss || '', rib: e.rib || '',
            isActive: e.isActive ?? true, notes: e.notes || '',
        });
        setShowForm(true);
    };

    const closeForm = () => { setShowForm(false); setEditingId(null); setForm(defaultForm); };

    const handleDelete = (e: Employee) => confirm(
        {
            title:        `Supprimer "${e.firstName} ${e.lastName}"`,
            message:      'Cet employé sera supprimé et son compte utilisateur désactivé.',
            dangerMessage: 'Cette action est irréversible.',
            confirmLabel:  'Supprimer',
        },
        () => deleteMut.mutate(e._id),
    );

    const handleSubmit = (ev: React.FormEvent) => {
        ev.preventDefault();
        if (editingId) updateMut.mutate({ id: editingId, data: form });
        else           createMut.mutate(form as any);
    };

    const f = (field: keyof typeof form) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm(p => ({ ...p, [field]: ev.target.type === 'checkbox' ? (ev.target as HTMLInputElement).checked : ev.target.type === 'number' ? +ev.target.value : ev.target.value }));

    // ── Render ───────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 p-1">

            {/* ── Header ── */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Ressources humaines
                    </h1>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                        {list.length} membre{list.length !== 1 ? 's' : ''} dans l'équipe
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-sm font-medium transition-all duration-150 shadow-sm"
                >
                    <Plus size={15} strokeWidth={2.5} />
                    Nouvel employé
                </button>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={Users}     label="Effectif actif"  value={stats.total}              sub="employés"        accent="bg-blue-600"   />
                <StatCard icon={Wallet}    label="Masse salariale" value={`${(stats.salary/1000).toFixed(1)}k`} sub="TND / mois" accent="bg-amber-500" />
                <StatCard icon={FileText}  label="CDI en cours"    value={stats.cdi}                sub="contrats"        accent="bg-emerald-600" />
                <StatCard icon={TrendingUp} label="Départements"   value={stats.depts || '—'}       sub="distincts"       accent="bg-violet-600"  />
            </div>

            {/* ── Toolbar ── */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Rechercher…"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                    />
                </div>
                <div className="flex items-center gap-1.5">
                    {['all', ...CONTRACTS].map(c => (
                        <button
                            key={c}
                            onClick={() => setFilterContract(c)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                                filterContract === c
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                            }`}
                        >
                            {c === 'all' ? 'Tous' : c}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Table ── */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                {isLoading ? (
                    <div className="py-20 flex flex-col items-center gap-3">
                        <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-gray-800 animate-spin" />
                        <p className="text-sm text-gray-400">Chargement…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                            <Users size={20} className="text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-400">Aucun employé trouvé</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                            {['Employé', 'Contact', 'Contrat', 'Salaire', 'Embauche', 'Statut', ''].map(h => (
                                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                    {h}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                        {filtered.map((emp, idx) => (
                            <tr
                                key={emp._id}
                                className="group hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors duration-100"
                                style={{ animationDelay: `${idx * 30}ms` }}
                            >
                                {/* Employé */}
                                <td className="px-4 py-3.5">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold tracking-tight ${avatarColor(emp)}`}>
                                            {initials(emp)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                                                {emp.firstName} {emp.lastName}
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                {emp.position || emp.department || '—'}
                                            </p>
                                        </div>
                                    </div>
                                </td>

                                {/* Contact */}
                                <td className="px-4 py-3.5">
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{emp.phone || '—'}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[160px]">{emp.email || ''}</p>
                                </td>

                                {/* Contrat */}
                                <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CONTRACT_STYLE[emp.contractType] || CONTRACT_STYLE['Autre']}`}>
                      {emp.contractType}
                    </span>
                                </td>

                                {/* Salaire */}
                                <td className="px-4 py-3.5">
                    <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                      {fmt(emp.salary)}
                    </span>
                                </td>

                                {/* Embauche */}
                                <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                                    {emp.hireDate ? format(new Date(emp.hireDate), 'dd MMM yyyy') : '—'}
                                </td>

                                {/* Statut */}
                                <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        emp.isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${emp.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {emp.isActive ? 'Actif' : 'Inactif'}
                    </span>
                                </td>

                                {/* Actions */}
                                <td className="px-4 py-3.5">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                        <button
                                            onClick={() => openEdit(emp)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                            title="Modifier"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(emp)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Supprimer"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ══════════════════════════════════════════════════
        Modal Form
      ══════════════════════════════════════════════════ */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={closeForm}
                    />

                    {/* Modal */}
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">

                        {/* Modal header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                            <div>
                                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                    {editingId ? 'Modifier l\'employé' : 'Nouvel employé'}
                                </h2>
                                {!editingId && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                        Un compte utilisateur sera créé automatiquement
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={closeForm}
                                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">

                            {/* Section Identité */}
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-500 mb-3">
                                    Identité
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="Prénom" required>
                                        <input required value={form.firstName} onChange={f('firstName')} placeholder="Mohamed" className={inp} />
                                    </FormField>
                                    <FormField label="Nom" required>
                                        <input required value={form.lastName} onChange={f('lastName')} placeholder="Ben Salem" className={inp} />
                                    </FormField>
                                    <FormField label="Téléphone">
                                        <input value={form.phone} onChange={f('phone')} placeholder="+216 XX XXX XXX" className={inp} />
                                    </FormField>
                                    <FormField label="Email">
                                        <input type="email" value={form.email} onChange={f('email')} placeholder="m.bensalem@…" className={inp} />
                                    </FormField>
                                    <FormField label="CIN">
                                        <input value={form.cin} onChange={f('cin')} placeholder="00000000" className={inp} />
                                    </FormField>
                                    <FormField label="N° CNSS">
                                        <input value={form.cnss} onChange={f('cnss')} className={inp} />
                                    </FormField>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-gray-100 dark:border-gray-800" />

                            {/* Section Poste */}
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-500 mb-3">
                                    Poste & Contrat
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="Poste">
                                        <input value={form.position} onChange={f('position')} placeholder="Comptable" className={inp} />
                                    </FormField>
                                    <FormField label="Département">
                                        <input value={form.department} onChange={f('department')} placeholder="Finance" className={inp} />
                                    </FormField>
                                    <FormField label="Type de contrat">
                                        <select value={form.contractType} onChange={f('contractType')} className={inp}>
                                            {CONTRACTS.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </FormField>
                                    <FormField label="Salaire (TND / mois)">
                                        <input type="number" min={0} step={0.001} value={form.salary} onChange={f('salary')} className={inp} />
                                    </FormField>
                                    <FormField label="Date d'embauche">
                                        <input type="date" value={form.hireDate} onChange={f('hireDate')} className={inp} />
                                    </FormField>
                                    <FormField label="RIB">
                                        <input value={form.rib} onChange={f('rib')} className={inp} />
                                    </FormField>
                                    <div className="col-span-2">
                                        <FormField label="Notes">
                                            <textarea value={form.notes} onChange={f('notes')} rows={2} className={inp + ' resize-none'} />
                                        </FormField>
                                    </div>
                                    <div className="col-span-2 flex items-center gap-3 pt-1">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={form.isActive}
                                                onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-checked:bg-gray-900 dark:peer-checked:bg-white rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-gray-900 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                                        </label>
                                        <span className="text-sm text-gray-700 dark:text-gray-300 select-none">
                      Employé actif
                    </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMut.isPending || updateMut.isPending}
                                    className="flex-[2] px-4 py-2.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 text-white dark:text-gray-900 rounded-xl text-sm font-medium transition-all shadow-sm"
                                >
                                    {createMut.isPending || updateMut.isPending
                                        ? 'Enregistrement…'
                                        : editingId ? 'Enregistrer les modifications' : 'Créer l\'employé'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog {...confirmState} onProceed={proceed} onCancel={cancel} />
        </div>
    );
};

export default EmployeesPage;