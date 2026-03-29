import React, { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchKeys?: string[];
  actions?: (row: T) => React.ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

function DataTable<T extends Record<string, any>>({
                                                    data,
                                                    columns,
                                                    searchable = false,
                                                    searchKeys = [],
                                                    actions,
                                                    isLoading,
                                                    emptyMessage = 'Aucune donnée',
                                                    onRowClick,
                                                  }: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    let result = [...data];
    if (search && searchKeys.length > 0) {
      const q = search.toLowerCase();
      result = result.filter((row) =>
          searchKeys.some((key) => {
            const val = key.split('.').reduce((obj, k) => obj?.[k], row);
            return String(val || '').toLowerCase().includes(q);
          })
      );
    }
    if (sortKey) {
      result.sort((a, b) => {
        const aVal = sortKey.split('.').reduce((obj: any, k) => obj?.[k], a);
        const bVal = sortKey.split('.').reduce((obj: any, k) => obj?.[k], b);
        const cmp = String(aVal || '').localeCompare(String(bVal || ''), undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [data, search, searchKeys, sortKey, sortDir]);

  return (
      <div className="space-y-4">
        {searchable && (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                  type="text"
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              {columns.map((col) => (
                  <th
                      key={col.key}
                      className={`px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400 ${col.sortable ? 'cursor-pointer hover:text-gray-900 dark:hover:text-white select-none' : ''} ${col.className || ''}`}
                      style={col.width ? { width: col.width } : {}}
                      onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.header}
                      {col.sortable && (
                          <span className="text-gray-400">
                        {sortKey === col.key ? (
                            sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : (
                            <ChevronsUpDown size={14} />
                        )}
                      </span>
                      )}
                    </div>
                  </th>
              ))}
              {actions && (
                  <th className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-400">
                    Actions
                  </th>
              )}
            </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {columns.map((col) => (
                          <td key={col.key} className="px-4 py-3">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                          </td>
                      ))}
                      {actions && (
                          <td className="px-4 py-3">
                            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto" />
                          </td>
                      )}
                    </tr>
                ))
            ) : filtered.length === 0 ? (
                <tr>
                  <td
                      colSpan={columns.length + (actions ? 1 : 0)}
                      className="px-4 py-12 text-center text-gray-400 dark:text-gray-500"
                  >
                    {emptyMessage}
                  </td>
                </tr>
            ) : (
                filtered.map((row, i) => (
                    <tr
                        key={row._id || i}
                        className={`bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                        onClick={() => onRowClick?.(row)}
                    >
                      {columns.map((col) => (
                          <td
                              key={col.key}
                              className={`px-4 py-3 text-gray-700 dark:text-gray-300 ${col.className || ''}`}
                          >
                            {col.render
                                ? col.render(col.key.split('.').reduce((obj: any, k) => obj?.[k], row), row)
                                : col.key.split('.').reduce((obj: any, k) => obj?.[k], row) ?? '-'}
                          </td>
                      ))}
                      {actions && (
                          <td
                              className="px-4 py-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                          >
                            {actions(row)}
                          </td>
                      )}
                    </tr>
                ))
            )}
            </tbody>
          </table>
        </div>

        {!isLoading && filtered.length > 0 && search && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {filtered.length} résultat{filtered.length > 1 ? 's' : ''} pour "{search}"
            </p>
        )}
      </div>
  );
}

export default DataTable;