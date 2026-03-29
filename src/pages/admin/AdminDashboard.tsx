import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { adminApi } from '../../api';
import { useTranslation } from 'react-i18next';
import {
  Building2, Users, TrendingUp, Activity, Plus, Eye, Trash2,
  CheckCircle, XCircle, Clock, PauseCircle, CreditCard, Calendar,
  Search, Filter, Shield,
} from 'lucide-react';
import {
  StatCard, Card, Button, Badge, DataTable, Modal, Input,
  Select, ConfirmDialog, SearchInput, EmptyState,
} from '../../components/ui';
import { formatTND, formatDate, getStatusClass } from '../../utils';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {adminApi} from "@/api/api";

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [searchCompany, setSearchCompany] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter]   = useState('');
  const [paymentModal, setPaymentModal] = useState<any>(null);
  const [suspendConfirm, setSuspendConfirm] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  /* ── Queries ─────────────────────────────────────────────────────────────── */
  const { data: dashboard, isLoading: loadingDash } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminApi.getDashboard,
  });

  const { data: companiesData, isLoading: loadingCompanies } = useQuery({
    queryKey: ['admin-companies', searchCompany, statusFilter, planFilter],
    queryFn: () => adminApi.getCompanies({ search: searchCompany, status: statusFilter, plan: planFilter }),
  });

  /* ── Mutations ───────────────────────────────────────────────────────────── */
  const paymentMutation = useMutation({
    mutationFn: ({ id, data }: any) => adminApi.recordPayment(id, data),
    onSuccess: () => {
      toast.success('Paiement enregistré avec succès');
      qc.invalidateQueries({ queryKey: ['admin-companies'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      setPaymentModal(null);
    },
    onError: () => toast.error('Erreur lors de l\'enregistrement'),
  });

  const subscriptionMutation = useMutation({
    mutationFn: ({ id, data }: any) => adminApi.updateSubscription(id, data),
    onSuccess: () => {
      toast.success('Abonnement mis à jour');
      qc.invalidateQueries({ queryKey: ['admin-companies'] });
      setSuspendConfirm(null);
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteCompany(id),
    onSuccess: () => {
      toast.success('Entreprise supprimée');
      qc.invalidateQueries({ queryKey: ['admin-companies'] });
      setDeleteConfirm(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  /* ── Payment form state ──────────────────────────────────────────────────── */
  const [payForm, setPayForm] = useState({ amount: '', notes: '', months: '1' });

  const handleRecordPayment = () => {
    if (!payForm.amount) return toast.error('Montant requis');
    paymentMutation.mutate({
      id: paymentModal._id,
      data: {
        amount: parseFloat(payForm.amount),
        notes: payForm.notes,
        months: parseInt(payForm.months),
      },
    });
  };

  /* ── Status badge helper ─────────────────────────────────────────────────── */
  const statusIcon: Record<string, React.ReactNode> = {
    active:    <CheckCircle size={13} />,
    trial:     <Clock size={13} />,
    expired:   <XCircle size={13} />,
    suspended: <PauseCircle size={13} />,
  };

  const statusVariant: Record<string, any> = {
    active: 'green', trial: 'blue', expired: 'red', suspended: 'gray',
  };

  /* ── Columns ─────────────────────────────────────────────────────────────── */
  const columns = [
    {
      key: 'name', header: t('common.name'),
      render: (row: any) => (
        <div>
          <p className="font-semibold text-slate-900 dark:text-white text-sm">{row.name}</p>
          <p className="text-xs text-slate-400">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'plan', header: t('admin.plan'),
      render: (row: any) => (
        <Badge variant={row.plan === 'enterprise' ? 'purple' : row.plan === 'professional' ? 'blue' : 'gray'}>
          {row.plan || 'basic'}
        </Badge>
      ),
    },
    {
      key: 'subscriptionStatus', header: t('admin.status'),
      render: (row: any) => (
        <Badge variant={statusVariant[row.subscriptionStatus] || 'gray'}>
          <span className="flex items-center gap-1">
            {statusIcon[row.subscriptionStatus]}
            {t(`admin.${row.subscriptionStatus}`) || row.subscriptionStatus}
          </span>
        </Badge>
      ),
    },
    {
      key: 'subscriptionEnd', header: 'Expiration',
      render: (row: any) => (
        <span className={`text-sm ${new Date(row.subscriptionEnd) < new Date() ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`}>
          {formatDate(row.subscriptionEnd)}
        </span>
      ),
    },
    {
      key: 'amountPaid', header: t('admin.revenue'),
      render: (row: any) => <span className="font-medium text-emerald-600">{formatTND(row.amountPaid || 0)}</span>,
    },
    {
      key: 'createdAt', header: t('common.date'),
      render: (row: any) => formatDate(row.createdAt),
    },
    {
      key: '_id', header: t('common.actions'),
      render: (row: any) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="sm"
            icon={<Eye size={14} />}
            onClick={() => navigate(`/admin/companies/${row._id}`)}
          />
          <Button
            variant="ghost" size="sm"
            icon={<CreditCard size={14} />}
            onClick={() => { setPaymentModal(row); setPayForm({ amount: '', notes: '', months: '1' }); }}
            className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
          />
          <Button
            variant="ghost" size="sm"
            icon={<PauseCircle size={14} />}
            onClick={() => setSuspendConfirm(row)}
            className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
          />
          <Button
            variant="ghost" size="sm"
            icon={<Trash2 size={14} />}
            onClick={() => setDeleteConfirm(row)}
            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          />
        </div>
      ),
    },
  ];

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Shield size={22} className="text-primary-600" />
            {t('admin.dashboard')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Gestion globale du système KyPro
          </p>
        </div>
        <Button
          icon={<Plus size={15} />}
          onClick={() => navigate('/admin/companies/new')}
        >
          {t('admin.addCompany')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('admin.totalCompanies')}
          value={dashboard?.companies?.total ?? 0}
          sub={`${dashboard?.companies?.active || 0} actives`}
          icon={<Building2 size={18} />}
          iconBg="bg-primary-100 dark:bg-primary-900/30 text-primary-600"
          loading={loadingDash}
        />
        <StatCard
          title="Essais / Expirés"
          value={`${dashboard?.companies?.trial || 0} / ${dashboard?.companies?.expired || 0}`}
          sub={`${dashboard?.companies?.suspended || 0} suspendu(s)`}
          icon={<Clock size={18} />}
          iconBg="bg-amber-100 dark:bg-amber-900/30 text-amber-600"
          loading={loadingDash}
        />
        <StatCard
          title={t('admin.totalUsers')}
          value={dashboard?.users?.total ?? 0}
          sub={`${dashboard?.users?.active || 0} actifs`}
          icon={<Users size={18} />}
          iconBg="bg-blue-100 dark:bg-blue-900/30 text-blue-600"
          loading={loadingDash}
        />
        <StatCard
          title={t('admin.revenue')}
          value={formatTND(dashboard?.revenue?.total ?? 0)}
          icon={<TrendingUp size={18} />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
          loading={loadingDash}
        />
      </div>

      {/* Plans breakdown */}
      {dashboard?.byPlan?.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {dashboard.byPlan.map((p: any) => (
            <Card key={p._id}>
              <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{p._id || 'basic'}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{p.count}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Companies table */}
      <Card padding={false}>
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between">
          <h2 className="section-title">{t('admin.companies')}</h2>
          <div className="flex flex-wrap gap-2">
            <SearchInput
              value={searchCompany}
              onChange={setSearchCompany}
              placeholder="Rechercher entreprise..."
              className="w-48"
            />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto text-sm py-1.5">
              <option value="">Tous les statuts</option>
              <option value="active">Actif</option>
              <option value="trial">Essai</option>
              <option value="expired">Expiré</option>
              <option value="suspended">Suspendu</option>
            </select>
            <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className="input w-auto text-sm py-1.5">
              <option value="">Tous les plans</option>
              <option value="basic">Basic</option>
              <option value="professional">Professionnel</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={companiesData?.companies || []}
          loading={loadingCompanies}
          emptyMessage={t('common.noData')}
          rowKey={(r: any) => r._id}
        />
      </Card>

      {/* ── Payment modal ─────────────────────────────────────────────────── */}
      <Modal
        open={!!paymentModal}
        onClose={() => setPaymentModal(null)}
        title={`💳 Paiement — ${paymentModal?.name}`}
        size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setPaymentModal(null)}>Annuler</Button>
            <Button onClick={handleRecordPayment} loading={paymentMutation.isPending}>
              Enregistrer
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Montant (TND)"
            type="number"
            min="0"
            step="0.001"
            value={payForm.amount}
            onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
            placeholder="0.000"
          />
          <Select
            label="Prolonger de"
            value={payForm.months}
            onChange={e => setPayForm(p => ({ ...p, months: e.target.value }))}
            options={[
              { value: '1', label: '1 mois' },
              { value: '3', label: '3 mois' },
              { value: '6', label: '6 mois' },
              { value: '12', label: '12 mois' },
            ]}
          />
          <Input
            label="Notes (optionnel)"
            value={payForm.notes}
            onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))}
            placeholder="Commentaire..."
          />
          {paymentModal && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
              <p>Plan actuel : <strong className="text-slate-700 dark:text-slate-300">{paymentModal.plan || 'basic'}</strong></p>
              <p>Statut : <strong className="text-slate-700 dark:text-slate-300">{paymentModal.subscriptionStatus}</strong></p>
              <p>Expiration : <strong className="text-slate-700 dark:text-slate-300">{formatDate(paymentModal.subscriptionEnd)}</strong></p>
              <p>Total payé : <strong className="text-emerald-600">{formatTND(paymentModal.amountPaid || 0)}</strong></p>
            </div>
          )}
        </div>
      </Modal>

      {/* Suspend / Activate confirm */}
      <ConfirmDialog
        open={!!suspendConfirm}
        title={suspendConfirm?.subscriptionStatus === 'suspended' ? 'Activer l\'entreprise' : 'Suspendre l\'entreprise'}
        message={`Voulez-vous ${suspendConfirm?.subscriptionStatus === 'suspended' ? 'activer' : 'suspendre'} l'accès de "${suspendConfirm?.name}" ?`}
        confirmLabel={suspendConfirm?.subscriptionStatus === 'suspended' ? 'Activer' : 'Suspendre'}
        cancelLabel="Annuler"
        onConfirm={() => subscriptionMutation.mutate({
          id: suspendConfirm._id,
          data: { subscriptionStatus: suspendConfirm?.subscriptionStatus === 'suspended' ? 'active' : 'suspended' },
        })}
        onCancel={() => setSuspendConfirm(null)}
        loading={subscriptionMutation.isPending}
        danger={suspendConfirm?.subscriptionStatus !== 'suspended'}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteConfirm}
        title="Supprimer l'entreprise"
        message={`Êtes-vous sûr de vouloir supprimer définitivement "${deleteConfirm?.name}" ? Tous les utilisateurs seront désactivés.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => deleteMutation.mutate(deleteConfirm._id)}
        onCancel={() => setDeleteConfirm(null)}
        loading={deleteMutation.isPending}
        danger
      />
    </div>
  );
};

export default AdminDashboard;
