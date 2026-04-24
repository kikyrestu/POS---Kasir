import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { DownloadCloud, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { formatCurrency } from '@/Utils/format';
import { useState } from 'react';

export default function ProfitLoss({ salesData, totals, filters }) {
    const [dateFrom, setDateFrom] = useState(filters?.date_from || '');
    const [dateTo, setDateTo] = useState(filters?.date_to || '');

    const handleFilter = (e) => {
        e?.preventDefault();
        router.get(route('reports.profit-loss'), { date_from: dateFrom, date_to: dateTo }, { preserveState: true });
    };

    const handleExport = () => {
        window.location.href = route('reports.profit-loss', { date_from: dateFrom, date_to: dateTo, export: 'excel' });
    };

    return (
        <AppLayout title="Laporan Laba / Rugi">
            <Head title="Profit & Loss" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Laporan Laba / Rugi</h2>
                    <p className="text-sm text-slate-500 mt-1">Laporan harian pendapatan kotor, diskon, dan keuntungan (laba)</p>
                </div>
                <button onClick={handleExport} className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md hover:bg-emerald-700 transition-all">
                    <DownloadCloud className="w-4 h-4" /> Export Excel
                </button>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5 flex flex-wrap gap-4 items-end">
                <div className="flex items-center gap-2">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Dari Tanggal</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                    </div>
                    <span className="text-slate-400 mt-5">-</span>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Sampai Tanggal</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                    </div>
                </div>
                <button onClick={handleFilter} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 pb-2.5">
                    Terapkan Rentang Waktu
                </button>
            </div>

            {/* Resume Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500 mb-2">Total Omset (Gross)</p>
                    <p className="text-2xl font-bold font-mono text-slate-800">{formatCurrency(totals.gross_revenue)}</p>
                </div>
                <div className="bg-white border border-rose-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-sm font-semibold text-rose-500 mb-2">Total Diskon Diberikan</p>
                    <p className="text-2xl font-bold font-mono text-rose-600">-{formatCurrency(totals.total_discounts)}</p>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                    <p className="text-sm font-semibold text-slate-500 mb-2 relative z-10">Pendapatan Bersih (Netto)</p>
                    <p className="text-2xl font-bold font-mono text-blue-600 relative z-10">{formatCurrency(totals.net_revenue)}</p>
                    <div className="absolute -right-4 -bottom-4 opacity-10"><TrendingUp className="w-24 h-24 text-blue-500" /></div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 shadow-sm text-white relative overflow-hidden">
                    <p className="text-sm font-semibold text-emerald-100 mb-2 relative z-10">Laba / Profit Margin</p>
                    <p className="text-3xl font-bold font-mono relative z-10">{formatCurrency(totals.total_profit)}</p>
                    <div className="absolute -right-4 -bottom-4 opacity-20 text-white"><TrendingUp className="w-24 h-24" /></div>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden mt-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4 font-bold">Tanggal</th>
                                <th className="px-6 py-4 font-bold text-right">Omset (Gross)</th>
                                <th className="px-6 py-4 font-bold text-right text-rose-500">Diskon</th>
                                <th className="px-6 py-4 font-bold text-right">Netto</th>
                                <th className="px-6 py-4 font-bold text-right text-emerald-600">Laba (Profit)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {salesData?.length > 0 ? salesData.map((data, i) => (
                                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            <span className="font-semibold text-slate-700">{data.sale_date}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-600">{formatCurrency(data.gross_revenue)}</td>
                                    <td className="px-6 py-4 text-right font-mono text-rose-500">-{formatCurrency(data.total_discounts)}</td>
                                    <td className="px-6 py-4 text-right font-mono font-semibold text-slate-800">{formatCurrency(data.net_revenue)}</td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">{formatCurrency(data.total_profit)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">Tidak ada data penjualan pada rentang tanggal tersebut.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
