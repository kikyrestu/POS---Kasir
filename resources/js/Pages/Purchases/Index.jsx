import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Plus, Eye, Trash2, Search } from 'lucide-react';
import { formatCurrency } from '@/Utils/format';
import { Badge, Pagination, Modal, Button } from '@/Components/UI';
import { useState } from 'react';

export default function PurchaseIndex({ purchases, filters }) {
    const [search, setSearch] = useState(filters?.search || '');
    const [deleteTarget, setDeleteTarget] = useState(null);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('purchases.index'), { ...filters, search }, { preserveState: true });
    };

    const handleFilter = (key, value) => {
        router.get(route('purchases.index'), { ...filters, [key]: value || undefined }, { preserveState: true });
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('purchases.destroy', deleteTarget), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const statusMap = {
        received: { label: 'Diterima', variant: 'success' },
        ordered: { label: 'Dipesan', variant: 'warning' },
        cancelled: { label: 'Batal', variant: 'danger' },
    };

    return (
        <AppLayout title="Pembelian">
            <Head title="Pembelian" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Pembelian</h2>
                    <p className="text-sm text-slate-500 mt-1">Kelola data purchase order</p>
                </div>
                <Link
                    href={route('purchases.create')}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all"
                >
                    <Plus className="w-4 h-4" /> Buat PO Baru
                </Link>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5">
                <div className="flex flex-col md:flex-row gap-3">
                    <form onSubmit={handleSearch} className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari invoice pembelian..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    </form>
                    <select value={filters?.status || ''} onChange={e => handleFilter('status', e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                        <option value="">Semua Status</option>
                        <option value="ordered">Dipesan</option>
                        <option value="received">Diterima</option>
                        <option value="cancelled">Batal</option>
                    </select>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden">
                {/* Desktop Table */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4 font-bold">Invoice</th>
                                <th className="px-6 py-4 font-bold">Tanggal</th>
                                <th className="px-6 py-4 font-bold">Supplier</th>
                                <th className="px-6 py-4 font-bold">Total</th>
                                <th className="px-6 py-4 font-bold">Pembayaran</th>
                                <th className="px-6 py-4 font-bold">Status</th>
                                <th className="px-6 py-4 font-bold text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {purchases.data?.length > 0 ? purchases.data.map(purchase => (
                                <tr key={purchase.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4 font-mono font-semibold text-slate-700">{purchase.invoice_number}</td>
                                    <td className="px-6 py-4 text-slate-500">{purchase.purchase_date}</td>
                                    <td className="px-6 py-4 text-slate-700 font-medium">{purchase.supplier?.name || '-'}</td>
                                    <td className="px-6 py-4 font-mono font-bold text-slate-800">{formatCurrency(purchase.total)}</td>
                                    <td className="px-6 py-4">
                                        <Badge variant={purchase.payment_status === 'paid' ? 'success' : purchase.payment_status === 'partial' ? 'warning' : 'danger'}>
                                            {purchase.payment_status === 'paid' ? 'Lunas' : purchase.payment_status === 'partial' ? 'Sebagian' : 'Belum Bayar'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant={statusMap[purchase.status]?.variant}>{statusMap[purchase.status]?.label}</Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <Link href={route('purchases.show', purchase.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                            <button onClick={() => setDeleteTarget(purchase.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">Belum ada data pembelian</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="grid grid-cols-1 gap-4 md:hidden p-4 bg-slate-50/50">
                    {purchases.data?.length > 0 ? purchases.data.map(purchase => (
                        <div key={purchase.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-mono font-bold text-slate-900">{purchase.invoice_number}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{purchase.purchase_date}</p>
                                </div>
                                <div className="flex flex-col gap-1 items-end">
                                    <Badge variant={statusMap[purchase.status]?.variant || 'default'}>{statusMap[purchase.status]?.label || purchase.status}</Badge>
                                    <Badge variant={purchase.payment_status === 'paid' ? 'success' : purchase.payment_status === 'partial' ? 'warning' : 'danger'}>
                                        {purchase.payment_status === 'paid' ? 'Lunas' : purchase.payment_status === 'partial' ? 'Sebagian' : 'Belum Bayar'}
                                    </Badge>
                                </div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 mt-1">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-semibold text-slate-500">Supplier</span>
                                    <span className="text-sm font-semibold text-slate-800">{purchase.supplier?.name || '-'}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                    <span className="text-xs font-semibold text-slate-500">Total</span>
                                    <span className="text-lg font-mono font-bold text-blue-600">{formatCurrency(purchase.total)}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                <Link
                                    href={route('purchases.show', purchase.id)}
                                    className="flex-1 py-2 text-center text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <Eye className="w-4 h-4" /> Detail
                                </Link>
                                <button
                                    onClick={() => setDeleteTarget(purchase.id)}
                                    className="flex-1 py-2 text-center text-sm font-semibold text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <Trash2 className="w-4 h-4" /> Hapus
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-8 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                            <p className="text-sm font-medium">Belum ada data pembelian</p>
                        </div>
                    )}
                </div>

                {purchases.links && <Pagination links={purchases.links} />}
            </div>

            <Modal show={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Pembelian">
                <p className="text-sm text-slate-600">Apakah Anda yakin ingin menghapus pembelian ini?</p>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</Button>
                    <Button variant="danger" onClick={handleDelete}>Hapus</Button>
                </div>
            </Modal>
        </AppLayout>
    );
}