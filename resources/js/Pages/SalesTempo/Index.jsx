import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Search, Eye, DollarSign, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/Utils/format';
import { Badge, Pagination, Modal, Button, Input } from '@/Components/UI';
import { useState } from 'react';

export default function SalesTempoIndex({ sales, filters, summary }) {
    const [search, setSearch] = useState(filters?.search || '');

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('sales-tempo.index'), { ...filters, search }, { preserveState: true });
    };

    const handleFilter = (key, value) => {
        router.get(route('sales-tempo.index'), { ...filters, [key]: value || undefined }, { preserveState: true });
    };

    return (
        <AppLayout title="Penjualan Tempo">
            <Head title="Penjualan Tempo" />

            <div>
                <h2 className="text-2xl font-bold text-slate-900">Penjualan Tempo (Piutang)</h2>
                <p className="text-sm text-slate-500 mt-1">Kelola piutang dan pembayaran cicilan</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-sm text-slate-500">Total Piutang</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(summary?.total_piutang || 0)}</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="text-sm text-slate-500">Jatuh Tempo</p>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{summary?.overdue_count || 0}</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                            <Clock className="w-5 h-5 text-amber-500" />
                        </div>
                        <p className="text-sm text-slate-500">Mendekati Jatuh Tempo</p>
                    </div>
                    <p className="text-2xl font-bold text-amber-600">{summary?.upcoming_count || 0}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5">
                <div className="flex flex-col md:flex-row gap-3">
                    <form onSubmit={handleSearch} className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari invoice atau pelanggan..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    </form>
                    <select value={filters?.status || ''} onChange={e => handleFilter('status', e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                        <option value="">Semua</option>
                        <option value="unpaid">Belum Lunas</option>
                        <option value="overdue">Jatuh Tempo</option>
                        <option value="upcoming">Mendekati</option>
                        <option value="paid">Lunas</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4 font-bold">Invoice</th>
                                <th className="px-6 py-4 font-bold">Pelanggan</th>
                                <th className="px-6 py-4 font-bold">Tanggal</th>
                                <th className="px-6 py-4 font-bold">Jatuh Tempo</th>
                                <th className="px-6 py-4 font-bold">Total</th>
                                <th className="px-6 py-4 font-bold">Dibayar</th>
                                <th className="px-6 py-4 font-bold">Sisa</th>
                                <th className="px-6 py-4 font-bold">Status</th>
                                <th className="px-6 py-4 font-bold text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {sales.data?.length > 0 ? sales.data.map(sale => {
                                const remaining = sale.total - sale.paid;
                                const isOverdue = sale.payment_status !== 'paid' && new Date(sale.due_date) < new Date();
                                return (
                                    <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4 font-mono font-semibold text-slate-700">{sale.invoice_number}</td>
                                        <td className="px-6 py-4 text-slate-700">{sale.customer?.name || 'Umum'}</td>
                                        <td className="px-6 py-4 text-slate-500">{sale.sale_date}</td>
                                        <td className="px-6 py-4">
                                            <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-slate-500'}>{sale.due_date || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-slate-800">{formatCurrency(sale.total)}</td>
                                        <td className="px-6 py-4 font-mono text-slate-600">{formatCurrency(sale.paid)}</td>
                                        <td className="px-6 py-4 font-mono font-bold text-slate-800">{formatCurrency(remaining)}</td>
                                        <td className="px-6 py-4">
                                            {sale.payment_status === 'paid' ? (
                                                <Badge variant="success">Lunas</Badge>
                                            ) : isOverdue ? (
                                                <Badge variant="danger">Jatuh Tempo</Badge>
                                            ) : sale.payment_status === 'partial' ? (
                                                <Badge variant="warning">Sebagian</Badge>
                                            ) : (
                                                <Badge variant="info">Belum Bayar</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link href={route('sales-tempo.show', sale.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex">
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan="9" className="px-6 py-12 text-center text-slate-400">Belum ada penjualan tempo</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {sales.links && <Pagination links={sales.links} />}
            </div>
        </AppLayout>
    );
}
