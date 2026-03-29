import React from 'react';
import { cn } from '../../utils';
import { Loader2, X, AlertTriangle } from 'lucide-react';

/* ── Button ──────────────────────────────────────────────────────────────── */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props
}) => {
  const base = 'btn';
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
    outline: 'btn border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
  };
  const sizes = { sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg' };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], className)}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {children}
    </button>
  );
};

/* ── Input ───────────────────────────────────────────────────────────────── */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label, error, hint, leftIcon, rightIcon, className, id, ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={inputId} className="label">{label}</label>}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{leftIcon}</span>
        )}
        <input
          id={inputId}
          className={cn(
            'input',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            error && 'border-red-400 dark:border-red-500 focus:border-red-400 focus:ring-red-500/20',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{rightIcon}</span>
        )}
      </div>
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={12} />{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
};

/* ── Select ──────────────────────────────────────────────────────────────── */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  label, error, options, placeholder, className, id, ...props
}) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={selectId} className="label">{label}</label>}
      <select
        id={selectId}
        className={cn('input cursor-pointer', error && 'border-red-400', className)}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

/* ── Textarea ────────────────────────────────────────────────────────────── */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, className, id, ...props }) => {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={textareaId} className="label">{label}</label>}
      <textarea
        id={textareaId}
        className={cn('input resize-none', error && 'border-red-400', className)}
        rows={3}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

/* ── Badge ───────────────────────────────────────────────────────────────── */
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'red' | 'yellow' | 'blue' | 'gray' | 'purple' | 'orange';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'gray', className }) => {
  const variants = {
    green: 'badge-green',
    red: 'badge-red',
    yellow: 'badge-yellow',
    blue: 'badge-blue',
    gray: 'badge-gray',
    purple: 'badge-purple',
    orange: 'badge bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
  };
  return <span className={cn(variants[variant], className)}>{children}</span>;
};

/* ── Card ────────────────────────────────────────────────────────────────── */
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, hover, padding = true }) => (
  <div className={cn(hover ? 'card-hover' : 'card', padding && 'p-5', className)}>
    {children}
  </div>
);

/* ── StatCard ─────────────────────────────────────────────────────────────── */
interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  iconBg?: string;
  trend?: { value: number; positive?: boolean };
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title, value, sub, icon, iconBg = 'bg-primary-100 dark:bg-primary-900/30 text-primary-600', trend, loading
}) => (
  <Card>
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{title}</p>
        <p className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">
          {loading ? <span className="inline-block w-20 h-6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" /> : value}
        </p>
        {sub && <p className="mt-0.5 text-xs text-slate-400 truncate">{sub}</p>}
        {trend && (
          <p className={cn('mt-1 text-xs font-medium', trend.positive ? 'text-emerald-600' : 'text-red-500')}>
            {trend.positive ? '▲' : '▼'} {Math.abs(trend.value)}%
          </p>
        )}
      </div>
      <div className={cn('p-2.5 rounded-xl flex-shrink-0', iconBg)}>{icon}</div>
    </div>
  </Card>
);

/* ── Modal ───────────────────────────────────────────────────────────────── */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open, onClose, title, children, size = 'md', footer
}) => {
  if (!open) return null;
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />
      <div
        onClick={e => e.stopPropagation()}
        className={cn(
          'relative w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-slide-up',
          sizes[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
            <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── ConfirmDialog ───────────────────────────────────────────────────────── */
interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, title = 'Confirmation', message, confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler', onConfirm, onCancel, loading, danger = true
}) => (
  <Modal open={open} onClose={onCancel} size="sm">
    <div className="text-center">
      <div className={cn(
        'w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4',
        danger ? 'bg-red-100 dark:bg-red-900/20 text-red-600' : 'bg-primary-100 dark:bg-primary-900/20 text-primary-600'
      )}>
        <AlertTriangle size={22} />
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
      {message && <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      <div className="flex gap-3 mt-6 justify-center">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </div>
  </Modal>
);

/* ── Spinner ─────────────────────────────────────────────────────────────── */
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md', className
}) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div className={cn(
      'border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin',
      sizes[size], className
    )} />
  );
};

/* ── PageLoader ──────────────────────────────────────────────────────────── */
export const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <Spinner size="lg" />
  </div>
);

/* ── EmptyState ──────────────────────────────────────────────────────────── */
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {icon && <div className="text-slate-300 dark:text-slate-600 mb-4">{icon}</div>}
    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{title}</h3>
    {description && <p className="text-xs text-slate-400 mb-4 max-w-xs">{description}</p>}
    {action}
  </div>
);

/* ── SearchInput ─────────────────────────────────────────────────────────── */
interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder = 'Rechercher...', className }) => (
  <div className={cn('relative', className)}>
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="input pl-9"
    />
  </div>
);

/* ── Table ───────────────────────────────────────────────────────────────── */
interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  rowKey?: (row: T) => string;
}

export function DataTable<T extends Record<string, any>>({
  columns, data, loading, emptyMessage = 'Aucune donnée', rowKey
}: DataTableProps<T>) {
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} className={col.className}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col.key}>
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-sm text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={rowKey ? rowKey(row) : i}>
                {columns.map(col => (
                  <td key={col.key} className={col.className}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
