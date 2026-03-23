// import React, { useState } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { quotesApi, productsApi } from '../../api';
// import DataTable from '../../components/common/DataTable';
// import ConfirmDialog from '../../components/common/ConfirmDialog';
// import { useConfirmDialog } from '../../hooks/useConfirmDialog';
// import { useI18n } from '../../context/I18nContext';
// import { Plus, Trash2, X, FileText, Eye, CheckCircle, Clock, XCircle, Send } from 'lucide-react';
// import toast from 'react-hot-toast';
// import { format } from 'date-fns';
//
// const formatTND = (v: number) => `${(v || 0).toFixed(3)} TND`;
// const emptyItem = () => ({ productId: '', productName: '', quantity: 1, unitPrice: 0, tva: 19 });
//
// const QuotesPage: React.FC = () => {
//   const { t, dir } = useI18n();
//   const queryClient = useQueryClient();
//   const { state: confirmState, confirm, proceed, cancel } = useConfirmDialog();
//   const [showForm, setShowForm] = useState(false);
//   const [detailQuote, setDetailQuote] = useState<any>(null);
//   const [form, setForm] = useState({
//     clientName: '', clientPhone: '', clientEmail: '', clientAddress: '',
//     validUntil: '', notes: '', items: [emptyItem()],
//   });
//
//   // ── Status config (uses t()) ───────────────────────────────────────────────
//   const STATUS_MAP: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
//     draft:    { label: t('quotes.status.draft'),    cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',           icon: <Clock size={11} /> },
//     sent:     { label: t('quotes.status.sent'),     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',        icon: <Send size={11} /> },
//     accepted: { label: t('quotes.status.accepted'), cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',    icon: <CheckCircle size={11} /> },
//     rejected: { label: t('quotes.status.rejected'), cls: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',            icon: <XCircle size={11} /> },
//     expired:  { label: t('quotes.status.expired'),  cls: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300', icon: <Clock size={11} /> },
//   };
//
//   const statusBadge = (status: string) => {
//     const s = STATUS_MAP[status] || { label: '—', cls: 'bg-gray-100 text-gray-500', icon: null };
//     return (
//         <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>
//         {s.icon}{s.label}
//       </span>
//     );
//   };
//
//   // ── Queries & Mutations ───────────────────────────────────────────────────
//   const { data: quotes = [], isLoading } = useQuery({ queryKey: ['quotes'], queryFn: () => quotesApi.getAll() });
//   const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => productsApi.getAll() });
//
//   const createMut = useMutation({
//     mutationFn: quotesApi.create,
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['quotes'] });
//       toast.success(t('quotes.created'));
//       setShowForm(false);
//       setForm({ clientName: '', clientPhone: '', clientEmail: '', clientAddress: '', validUntil: '', notes: '', items: [emptyItem()] });
//     },
//   });
//
//   const updateStatusMut = useMutation({
//     mutationFn: ({ id, status }: { id: string; status: string }) => quotesApi.update(id, { status }),
//     onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotes'] }); toast.success(t('quotes.statusUpdated')); },
//   });
//
//   const deleteMut = useMutation({
//     mutationFn: quotesApi.remove,
//     onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotes'] }); toast.success(t('quotes.deleted')); },
//   });
//
//   const handleDelete = (q: any) => confirm(
//       {
//         title: `${t('quotes.deleteTitle')} "${q.clientName}"`,
//         message: t('quotes.deleteMsg'),
//         dangerMessage: t('quotes.deleteDanger'),
//         confirmLabel: t('quotes.deleteConfirm'),
//       },
//       () => deleteMut.mutate(q._id),
//   );
//
//   const handleDownloadPDF = async (id: string, clientName: string) => {
//     try {
//       const blob = await quotesApi.getInvoice(id);
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement('a');
//       a.href = url; a.download = `devis-${clientName}.pdf`; a.click();
//       URL.revokeObjectURL(url);
//     } catch {
//       toast.error(t('quotes.pdfError'));
//     }
//   };
//
//   const selectProduct = (i: number, productId: string) => {
//     const p = (products as any[]).find((p: any) => p._id === productId);
//     setForm(f => ({
//       ...f,
//       items: f.items.map((item, idx) =>
//           idx === i ? { ...item, productId: p?._id || '', productName: p?.name || '', unitPrice: p?.salePrice || 0, tva: p?.tva || 0 } : item,
//       ),
//     }));
//   };
//
//   const totalHT  = form.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
//   const totalTVA = form.items.reduce((s, i) => s + i.quantity * i.unitPrice * i.tva / 100, 0);
//   const totalTTC = totalHT + totalTVA;
//
//   const inp = 'w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';
//
//   const columns = [
//     { key: 'clientName', header: t('quotes.client'),     sortable: true, render: (v: string) => <span className="font-medium">{v}</span> },
//     { key: 'totalTTC',   header: t('quotes.totalTTC'),   render: formatTND, sortable: true },
//     { key: 'status',     header: t('common.status'),     render: (v: string) => statusBadge(v || 'draft') },
//     { key: 'validUntil', header: t('quotes.validUntil'), render: (v: string) => v ? format(new Date(v), 'dd/MM/yyyy') : '—', sortable: true },
//     { key: 'createdAt',  header: t('quotes.createdAt'),  render: (v: string) => v ? format(new Date(v), 'dd/MM/yyyy') : '-', sortable: true },
//   ];
//
//   return (
//       <div className="space-y-6" dir={dir}>
//
//         {/* ── Header ── */}
//         <div className="flex items-center justify-between">
//           <div>
//             <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('quotes.title')}</h1>
//             <p className="text-gray-500 dark:text-gray-400 text-sm">{(quotes as any[]).length} {t('quotes.title').toLowerCase()}</p>
//           </div>
//           <button
//               onClick={() => setShowForm(true)}
//               className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium"
//           >
//             <Plus size={16} /> {t('quotes.new')}
//           </button>
//         </div>
//
//         {/* ── Table ── */}
//         <DataTable
//             data={quotes as any[]} columns={columns} searchKeys={['clientName', 'status']}
//             isLoading={isLoading} emptyMessage={t('quotes.noQuotes')}
//             actions={(row) => (
//                 <div className="flex items-center justify-end gap-1">
//                   <button onClick={() => setDetailQuote(row)} className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title={t('quotes.detail')}>
//                     <Eye size={15} />
//                   </button>
//                   <button onClick={() => handleDownloadPDF(row._id, row.clientName)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg" title={t('quotes.downloadPdf')}>
//                     <FileText size={15} />
//                   </button>
//                   <button onClick={() => handleDelete(row)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg" title={t('common.delete')}>
//                     <Trash2 size={15} />
//                   </button>
//                 </div>
//             )}
//         />
//
//         {/* ══════════════════════════════════════════════════
//           Detail Modal
//       ══════════════════════════════════════════════════ */}
//         {detailQuote && (
//             <div className="fixed inset-0 z-40 flex items-center justify-center">
//               <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDetailQuote(null)} />
//               <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto" dir={dir}>
//                 <button onClick={() => setDetailQuote(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
//                   <X size={18} />
//                 </button>
//
//                 {/* Title row */}
//                 <div className="flex items-center gap-3 mb-5">
//                   <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
//                     <FileText size={20} className="text-indigo-600" />
//                   </div>
//                   <div>
//                     <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
//                       {t('quotes.detail')} — {detailQuote.clientName}
//                     </h2>
//                     <p className="text-xs text-gray-400">
//                       {t('quotes.createdAt')} {detailQuote.createdAt ? format(new Date(detailQuote.createdAt), 'dd/MM/yyyy') : '—'}
//                     </p>
//                   </div>
//                   <div className="ml-auto">{statusBadge(detailQuote.status || 'draft')}</div>
//                 </div>
//
//                 {/* Client info */}
//                 <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4 grid grid-cols-2 gap-2 text-sm">
//                   {detailQuote.clientPhone   && <p className="text-gray-500">{t('quotes.clientPhone')} : <span className="text-gray-800 dark:text-gray-200 font-medium">{detailQuote.clientPhone}</span></p>}
//                   {detailQuote.clientEmail   && <p className="text-gray-500">{t('quotes.clientEmail')} : <span className="text-gray-800 dark:text-gray-200 font-medium">{detailQuote.clientEmail}</span></p>}
//                   {detailQuote.clientAddress && <p className="text-gray-500 col-span-2">{t('quotes.clientAddress')} : <span className="text-gray-800 dark:text-gray-200 font-medium">{detailQuote.clientAddress}</span></p>}
//                   {detailQuote.validUntil    && <p className="text-gray-500">{t('quotes.validUntil')} : <span className="text-gray-800 dark:text-gray-200 font-medium">{format(new Date(detailQuote.validUntil), 'dd/MM/yyyy')}</span></p>}
//                   {detailQuote.createdByName && <p className="text-gray-500">{t('quotes.createdBy')} : <span className="text-gray-800 dark:text-gray-200 font-medium">{detailQuote.createdByName}</span></p>}
//                 </div>
//
//                 {/* Items table */}
//                 <div className="overflow-x-auto mb-4">
//                   <table className="w-full text-xs">
//                     <thead>
//                     <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
//                       <th className="text-left pb-2">{t('quotes.designation')}</th>
//                       <th className="pb-2 text-right w-14">{t('quotes.qty')}</th>
//                       <th className="pb-2 text-right w-24">{t('quotes.unitPriceHT')}</th>
//                       <th className="pb-2 text-right w-14">{t('quotes.tva')}</th>
//                       <th className="pb-2 text-right w-24">{t('quotes.totalTTC')}</th>
//                     </tr>
//                     </thead>
//                     <tbody>
//                     {(detailQuote.items || []).map((item: any, i: number) => (
//                         <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
//                           <td className="py-1.5 font-medium text-gray-800 dark:text-gray-200">{item.productName || '—'}</td>
//                           <td className="py-1.5 text-right text-gray-600 dark:text-gray-400">{item.quantity}</td>
//                           <td className="py-1.5 text-right text-gray-600 dark:text-gray-400">{formatTND(item.unitPrice)}</td>
//                           <td className="py-1.5 text-right text-gray-600 dark:text-gray-400">{item.tva}%</td>
//                           <td className="py-1.5 text-right font-medium text-gray-800 dark:text-gray-200">{formatTND(item.totalTTC)}</td>
//                         </tr>
//                     ))}
//                     </tbody>
//                   </table>
//                 </div>
//
//                 {/* Totals */}
//                 <div className="flex justify-end mb-4">
//                   <div className="text-right space-y-1 text-sm min-w-[200px]">
//                     <div className="flex justify-between gap-8 text-gray-500">
//                       <span>{t('quotes.totalHT')}</span>
//                       <span className="text-gray-700 dark:text-gray-300">{formatTND(detailQuote.totalHT)}</span>
//                     </div>
//                     <div className="flex justify-between gap-8 text-gray-500">
//                       <span>{t('quotes.totalTVA')}</span>
//                       <span className="text-gray-700 dark:text-gray-300">{formatTND(detailQuote.totalTTC - detailQuote.totalHT)}</span>
//                     </div>
//                     <div className="flex justify-between gap-8 font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-1">
//                       <span>{t('quotes.totalTTC')}</span>
//                       <span>{formatTND(detailQuote.totalTTC)}</span>
//                     </div>
//                   </div>
//                 </div>
//
//                 {/* Notes */}
//                 {detailQuote.notes && (
//                     <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800/30 rounded-xl p-3 mb-4 text-xs text-yellow-800 dark:text-yellow-200">
//                       <span className="font-semibold">{t('quotes.notes')} : </span>{detailQuote.notes}
//                     </div>
//                 )}
//
//                 {/* Status change + PDF */}
//                 <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
//                   {(['draft', 'sent', 'accepted', 'rejected'] as const).map(s => (
//                       <button
//                           key={s}
//                           disabled={detailQuote.status === s || updateStatusMut.isPending}
//                           onClick={() => {
//                             updateStatusMut.mutate({ id: detailQuote._id, status: s });
//                             setDetailQuote((q: any) => ({ ...q, status: s }));
//                           }}
//                           className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed
//                     ${detailQuote.status === s
//                               ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
//                               : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400'}`}
//                       >
//                         {STATUS_MAP[s].label}
//                       </button>
//                   ))}
//                   <button
//                       onClick={() => handleDownloadPDF(detailQuote._id, detailQuote.clientName)}
//                       className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium"
//                   >
//                     <FileText size={13} /> {t('quotes.downloadPdf')}
//                   </button>
//                 </div>
//               </div>
//             </div>
//         )}
//
//         {/* ══════════════════════════════════════════════════
//           New Quote Form Modal
//       ══════════════════════════════════════════════════ */}
//         {showForm && (
//             <div className="fixed inset-0 z-40 flex items-center justify-center">
//               <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
//               <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto" dir={dir}>
//                 <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
//                   <X size={18} />
//                 </button>
//                 <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">{t('quotes.new')}</h2>
//
//                 <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form as any); }} className="space-y-4">
//
//                   {/* Client info */}
//                   <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
//                     <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('quotes.client')}</h3>
//                     <div className="grid grid-cols-2 gap-3">
//                       <div>
//                         <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
//                           {t('common.name')} <span className="text-red-500">*</span>
//                         </label>
//                         <input required value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} className={inp} />
//                       </div>
//                       <div>
//                         <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('quotes.clientPhone')}</label>
//                         <input value={form.clientPhone} onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))} className={inp} />
//                       </div>
//                       <div>
//                         <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('quotes.clientEmail')}</label>
//                         <input type="email" value={form.clientEmail} onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))} className={inp} />
//                       </div>
//                       <div>
//                         <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('quotes.clientAddress')}</label>
//                         <input value={form.clientAddress} onChange={e => setForm(f => ({ ...f, clientAddress: e.target.value }))} className={inp} />
//                       </div>
//                     </div>
//                   </div>
//
//                   {/* Items */}
//                   <div>
//                     <div className="flex items-center justify-between mb-2">
//                   <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
//                     {t('quotes.items')} <span className="text-red-500">*</span>
//                   </span>
//                       <button type="button" onClick={() => setForm(f => ({ ...f, items: [...f.items, emptyItem()] }))} className="text-xs text-blue-600 hover:underline">
//                         {t('quotes.addLine')}
//                       </button>
//                     </div>
//                     <div className="overflow-x-auto">
//                       <table className="w-full text-xs">
//                         <thead>
//                         <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
//                           <th className="text-left pb-2">{t('quotes.designation')}</th>
//                           <th className="pb-2 w-16 text-left">{t('quotes.qty')}</th>
//                           <th className="pb-2 w-24 text-left">{t('quotes.unitPriceHT')}</th>
//                           <th className="pb-2 w-16 text-left">{t('quotes.tva')}</th>
//                           <th className="pb-2 w-20 text-right">{t('quotes.totalHT')}</th>
//                           <th className="w-8" />
//                         </tr>
//                         </thead>
//                         <tbody>
//                         {form.items.map((item, i) => (
//                             <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
//                               <td className="pr-2 py-1">
//                                 <select value={item.productId} onChange={e => selectProduct(i, e.target.value)} className="w-full px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none text-xs">
//                                   <option value="">— — —</option>
//                                   {(products as any[]).map((p: any) => <option key={p._id} value={p._id}>{p.name}</option>)}
//                                 </select>
//                               </td>
//                               <td className="pr-1 py-1">
//                                 <input type="number" min={1} value={item.quantity}
//                                        onChange={e => setForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, quantity: +e.target.value } : x) }))}
//                                        className="w-full px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs focus:outline-none" />
//                               </td>
//                               <td className="pr-1 py-1">
//                                 <input type="number" min={0} step={0.001} value={item.unitPrice}
//                                        onChange={e => setForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, unitPrice: +e.target.value } : x) }))}
//                                        className="w-full px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs focus:outline-none" />
//                               </td>
//                               <td className="pr-1 py-1">
//                                 <input type="number" min={0} value={item.tva}
//                                        onChange={e => setForm(f => ({ ...f, items: f.items.map((x, j) => j === i ? { ...x, tva: +e.target.value } : x) }))}
//                                        className="w-full px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs focus:outline-none" />
//                               </td>
//                               <td className="text-right py-1 text-gray-600 dark:text-gray-300">{(item.quantity * item.unitPrice).toFixed(3)}</td>
//                               <td>
//                                 {form.items.length > 1 && (
//                                     <button type="button" onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))} className="text-red-400 ml-1 hover:text-red-600">✕</button>
//                                 )}
//                               </td>
//                             </tr>
//                         ))}
//                         </tbody>
//                       </table>
//                     </div>
//                     <div className="mt-2 text-right space-y-0.5">
//                       <p className="text-xs text-gray-500">{t('quotes.totalHT')}: <strong className="text-gray-700 dark:text-gray-300">{formatTND(totalHT)}</strong></p>
//                       <p className="text-xs text-gray-500">{t('quotes.totalTVA')}: <strong className="text-gray-700 dark:text-gray-300">{formatTND(totalTVA)}</strong></p>
//                       <p className="text-sm font-bold text-gray-900 dark:text-white">{t('quotes.totalTTC')}: {formatTND(totalTTC)}</p>
//                     </div>
//                   </div>
//
//                   {/* Valid until + notes */}
//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('quotes.validUntil')}</label>
//                       <input type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} className={inp} />
//                     </div>
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('quotes.notes')}</label>
//                       <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inp} />
//                     </div>
//                   </div>
//
//                   <div className="flex gap-3 pt-2">
//                     <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium">
//                       {t('common.cancel')}
//                     </button>
//                     <button type="submit" disabled={createMut.isPending} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium">
//                       {createMut.isPending ? t('quotes.creating') : t('quotes.create')}
//                     </button>
//                   </div>
//                 </form>
//               </div>
//             </div>
//         )}
//
//         <ConfirmDialog {...confirmState} onProceed={proceed} onCancel={cancel} />
//       </div>
//   );
// };
//
// export default QuotesPage;


