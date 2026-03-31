import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../api';
import { useTranslation } from 'react-i18next';
import {
  Bell, CheckCheck, Package, AlertTriangle, Info,
  ChevronRight, ChevronLeft, Trash2, RefreshCw, Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar, fr, enUS } from 'date-fns/locale';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'low_stock' | 'payment_due' | 'system';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

// ── Config ─────────────────────────────────────────────────────────────────────
const typeConfig: Record<string, { icon: React.ReactNode; bg: string; border: string; text: string }> = {
  low_stock: {
    icon: <Package size={16} className="text-amber-600 dark:text-amber-400" />,
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-400',
  },
  payment_due: {
    icon: <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />,
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-400',
  },
  system: {
    icon: <Info size={16} className="text-blue-600 dark:text-blue-400" />,
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-400',
  },
};

// FIX: use i18n.language directly instead of t('language') which is unreliable
const getDateLocale = (lang: string) => {
  if (lang === 'ar') return ar;
  if (lang === 'fr') return fr;
  return enUS;
};

// ── Notification Card ──────────────────────────────────────────────────────────
const NotificationCard: React.FC<{
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  lang: string;
  dir?: string;
}> = ({ notification, onMarkRead, onDelete, lang, dir = 'ltr' }) => {
  const cfg = typeConfig[notification.type] ?? typeConfig['system'];

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "dd MMM yyyy 'à' HH:mm", {
        locale: getDateLocale(lang),
      });
    } catch {
      return '—';
    }
  };

  return (
      <div
          className={`relative flex flex-col p-4 rounded-2xl border transition-all duration-200 ${
              notification.isRead
                  ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-70 hover:opacity-100'
                  : `${cfg.bg} ${cfg.border} border shadow-sm`
          }`}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg} border ${cfg.border}`}>
            {cfg.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={`text-sm font-semibold ${notification.isRead ? 'text-gray-700 dark:text-gray-300' : cfg.text}`}>
                {notification.title}
              </p>
              {!notification.isRead && (
                  <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              )}
            </div>
            <p className={`text-sm mt-1 ${notification.isRead ? 'text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
              {notification.message}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1">
              <span className="inline-block w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              {formatDate(notification.createdAt)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          {!notification.isRead && (
              <button
                  onClick={() => onMarkRead(notification._id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <Eye size={12} />
                Marquer comme lu
              </button>
          )}
          {notification.link && (
              <a
                  href={notification.link}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Voir
                {dir === 'rtl' ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
              </a>
          )}
          {/* FIX: Delete button always rendered — visibility controlled by parent passing the handler */}
          <button
              onClick={() => onDelete(notification._id)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
  );
};

// ── Skeleton ───────────────────────────────────────────────────────────────────
const SkeletonCard: React.FC = () => (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg w-full" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg w-2/3" />
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-lg w-1/3" />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-lg w-20" />
        <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-lg w-16" />
      </div>
    </div>
);

// ── Empty State ────────────────────────────────────────────────────────────────
const EmptyState: React.FC = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Bell size={32} className="text-gray-400" />
      </div>
      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
        Aucune notification
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
        Vous n'avez pas de notifications pour le moment
      </p>
    </div>
);

// ── Delete Confirm Dialog ──────────────────────────────────────────────────────
const DeleteConfirmDialog: React.FC<{
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            Confirmer la suppression
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Cette notification sera définitivement supprimée.
          </p>
          <div className="flex justify-end gap-3">
            <button
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Annuler
            </button>
            <button
                onClick={onConfirm}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
  );
};

// ── Section Label ──────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1 mb-2">
      {label}
    </p>
);

