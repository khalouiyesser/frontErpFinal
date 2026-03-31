import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api';
import DataTable from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog.ts';
import { Plus, Pencil, Trash2, X, Shield, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const defaultForm = { name: '', email: '', role: 'user', businessName: '', phone: '' };

const AdminUsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { state: confirmState, confirm, proceed, cancel } = useConfirmDialog();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const { data: users = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: () => usersApi.getAll() });

  const createMut = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Utilisateur créé. Email envoyé.'); setShowForm(false); setForm(defaultForm); }
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => usersApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Utilisateur modifié'); setShowForm(false); setEditingId(null); setForm(defaultForm); }
  });
  const deleteMut = useMutation({
    mutationFn: usersApi.remove,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Utilisateur supprimé'); }
  });

  const handleEdit = (u: any) => { setEditingId(u._id); setForm({ name: u.name || '', email: u.email || '', role: u.role || 'user', businessName: u.businessName || '', phone: u.phone || '' }); setShowForm(true); };
  const handleDelete = (u: any) => confirm(
    { title: `Supprimer "${u.name}"`, message: `Cet utilisateur sera supprimé.`, dangerMessage: 'Toutes les données de cet utilisateur seront supprimées DÉFINITIVEMENT. Nous ne sommes pas responsables de cette perte.', confirmLabel: 'Supprimer définitivement' },
    () => deleteMut.mutate(u._id)
  );

  const inp = 'w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';

  const columns = [
    { key: 'name', header: 'Nom', sortable: true, render: (v: string, row: any) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
          {row.role === 'admin' ? <Shield size={14} className="text-amber-600" /> : <User size={14} className="text-blue-600" />}
        </div>
        <div><p className="font-medium text-gray-900 dark:text-white">{v}</p><p className="text-xs text-gray-400">{row.email}</p></div>
      </div>
    )},
    { key: 'businessName', header: 'Entreprise', sortable: true, render: (v: string) => v || <span className="text-gray-400">—</span> },
    { key: 'role', header: 'Rôle', render: (v: string) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{v === 'admin' ? 'Admin' : 'Utilisateur'}</span>
    )},
    { key: 'createdAt', header: 'Créé le', render: (v: string) => v ? format(new Date(v), 'dd/MM/yyyy') : '-', sortable: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des utilisateurs</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{(users as any[]).length} utilisateur{(users as any[]).length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setEditingId(null); setForm(defaultForm); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">
          <Plus size={16} /> Nouvel utilisateur
        </button>
      </div>

      <DataTable data={users as any[]} columns={columns} searchKeys={['name', 'email', 'businessName']}
        isLoading={isLoading} emptyMessage="Aucun utilisateur"
        actions={(row) => (
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => handleEdit(row)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={15} /></button>
            <button onClick={() => handleDelete(row)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
          </div>
        )}
      />

      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4"><X size={18} /></button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">{editingId ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h2>
            {!editingId && <p className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">Un email sera envoyé avec les identifiants de connexion.</p>}
            <form onSubmit={(e) => { e.preventDefault(); if (editingId) updateMut.mutate({ id: editingId, data: form }); else createMut.mutate(form as any); }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom complet <span className="text-red-500">*</span></label><input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} /></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email <span className="text-red-500">*</span></label><input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inp} /></div>
                <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Rôle</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inp}><option value="user">Utilisateur</option><option value="admin">Administrateur</option></select></div>
                <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Téléphone</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inp} /></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom de l'entreprise</label><input value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} className={inp} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium">Annuler</button>
                <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium">{createMut.isPending || updateMut.isPending ? '...' : editingId ? 'Modifier' : 'Créer & Envoyer email'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog {...confirmState} onProceed={proceed} onCancel={cancel} />
    </div>
  );
};

export default AdminUsersPage;
