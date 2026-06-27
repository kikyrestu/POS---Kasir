import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { formatCurrency } from '@/Utils/format';
import { Pagination } from '@/Components/UI';
import { useState } from 'react';

export default function PurchasesByInvoice({ purchases, totals, filters, suppliers }) {
    const [dateFrom, setDateFrom] = useState(filters?.date_from || '');
    const [dateTo, setDateTo] = useState(filters?.date_to || '');

    const handleFilter = (key, value) => {
        router.get(route('reports.purchases-by-invoice'), { ...filters, [key]: value || undefined }, { preserveState: true });
    };

    return (
        <AppLayout title="Laporan Pembelian">
            <Head title="Laporan Pembelian" />

            <div>
                <h2 className="text-2xl font-bold text-slate-900">Laporan Pembelian Per Invoice</h2>
                <p className="text-sm text-slate-500 mt-1">Ringkasan pembelian berdasarkan invoice</p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                    <p className="text-sm text-slate-500 mb-1">Total Pembelian</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(totals?.total_purchases || 0)}</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                    <p className="text-sm text-slate-500 mb-1">Total Transaksi</p>
                    <p className="text-2xl font-bold text-slate-900">{totals?.total_transactions || 0}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5">
                <div className="flex flex-col md:flex-row gap-3">
                    <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); handleFilter('date_from', e.target.value); }}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); handleFilter('date_to', e.target.value); }}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    <select value={filters?.supplier_id || ''} onChange={e => handleFilter('supplier_id', e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                        <option value="">Semua Supplier</option>
                        {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden mt-6">
                {/* Desktop Table */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4 font-bold">Invoice</th>
                                <th className="px-6 py-4 font-bold">Tanggal</th>
                                <th className="px-6 py-4 font-bold">Supplier</th>
                                <th className="px-6 py-4 font-bold">Status</th>
                                <th className="px-6 py-4 font-bold text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {purchases?.data?.length > 0 ? purchases.data.map(purchase => (
                                <tr key={purchase.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4 font-mono font-semibold text-slate-700">{purchase.invoice_number}</td>
                                    <td className="px-6 py-4 text-slate-500">{purchase.purchase_date}</td>
                                    <td className="px-6 py-4 text-slate-700">{purchase.supplier?.name || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold border ${purchase.status === 'received' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                            {purchase.status === 'received' ? 'Diterima' : 'Pending'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">{formatCurrency(purchase.total)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">Belum ada data pembelian</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="grid grid-cols-1 gap-4 md:hidden p-4 bg-slate-50/50">
                    {purchases?.data?.length > 0 ? purchases.data.map(purchase => (
                        <div key={purchase.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                                <div>
                                    <p className="font-mono font-bold text-slate-900">{purchase.invoice_number}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{purchase.purchase_date}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${purchase.status === 'received' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                        {purchase.status === 'received' ? 'Diterima' : 'Pending'}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-end mt-1">
                                <div>
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Supplier</p>
                                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{purchase.supplier?.name || '-'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Pembelian</p>
                                    <p className="font-mono font-bold text-slate-800 text-lg">{formatCurrency(purchase.total)}</p>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-8 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                            <p className="text-sm font-medium">Belum ada data pembelian</p>
                        </div>
                    )}
                </div>

                {purchases?.links && <Pagination links={purchases.links} />}
            </div>
        </AppLayout>
    );
}
