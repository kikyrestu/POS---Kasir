import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { FileText, Download, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '@/Utils/format';
import { Card, Pagination } from '@/Components/UI';
import { useState } from 'react';

export default function SalesByInvoice({ sales, totals, filters, cashiers }) {
    const [dateFrom, setDateFrom] = useState(filters?.date_from || '');
    const [dateTo, setDateTo] = useState(filters?.date_to || '');
    const [userId, setUserId] = useState(filters?.user_id || '');

    const applyFilter = () => {
        router.get(route('reports.sales-by-invoice'), {
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            user_id: userId || undefined,
        }, { preserveState: true });
    };

    const resetFilter = () => {
        setDateFrom(''); setDateTo(''); setUserId('');
        router.get(route('reports.sales-by-invoice'), {}, { preserveState: true });
    };

    return (
        <AppLayout title="Laporan Penjualan per Invoice">
            <Head title="Laporan per Invoice" />

            <div>
                <h2 className="text-2xl font-bold text-slate-900">Laporan Penjualan per Invoice</h2>
                <p className="text-sm text-slate-500 mt-1">Ringkasan penjualan berdasarkan invoice</p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { icon: ShoppingCart, label: 'Total Transaksi', value: totals?.total_transactions || 0, color: 'blue' },
                    { icon: DollarSign, label: 'Total Penjualan', value: formatCurrency(totals?.total_sales || 0), color: 'teal' },
                    { icon: TrendingUp, label: 'Total Profit', value: formatCurrency(totals?.total_profit || 0), color: 'emerald' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5 flex items-center gap-4">
                        <div className={`p-3 rounded-xl bg-${stat.color}-50`}>
                            <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">{stat.label}</p>
                            <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
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
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Kasir</label>
                        <select value={userId} onChange={e => setUserId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                            <option value="">Semua Kasir</option>
                            {cashiers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
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
                                <th className="px-6 py-4 font-bold">Invoice</th>
                                <th className="px-6 py-4 font-bold">Tanggal</th>
                                <th className="px-6 py-4 font-bold">Kasir</th>
                                <th className="px-6 py-4 font-bold">Pelanggan</th>
                                <th className="px-6 py-4 font-bold text-right">Total</th>
                                <th className="px-6 py-4 font-bold text-right">Diskon</th>
                                <th className="px-6 py-4 font-bold text-right">Profit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {sales.data?.length > 0 ? sales.data.map(sale => (
                                <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4 font-mono font-semibold text-slate-700">{sale.invoice_number}</td>
                                    <td className="px-6 py-4 text-slate-500">{sale.sale_date}</td>
                                    <td className="px-6 py-4 text-slate-600">{sale.user?.name}</td>
                                    <td className="px-6 py-4 text-slate-600">{sale.customer?.name || 'Umum'}</td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">{formatCurrency(sale.total)}</td>
                                    <td className="px-6 py-4 text-right font-mono text-rose-500">{formatCurrency(sale.discount_amount)}</td>
                                    <td className="px-6 py-4 text-right font-mono font-semibold text-emerald-600">{formatCurrency(sale.profit)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">Tidak ada data</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {sales.links && <Pagination links={sales.links} />}
            </div>
        </AppLayout>
    );
}