import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Eye, Trash2, Search, Calendar, Filter } from 'lucide-react';
import { formatCurrency } from '@/Utils/format';
import { Badge, Pagination, Modal, Button } from '@/Components/UI';
import { useState } from 'react';

export default function SalesIndex({ sales, filters }) {
    const [search, setSearch] = useState(filters?.search || '');
    const [deleteTarget, setDeleteTarget] = useState(null);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('sales.index'), { ...filters, search }, { preserveState: true });
    };

    const handleFilter = (key, value) => {
        router.get(route('sales.index'), { ...filters, [key]: value || undefined }, { preserveState: true });
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('sales.destroy', deleteTarget), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const statusMap = {
        completed: { label: 'Selesai', variant: 'success' },
        pending: { label: 'Pending', variant: 'warning' },
        cancelled: { label: 'Batal', variant: 'danger' },
    };

    const paymentStatusMap = {
        paid: { label: 'Lunas', variant: 'success' },
        partial: { label: 'Sebagian', variant: 'warning' },
        unpaid: { label: 'Belum Bayar', variant: 'danger' },
    };

    return (
        <AppLayout title="Penjualan">
            <Head title="Penjualan" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Riwayat Penjualan</h2>
                    <p className="text-sm text-slate-500 mt-1">Kelola dan pantau semua transaksi penjualan</p>
                </div>
                <Link
                    href={route('pos.index')}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all"
                >
                    Transaksi Baru
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5">
                <div className="flex flex-col md:flex-row gap-3">
                    <form onSubmit={handleSearch} className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cari nomor invoice..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                    </form>
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={filters?.start_date || ''}
                            onChange={e => handleFilter('start_date', e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                        <input
                            type="date"
                            value={filters?.end_date || ''}
                            onChange={e => handleFilter('end_date', e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                    </div>
                    <select
                        value={filters?.payment_status || ''}
                        onChange={e => handleFilter('payment_status', e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                        <option value="">Semua Status</option>
                        <option value="paid">Lunas</option>
                        <option value="partial">Sebagian</option>
                        <option value="unpaid">Belum Bayar</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden">
                {/* Desktop Table */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4 font-bold">Invoice</th>
                                <th className="px-6 py-4 font-bold">Tanggal</th>
                                <th className="px-6 py-4 font-bold">Pelanggan</th>
                                <th className="px-6 py-4 font-bold">Gudang</th>
                                <th className="px-6 py-4 font-bold">Total</th>
                                <th className="px-6 py-4 font-bold">Dibayar</th>
                                <th className="px-6 py-4 font-bold">Pembayaran</th>
                                <th className="px-6 py-4 font-bold">Status</th>
                                <th className="px-6 py-4 font-bold text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {sales.data?.length > 0 ? sales.data.map(sale => (
                                <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4 font-mono font-semibold text-slate-700">{sale.invoice_number}</td>
                                    <td className="px-6 py-4 text-slate-500">{sale.sale_date}</td>
                                    <td className="px-6 py-4 text-slate-700 font-medium">{sale.customer?.name || 'Umum'}</td>
                                    <td className="px-6 py-4 text-slate-500 text-xs">{sale.warehouse?.name || '-'}</td>
                                    <td className="px-6 py-4 font-mono font-bold text-slate-800">{formatCurrency(sale.total)}</td>
                                    <td className="px-6 py-4 font-mono text-slate-600">{formatCurrency(sale.paid)}</td>
                                    <td className="px-6 py-4">
                                        <Badge variant={paymentStatusMap[sale.payment_status]?.variant || 'default'}>
                                            {paymentStatusMap[sale.payment_status]?.label || sale.payment_status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant={statusMap[sale.status]?.variant || 'default'}>
                                            {statusMap[sale.status]?.label || sale.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <Link href={route('sales.show', sale.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                            <button onClick={() => setDeleteTarget(sale.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="9" className="px-6 py-12 text-center text-slate-400">Belum ada data penjualan</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="grid grid-cols-1 gap-4 md:hidden p-4 bg-slate-50/50">
                    {sales.data?.length > 0 ? sales.data.map(sale => (
                        <div key={sale.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-mono font-bold text-slate-900">{sale.invoice_number}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{sale.sale_date}</p>
                                </div>
                                <div className="flex flex-col gap-1 items-end">
                                    <Badge variant={statusMap[sale.status]?.variant || 'default'}>{statusMap[sale.status]?.label || sale.status}</Badge>
                                    <Badge variant={paymentStatusMap[sale.payment_status]?.variant || 'default'}>{paymentStatusMap[sale.payment_status]?.label || sale.payment_status}</Badge>
                                </div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 mt-1">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-semibold text-slate-500">Pelanggan</span>
                                    <span className="text-sm font-semibold text-slate-800">{sale.customer?.name || 'Umum'}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                    <span className="text-xs font-semibold text-slate-500">Total</span>
                                    <span className="text-lg font-mono font-bold text-blue-600">{formatCurrency(sale.total)}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                <Link
                                    href={route('sales.show', sale.id)}
                                    className="flex-1 py-2 text-center text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <Eye className="w-4 h-4" /> Detail
                                </Link>
                                <button
                                    onClick={() => setDeleteTarget(sale.id)}
                                    className="flex-1 py-2 text-center text-sm font-semibold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <Trash2 className="w-4 h-4" /> Hapus
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-8 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                            <p className="text-sm font-medium">Belum ada data penjualan</p>
                        </div>
                    )}
                </div>

                {sales.links && <Pagination links={sales.links} />}
            </div>

            <Modal show={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Penjualan">
                <p className="text-sm text-slate-600">Apakah Anda yakin? Stok produk akan dikembalikan.</p>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</Button>
                    <Button variant="danger" onClick={handleDelete}>Hapus</Button>
                </div>
            </Modal>
        </AppLayout>
    );
}