import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quotesApi, productsApi } from '../../api';
import DataTable from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { useI18n } from '../../context/I18nContext';
import {
  Plus, Trash2, X, FileText, Eye,
  CheckCircle, Clock, XCircle, Send, ShoppingCart,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ── Helpers ────────────────────────────────────────────────────────────────
const formatTND = (v: number) => `${(v || 0).toFixed(3)} TND`;
const emptyItem = () => ({ productId: '', productName: '', quantity: 1, unitPrice: 0, tva: 19 });

// ── Types locaux ───────────────────────────────────────────────────────────
interface FormItem {
  productId:   string;
  productName: string;
  quantity:    number;
  unitPrice:   number;
  tva:         number;
}

interface QuoteForm {
  clientName:    string;
  clientPhone:   string;
  clientEmail:   string;
  clientAddress: string;
  validUntil:    string;
  notes:         string;
  items:         FormItem[];
}

// ── Calcul TVA ligne par ligne (cohérence avec le backend) ─────────────────
const computeLine = (item: FormItem) => {
  const ht  = item.quantity * item.unitPrice;
  const tva = ht * (item.tva / 100);
  return { ht, tva, ttc: ht + tva };
};

const QuotesPage: React.FC = () => {
  const { t, dir } = useI18n();
  const queryClient = useQueryClient();
  const { state: confirmState, confirm, proceed, cancel } = useConfirmDialog();

  const [showForm,    setShowForm]    = useState(false);
  const [detailQuote, setDetailQuote] = useState<any>(null);

  const initialForm: QuoteForm = {
    clientName: '', clientPhone: '', clientEmail: '', clientAddress: '',
    validUntil: '', notes: '', items: [emptyItem()],
  };
  const [form, setForm] = useState<QuoteForm>(initialForm);

  // ── Status config ──────────────────────────────────────────────────────────
  const STATUS_MAP: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    draft:    { label: t('quotes.status.draft'),    cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',            icon: <Clock size={11} /> },
    sent:     { label: t('quotes.status.sent'),     cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',         icon: <Send size={11} /> },
    accepted: { label: t('quotes.status.accepted'), cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',     icon: <CheckCircle size={11} /> },
    rejected: { label: t('quotes.status.rejected'), cls: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',             icon: <XCircle size={11} /> },
    expired:  { label: t('quotes.status.expired'),  cls: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300', icon: <Clock size={11} /> },
  };

  const statusBadge = (status: string) => {
    const s = STATUS_MAP[status] || { label: '—', cls: 'bg-gray-100 text-gray-500', icon: null };
    return (
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>
        {s.icon}{s.label}
      </span>
    );
  };

  // ── Queries & Mutations ────────────────────────────────────────────────────
  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn:  () => quotesApi.getAll(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn:  () => productsApi.getAll(),
  });

  const createMut = useMutation({
    mutationFn: quotesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(t('quotes.created'));
      setShowForm(false);
      setForm(initialForm);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || t('common.error')),
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
        quotesApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(t('quotes.statusUpdated'));
    },
  });

  // FIX : mutation pour la conversion réelle en vente
  const convertMut = useMutation({
    mutationFn: (id: string) => quotesApi.convertToSale(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['ventes'] }); // Rafraîchit aussi la liste des ventes
      toast.success(data?.message || t('quotes.converted'));
      setDetailQuote((q: any) => q ? { ...q, status: 'accepted' } : q);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || t('quotes.convertError')),
  });

  const deleteMut = useMutation({
    mutationFn: quotesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(t('quotes.deleted'));
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDelete = (q: any) =>
      confirm(
          {
            title:        `${t('quotes.deleteTitle')} "${q.clientName}"`,
            message:      t('quotes.deleteMsg'),
            dangerMessage: t('quotes.deleteDanger'),
            confirmLabel:  t('quotes.deleteConfirm'),
          },
          () => deleteMut.mutate(q._id),
      );

  const handleConvert = (q: any) =>
      confirm(
          {
            title:        t('quotes.convertTitle'),
            message:      t('quotes.convertMsg'),
            confirmLabel:  t('quotes.convertConfirm'),
          },
          () => convertMut.mutate(q._id),
      );

  const handleDownloadPDF = async (id: string, clientName: string) => {
    try {
      const blob = await quotesApi.getInvoice(id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `devis-${clientName}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('quotes.pdfError'));
    }
  };

  const selectProduct = (i: number, productId: string) => {
    const p = (products as any[]).find((p: any) => p._id === productId);
    setForm((f) => ({
      ...f,
      items: f.items.map((item, idx) =>
          idx === i
              ? {
                ...item,
                productId:   p?._id    || '',
                productName: p?.name   || '',
                unitPrice:   p?.salePrice || 0,
                tva:         p?.tva    ?? 19,
              }
              : item,
      ),
    }));
  };

  // Totaux recalculés côté client (affichage uniquement — le backend recalcule aussi)
  const totalHT  = form.items.reduce((s, i) => s + computeLine(i).ht,  0);
  const totalTVA = form.items.reduce((s, i) => s + computeLine(i).tva, 0);
  const totalTTC = totalHT + totalTVA;

  // ── Style input réutilisable ───────────────────────────────────────────────
  const inp = [
    'w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700',
    'bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
  ].join(' ');

  // ── Colonnes DataTable ─────────────────────────────────────────────────────
  const columns = [
    {
      key: 'quoteNumber', header: t('quotes.number'), sortable: true,
      render: (v: string) => <span className="font-mono text-xs font-medium text-blue-700 dark:text-blue-400">{v || '—'}</span>,
    },
    {
      key: 'clientName', header: t('quotes.client'), sortable: true,
      render: (v: string) => <span className="font-medium">{v}</span>,
    },
    { key: 'totalTTC',   header: t('quotes.totalTTC'),   render: formatTND, sortable: true },
    { key: 'status',     header: t('common.status'),     render: (v: string) => statusBadge(v || 'draft') },
    {
      key: 'validUntil', header: t('quotes.validUntil'), sortable: true,
      render: (v: string) => v ? format(new Date(v), 'dd/MM/yyyy') : '—',
    },
    {
      key: 'createdAt',  header: t('quotes.createdAt'),  sortable: true,
      render: (v: string) => v ? format(new Date(v), 'dd/MM/yyyy') : '-',
    },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  return (
      <div className="space-y-6" dir={dir}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('quotes.title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {(quotes as any[]).length} {t('quotes.title').toLowerCase()}
            </p>
          </div>
          <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium"
          >
            <Plus size={16} /> {t('quotes.new')}
          </button>
        </div>

        {/* ── Table ── */}
        <DataTable
            data={quotes as any[]}
            columns={columns}
            searchKeys={['clientName', 'status', 'quoteNumber']}
            isLoading={isLoading}
            emptyMessage={t('quotes.noQuotes')}
            actions={(row) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                      onClick={() => setDetailQuote(row)}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      title={t('quotes.detail')}
                  >
                    <Eye size={15} />
                  </button>
                  <button
                      onClick={() => handleDownloadPDF(row._id, row.clientName)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"
                      title={t('quotes.downloadPdf')}
                  >
                    <FileText size={15} />
                  </button>
                  {/* Bouton conversion — masqué si déjà accepté ou rejeté */}
                  {!['accepted', 'rejected', 'expired'].includes(row.status) && (
                      <button
                          onClick={() => handleConvert(row)}
                          className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
                          title={t('quotes.convertToSale')}
                      >
                        <ShoppingCart size={15} />
                      </button>
                  )}
                  <button
                      onClick={() => handleDelete(row)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                      title={t('common.delete')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
            )}
        />

        {/* ══════════════════════════════════════════════════
        Detail Modal
      ══════════════════════════════════════════════════ */}
        {detailQuote && (
            <div className="fixed inset-0 z-40 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDetailQuote(null)} />
              <div
                  className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto"
                  dir={dir}
              >
                <button
                    onClick={() => setDetailQuote(null)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={18} />
                </button>

                {/* Title row */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                    <FileText size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t('quotes.detail')} — {detailQuote.clientName}
                    </h2>
                    <p className="text-xs text-gray-400 font-mono">
                      {detailQuote.quoteNumber || detailQuote._id?.slice(-8).toUpperCase()}
                      {' · '}
                      {detailQuote.createdAt ? format(new Date(detailQuote.createdAt), 'dd/MM/yyyy') : '—'}
                    </p>
                  </div>
                  <div className="ml-auto">{statusBadge(detailQuote.status || 'draft')}</div>
                </div>

                {/* Client info */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4 grid grid-cols-2 gap-2 text-sm">
                  {detailQuote.clientPhone   && (
                      <p className="text-gray-500">{t('quotes.clientPhone')} :
                        <span className="text-gray-800 dark:text-gray-200 font-medium ml-1">{detailQuote.clientPhone}</span>
                      </p>
                  )}
                  {detailQuote.clientEmail   && (
                      <p className="text-gray-500">{t('quotes.clientEmail')} :
                        <span className="text-gray-800 dark:text-gray-200 font-medium ml-1">{detailQuote.clientEmail}</span>
                      </p>
                  )}
                  {detailQuote.clientAddress && (
                      <p className="text-gray-500 col-span-2">{t('quotes.clientAddress')} :
                        <span className="text-gray-800 dark:text-gray-200 font-medium ml-1">{detailQuote.clientAddress}</span>
                      </p>
                  )}
                  {detailQuote.validUntil    && (
                      <p className="text-gray-500">{t('quotes.validUntil')} :
                        <span className="text-gray-800 dark:text-gray-200 font-medium ml-1">
                    {format(new Date(detailQuote.validUntil), 'dd/MM/yyyy')}
                  </span>
                      </p>
                  )}
                  {detailQuote.createdByName && (
                      <p className="text-gray-500">{t('quotes.createdBy')} :
                        <span className="text-gray-800 dark:text-gray-200 font-medium ml-1">{detailQuote.createdByName}</span>
                      </p>
                  )}
                </div>

                {/* Items table */}
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-xs">
                    <thead>
                    <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                      <th className="text-left pb-2">{t('quotes.designation')}</th>
                      <th className="pb-2 text-right w-14">{t('quotes.qty')}</th>
                      <th className="pb-2 text-right w-24">{t('quotes.unitPriceHT')}</th>
                      <th className="pb-2 text-right w-14">{t('quotes.tva')}</th>
                      <th className="pb-2 text-right w-24">{t('quotes.totalHT')}</th>
                      <th className="pb-2 text-right w-24">{t('quotes.totalTVA')}</th>  {/* NOUVEAU */}
                      <th className="pb-2 text-right w-24">{t('quotes.totalTTC')}</th>
                    </tr>
                    </thead>
                    <tbody>
                    {(detailQuote.items || []).map((item: any, i: number) => {
                      const tvaAmt = item.totalTVA ?? (item.totalHT * (item.tva ?? 19) / 100);
                      return (
                          <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
                            <td className="py-1.5 font-medium text-gray-800 dark:text-gray-200">{item.productName || '—'}</td>
                            <td className="py-1.5 text-right text-gray-600 dark:text-gray-400">{item.quantity}</td>
                            <td className="py-1.5 text-right text-gray-600 dark:text-gray-400">{formatTND(item.unitPrice)}</td>
                            <td className="py-1.5 text-right text-gray-600 dark:text-gray-400">{item.tva ?? 19}%</td>
                            <td className="py-1.5 text-right text-gray-600 dark:text-gray-400">{formatTND(item.totalHT)}</td>
                            <td className="py-1.5 text-right text-amber-600 dark:text-amber-400">{formatTND(tvaAmt)}</td>
                            <td className="py-1.5 text-right font-medium text-gray-800 dark:text-gray-200">{formatTND(item.totalTTC)}</td>
                          </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-4">
                  <div className="text-right space-y-1 text-sm min-w-[220px]">
                    <div className="flex justify-between gap-8 text-gray-500">
                      <span>{t('quotes.totalHT')}</span>
                      <span className="text-gray-700 dark:text-gray-300">{formatTND(detailQuote.totalHT)}</span>
                    </div>
                    <div className="flex justify-between gap-8 text-amber-600 dark:text-amber-400">
                      <span>{t('quotes.totalTVA')}</span>
                      <span>
                    {formatTND(detailQuote.totalTVA ?? (detailQuote.totalTTC - detailQuote.totalHT))}
                  </span>
                    </div>
                    <div className="flex justify-between gap-8 font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-1">
                      <span>{t('quotes.totalTTC')}</span>
                      <span>{formatTND(detailQuote.totalTTC)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {detailQuote.notes && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800/30 rounded-xl p-3 mb-4 text-xs text-yellow-800 dark:text-yellow-200">
                      <span className="font-semibold">{t('quotes.notes')} : </span>{detailQuote.notes}
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  {/* Changement de statut */}
                  {(['draft', 'sent', 'accepted', 'rejected'] as const).map((s) => (
                      <button
                          key={s}
                          disabled={detailQuote.status === s || updateStatusMut.isPending}
                          onClick={() => {
                            updateStatusMut.mutate({ id: detailQuote._id, status: s });
                            setDetailQuote((q: any) => ({ ...q, status: s }));
                          }}
                          className={[
                            'text-xs px-3 py-1.5 rounded-lg border font-medium transition-all',
                            'disabled:opacity-40 disabled:cursor-not-allowed',
                            detailQuote.status === s
                                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400',
                          ].join(' ')}
                      >
                        {STATUS_MAP[s].label}
                      </button>
                  ))}

                  {/* Bouton Convertir en vente */}
                  {!['accepted', 'rejected', 'expired'].includes(detailQuote.status) && (
                      <button
                          disabled={convertMut.isPending}
                          onClick={() => handleConvert(detailQuote)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-xs font-medium"
                      >
                        <ShoppingCart size={13} />
                        {convertMut.isPending ? t('quotes.converting') : t('quotes.convertToSale')}
                      </button>
                  )}

                  {/* PDF */}
                  <button
                      onClick={() => handleDownloadPDF(detailQuote._id, detailQuote.clientName)}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium"
                  >
                    <FileText size={13} /> {t('quotes.downloadPdf')}
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* ══════════════════════════════════════════════════
        New Quote Form Modal
      ══════════════════════════════════════════════════ */}
        {showForm && (
            <div className="fixed inset-0 z-40 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
              <div
                  className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto"
                  dir={dir}
              >
                <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">{t('quotes.new')}</h2>

                <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      createMut.mutate(form as any);
                    }}
                    className="space-y-4"
                >
                  {/* Client info */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('quotes.client')}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          {t('common.name')} <span className="text-red-500">*</span>
                        </label>
                        <input
                            required
                            value={form.clientName}
                            onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                            className={inp}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('quotes.clientPhone')}</label>
                        <input
                            value={form.clientPhone}
                            onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))}
                            className={inp}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('quotes.clientEmail')}</label>
                        <input
                            type="email"
                            value={form.clientEmail}
                            onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))}
                            className={inp}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('quotes.clientAddress')}</label>
                        <input
                            value={form.clientAddress}
                            onChange={(e) => setForm((f) => ({ ...f, clientAddress: e.target.value }))}
                            className={inp}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('quotes.items')} <span className="text-red-500">*</span>
                  </span>
                      <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }))}
                          className="text-xs text-blue-600 hover:underline"
                      >
                        {t('quotes.addLine')}
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                        <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                          <th className="text-left pb-2">{t('quotes.designation')}</th>
                          <th className="pb-2 w-16 text-left">{t('quotes.qty')}</th>
                          <th className="pb-2 w-24 text-left">{t('quotes.unitPriceHT')}</th>
                          <th className="pb-2 w-16 text-left">{t('quotes.tva')} %</th>
                          <th className="pb-2 w-20 text-right">{t('quotes.totalHT')}</th>
                          <th className="pb-2 w-20 text-right text-amber-600">{t('quotes.totalTVA')}</th>
                          <th className="w-8" />
                        </tr>
                        </thead>
                        <tbody>
                        {form.items.map((item, i) => {
                          const { ht, tva: tvaAmt } = computeLine(item);
                          return (
                              <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
                                <td className="pr-2 py-1">
                                  <select
                                      value={item.productId}
                                      onChange={(e) => selectProduct(i, e.target.value)}
                                      className="w-full px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none text-xs"
                                  >
                                    <option value="">— Sélectionner —</option>
                                    {(products as any[]).map((p: any) => (
                                        <option key={p._id} value={p._id}>{p.name}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="pr-1 py-1">
                                  <input
                                      type="number" min={0.001} step={0.001} value={item.quantity}
                                      onChange={(e) =>
                                          setForm((f) => ({
                                            ...f,
                                            items: f.items.map((x, j) => j === i ? { ...x, quantity: +e.target.value } : x),
                                          }))
                                      }
                                      className="w-full px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs focus:outline-none"
                                  />
                                </td>
                                <td className="pr-1 py-1">
                                  <input
                                      type="number" min={0} step={0.001} value={item.unitPrice}
                                      onChange={(e) =>
                                          setForm((f) => ({
                                            ...f,
                                            items: f.items.map((x, j) => j === i ? { ...x, unitPrice: +e.target.value } : x),
                                          }))
                                      }
                                      className="w-full px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs focus:outline-none"
                                  />
                                </td>
                                <td className="pr-1 py-1">
                                  <input
                                      type="number" min={0} max={100} value={item.tva}
                                      onChange={(e) =>
                                          setForm((f) => ({
                                            ...f,
                                            items: f.items.map((x, j) => j === i ? { ...x, tva: +e.target.value } : x),
                                          }))
                                      }
                                      className="w-full px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs focus:outline-none"
                                  />
                                </td>
                                <td className="text-right py-1 text-gray-600 dark:text-gray-300 pr-2">
                                  {ht.toFixed(3)}
                                </td>
                                <td className="text-right py-1 text-amber-600 dark:text-amber-400 pr-2">
                                  {tvaAmt.toFixed(3)}
                                </td>
                                <td>
                                  {form.items.length > 1 && (
                                      <button
                                          type="button"
                                          onClick={() =>
                                              setForm((f) => ({ ...f, items: f.items.filter((_, j) => j !== i) }))
                                          }
                                          className="text-red-400 ml-1 hover:text-red-600"
                                      >
                                        ✕
                                      </button>
                                  )}
                                </td>
                              </tr>
                          );
                        })}
                        </tbody>
                      </table>
                    </div>

                    {/* Récap totaux form */}
                    <div className="mt-2 text-right space-y-0.5 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                      <p className="text-xs text-gray-500">
                        {t('quotes.totalHT')}: <strong className="text-gray-700 dark:text-gray-300">{formatTND(totalHT)}</strong>
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {t('quotes.totalTVA')}: <strong>{formatTND(totalTVA)}</strong>
                      </p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
                        {t('quotes.totalTTC')}: {formatTND(totalTTC)}
                      </p>
                    </div>
                  </div>

                  {/* Valid until + notes */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('quotes.validUntil')}
                      </label>
                      <input
                          type="date"
                          value={form.validUntil}
                          onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                          className={inp}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('quotes.notes')}
                      </label>
                      <input
                          value={form.notes}
                          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                          className={inp}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={createMut.isPending || form.items.some((i) => !i.productName)}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium"
                    >
                      {createMut.isPending ? t('quotes.creating') : t('quotes.create')}
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

export default QuotesPage;