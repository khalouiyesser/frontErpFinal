import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/** Format number as TND currency */
export const formatTND = (value: number | undefined | null, decimals = 3): string => {
  const v = value ?? 0;
  return `${v.toFixed(decimals)} TND`;
};

/** Format date to locale string */
export const formatDate = (date: string | Date | undefined, locale = 'fr-TN'): string => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/** Format date + time */
export const formatDateTime = (date: string | Date | undefined, locale = 'fr-TN'): string => {
  if (!date) return '—';
  return new Date(date).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Download blob as file */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/** Get status badge class */
export const getStatusClass = (status: string): string => {
  const map: Record<string, string> = {
    paid: 'badge-green',
    partial: 'badge-yellow',
    pending: 'badge-red',
    active: 'badge-green',
    trial: 'badge-blue',
    expired: 'badge-red',
    suspended: 'badge-gray',
    draft: 'badge-gray',
    sent: 'badge-blue',
    accepted: 'badge-green',
    rejected: 'badge-red',
  };
  return map[status] ?? 'badge-gray';
};

/** Truncate text */
export const truncate = (text: string, max = 40): string =>
  text.length > max ? `${text.slice(0, max)}…` : text;

/** Debounce */
export const debounce = <T extends (...args: any[]) => void>(fn: T, delay: number) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};