// ── Main Page ──────────────────────────────────────────────────────────────────
const NotificationsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const lang = i18n.language; // FIX: use i18n.language directly, not t('language')
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  // FIX: removed isMobile state — use Tailwind responsive classes instead
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const {
    data: notifications = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll(),
    refetchInterval: 30000,
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notif-count'] });
      toast.success(t('notifications.markedRead', 'Notification marquée comme lue'));
    },
    onError: () => toast.error(t('error.generic', 'Une erreur est survenue')),
  });

  const markAllMut = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notif-count'] });
      toast.success(t('notifications.allMarkedRead', 'Toutes les notifications ont été marquées comme lues'));
    },
    onError: () => toast.error(t('error.generic', 'Une erreur est survenue')),
  });

  // FIX: delete mutation is now active — add notificationsApi.delete if missing
  const deleteMut = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notif-count'] });
      toast.success(t('notifications.deleted', 'Notification supprimée'));
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error(t('error.generic', 'Une erreur est survenue'));
      setDeleteTarget(null);
    },
  });

  // FIX: now properly triggers the confirm dialog
  const handleDelete = (id: string) => setDeleteTarget(id);

  const confirmDelete = () => {
    if (deleteTarget) deleteMut.mutate(deleteTarget);
  };

  const cancelDelete = () => setDeleteTarget(null);

  // FIX: split notifications into two arrays for proper grouped rendering
  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);
  const unreadCount = unread.length;
  const readCount = read.length;

  return (
      <div className="space-y-3" dir={dir}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell size={22} />
              {t('notifications.title', 'Notifications')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {unreadCount > 0 ? (
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                {unreadCount}{' '}
                    {unreadCount > 1
                        ? t('notifications.unreadPlural', 'non lues')
                        : t('notifications.unread', 'non lue')}
              </span>
              ) : (
                  <span className="flex items-center gap-1">
                <CheckCheck size={12} />
                    {t('notifications.allRead', 'Tout est à jour')}
              </span>
              )}
              {readCount > 0 && unreadCount === 0 && (
                  <span className="text-gray-400 ml-2">
                · {readCount}{' '}
                    {readCount > 1
                        ? t('notifications.readPlural', 'lues')
                        : t('notifications.read', 'lue')}
              </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                title={t('common.refresh', 'Actualiser')}
            >
              <RefreshCw size={15} className={isRefetching ? 'animate-spin' : ''} />
            </button>
            {unreadCount > 0 && (
                <button
                    onClick={() => markAllMut.mutate()}
                    disabled={markAllMut.isPending}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-60"
                >
                  <CheckCheck size={15} />
                  {/* FIX: Tailwind responsive text instead of isMobile state */}
                  <span className="sm:hidden">{t('notifications.markAllShort', 'Tout marquer')}</span>
                  <span className="hidden sm:inline">{t('notifications.markAllRead', 'Tout marquer comme lu')}</span>
                </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {notifications.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:hidden">
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 border border-gray-100 dark:border-gray-800 text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{unreadCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('notifications.unread', 'non lue')}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 border border-gray-100 dark:border-gray-800 text-center">
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{readCount}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('notifications.read', 'lue')}
                </p>
              </div>
            </div>
        )}

        {/* List */}
        {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
            </div>
        ) : notifications.length === 0 ? (
            <EmptyState />
        ) : (
            <div className="space-y-4">
              {/* FIX: properly separated unread / read sections */}
              {unread.length > 0 && (
                  <div>
                    <SectionLabel label={`${t('notifications.new', 'Nouvelles')} (${unreadCount})`} />
                    <div className="space-y-3">
                      {unread.map((n) => (
                          <NotificationCard
                              key={n._id}
                              notification={n}
                              onMarkRead={(id) => markReadMut.mutate(id)}
                              onDelete={handleDelete}
                              lang={lang}
                              dir={dir}
                          />
                      ))}
                    </div>
                  </div>
              )}

              {read.length > 0 && (
                  <div>
                    {unread.length > 0 && (
                        <SectionLabel label={`${t('notifications.readPlural', 'Lues')} (${readCount})`} />
                    )}
                    <div className="space-y-3">
                      {read.map((n) => (
                          <NotificationCard
                              key={n._id}
                              notification={n}
                              onMarkRead={(id) => markReadMut.mutate(id)}
                              onDelete={handleDelete}
                              lang={lang}
                              dir={dir}
                          />
                      ))}
                    </div>
                  </div>
              )}
            </div>
        )}

        {/* Footer */}
        {notifications.length > 0 && !isLoading && (
            <div className="text-center pt-2">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {t(
                    'notifications.autoRefresh',
                    'Les notifications sont mises à jour automatiquement toutes les 30 secondes',
                )}
              </p>
            </div>
        )}

        {/* Delete Dialog */}
        <DeleteConfirmDialog
            isOpen={!!deleteTarget}
            onConfirm={confirmDelete}
            onCancel={cancelDelete}
        />
      </div>
  );
};

export default NotificationsPage;