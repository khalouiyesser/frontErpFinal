import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { adminCompaniesApi } from '../../api/adminCompaniesApi';

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Ajouter le titre de la page
  // usePageTitle(t('admin.dashboard') + ' - KyPro ERP');

  const [searchCompany, setSearchCompany] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter]   = useState('');
  const [paymentModal, setPaymentModal] = useState<any>(null);
  const [suspendConfirm, setSuspendConfirm] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  /* ── Queries ─────────────────────────────────────────────────────────────── */
  const { data: companiesData, isLoading: loadingCompanies } = useQuery({
    queryKey: ['admin-companies', searchCompany, statusFilter, planFilter],
    queryFn: () => adminCompaniesApi.getAll({ search: searchCompany, status: statusFilter, plan: planFilter }),
  });

  /* ── Mutations ───────────────────────────────────────────────────────────── */
  const updateSubscriptionMutation = useMutation({
    mutationFn: ({ id, data }: any) => adminCompaniesApi.updateSubscription(id, data),
    onSuccess: () => {
      toast.success('Abonnement mis à jour');
      qc.invalidateQueries({ queryKey: ['admin-companies'] });
      setSuspendConfirm(null);
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminCompaniesApi.remove(id),
    onSuccess: () => {
      toast.success('Entreprise supprimée');
      qc.invalidateQueries({ queryKey: ['admin-companies'] });
      setDeleteConfirm(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });


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
          value={companiesData?.companies?.length ?? 0}
          icon={<Building2 size={18} />}
          iconBg="bg-primary-100 dark:bg-primary-900/30 text-primary-600"
          loading={loadingCompanies}
        />
        <StatCard
          title="Utilisateurs"
          value="--"
          icon={<Users size={18} />}
          iconBg="bg-blue-100 dark:bg-blue-900/30 text-blue-600"
          loading={loadingCompanies}
        />
        <StatCard
          title={t('admin.revenue')}
          value="--"
          icon={<TrendingUp size={18} />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
          loading={loadingCompanies}
        />
        <StatCard
          title="Statut"
          value="--"
          icon={<Activity size={18} />}
          iconBg="bg-amber-100 dark:bg-amber-900/30 text-amber-600"
          loading={loadingCompanies}
        />
      </div>

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


      {/* Suspend / Activate confirm */}
      <ConfirmDialog
        open={!!suspendConfirm}
        title={suspendConfirm?.subscriptionStatus === 'suspended' ? 'Activer l\'entreprise' : 'Suspendre l\'entreprise'}
        message={`Voulez-vous ${suspendConfirm?.subscriptionStatus === 'suspended' ? 'activer' : 'suspendre'} l'accès de "${suspendConfirm?.name}" ?`}
        confirmLabel={suspendConfirm?.subscriptionStatus === 'suspended' ? 'Activer' : 'Suspendre'}
        cancelLabel="Annuler"
        onConfirm={() => updateSubscriptionMutation.mutate({
          id: suspendConfirm._id,
          data: { subscriptionStatus: suspendConfirm?.subscriptionStatus === 'suspended' ? 'active' : 'suspended' },
        })}
        onCancel={() => setSuspendConfirm(null)}
        loading={updateSubscriptionMutation.isPending}
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
