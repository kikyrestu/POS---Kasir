import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Package } from 'lucide-react';
import { formatCurrency } from '@/Utils/format';
import { Pagination } from '@/Components/UI';
import { useState } from 'react';

export default function SalesByItem({ items, filters }) {
    const [dateFrom, setDateFrom] = useState(filters?.date_from || '');
    const [dateTo, setDateTo] = useState(filters?.date_to || '');

    const applyFilter = () => {
        router.get(route('reports.sales-by-item'), {
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        }, { preserveState: true });
    };

    const resetFilter = () => {
        setDateFrom(''); setDateTo('');
        router.get(route('reports.sales-by-item'), {}, { preserveState: true });
    };

    return (
        <AppLayout title="Laporan Penjualan per Item">
            <Head title="Laporan per Item" />

            <div>
                <h2 className="text-2xl font-bold text-slate-900">Laporan Penjualan per Item</h2>
                <p className="text-sm text-slate-500 mt-1">Detail penjualan berdasarkan produk</p>
            </div>

            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5">
                <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Dari Tanggal</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Sampai Tanggal</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={applyFilter} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors">Filter</button>
                        <button onClick={resetFilter} className="px-5 py-2.5 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors">Reset</button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4 font-bold">#</th>
                                <th className="px-6 py-4 font-bold">Produk</th>
                                <th className="px-6 py-4 font-bold text-right">Qty Terjual</th>
                                <th className="px-6 py-4 font-bold text-right">Total Penjualan</th>
                                <th className="px-6 py-4 font-bold text-right">Total Profit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {items.data?.length > 0 ? items.data.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4 text-slate-400 font-mono">{idx + 1 + (items.current_page - 1) * items.per_page}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
                                                <Package className="w-4 h-4 text-slate-300" />
                                            </div>
                                            <span className="font-semibold text-slate-800">{item.product?.name || 'Produk dihapus'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-semibold text-slate-700">{item.total_qty}</td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">{formatCurrency(item.total_sales)}</td>
                                    <td className="px-6 py-4 text-right font-mono font-semibold text-emerald-600">{formatCurrency(item.total_profit)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">Tidak ada data</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {items.links && <Pagination links={items.links} />}
            </div>
        </AppLayout>
    );
}