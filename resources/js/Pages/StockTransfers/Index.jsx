import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Plus, Eye, Trash2, Search, ArrowRightLeft } from 'lucide-react';
import { Badge, Pagination, Modal, Button } from '@/Components/UI';
import { useState } from 'react';

export default function StockTransferIndex({ transfers, filters }) {
    const [search, setSearch] = useState(filters?.search || '');
    const [deleteTarget, setDeleteTarget] = useState(null);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('stock-transfers.index'), { search }, { preserveState: true });
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('stock-transfers.destroy', deleteTarget), { onSuccess: () => setDeleteTarget(null) });
    };

    const statusMap = {
        pending: { label: 'Pending', variant: 'warning' },
        completed: { label: 'Selesai', variant: 'success' },
        cancelled: { label: 'Batal', variant: 'danger' },
    };

    return (
        <AppLayout title="Transfer Barang">
            <Head title="Transfer Barang" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Transfer Barang</h2>
                    <p className="text-sm text-slate-500 mt-1">Kelola perpindahan stok antar gudang</p>
                </div>
                <Link href={route('stock-transfers.create')} className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all">
                    <Plus className="w-4 h-4" /> Buat Transfer
                </Link>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5">
                <form onSubmit={handleSearch} className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari no. transfer..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </form>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden mt-6">
                {/* Desktop Table */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4 font-bold">No. Transfer</th>
                                <th className="px-6 py-4 font-bold">Dari</th>
                                <th className="px-6 py-4 font-bold">Ke</th>
                                <th className="px-6 py-4 font-bold">Tanggal</th>
                                <th className="px-6 py-4 font-bold text-center">Item</th>
                                <th className="px-6 py-4 font-bold">Status</th>
                                <th className="px-6 py-4 font-bold text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {transfers.data?.length > 0 ? transfers.data.map(tr => (
                                <tr key={tr.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                                            <span className="font-mono font-semibold text-slate-700">{tr.transfer_number}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{tr.from_warehouse?.name}</td>
                                    <td className="px-6 py-4 text-slate-600">{tr.to_warehouse?.name}</td>
                                    <td className="px-6 py-4 text-slate-500">{tr.transfer_date}</td>
                                    <td className="px-6 py-4 text-center">
                                        <Badge variant="info">{tr.details_count || 0}</Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant={statusMap[tr.status]?.variant || 'default'}>
                                            {statusMap[tr.status]?.label || tr.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <Link href={route('stock-transfers.show', tr.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                            <button onClick={() => setDeleteTarget(tr.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">Belum ada transfer barang</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="grid grid-cols-1 gap-4 md:hidden p-4 bg-slate-50/50">
                    {transfers.data?.length > 0 ? transfers.data.map((tr) => (
                        <div key={tr.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3 relative">
                            <div className="absolute top-4 right-4">
                                <Badge variant={statusMap[tr.status]?.variant || 'default'}>
                                    {statusMap[tr.status]?.label || tr.status}
                                </Badge>
                            </div>
                            
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                                    <span className="font-mono font-bold text-slate-800">{tr.transfer_number}</span>
                                </div>
                                <p className="text-xs text-slate-500">{tr.transfer_date}</p>
                            </div>
                            
                            <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-100">
                                <div className="flex-1">
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Dari Gudang</p>
                                    <p className="font-bold text-slate-700 text-sm truncate">{tr.from_warehouse?.name}</p>
                                </div>
                                <ArrowRightLeft className="w-4 h-4 text-slate-300 shrink-0 mx-2" />
                                <div className="flex-1 text-right">
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Ke Gudang</p>
                                    <p className="font-bold text-slate-700 text-sm truncate">{tr.to_warehouse?.name}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-100">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">Item Transfer:</span>
                                    <Badge variant="info">{tr.details_count || 0}</Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Link href={route('stock-transfers.show', tr.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors bg-slate-50">
                                        <Eye className="w-4 h-4" />
                                    </Link>
                                    <button onClick={() => setDeleteTarget(tr.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors bg-slate-50">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                            <ArrowRightLeft className="w-12 h-12 mx-auto text-slate-300 mb-3 opacity-50" />
                            <p className="text-sm font-medium">Belum ada transfer barang.</p>
                        </div>
                    )}
                </div>

                {transfers.links && <Pagination links={transfers.links} />}
            </div>

            <Modal show={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Transfer">
                <p className="text-sm text-slate-600">Apakah Anda yakin ingin menghapus transfer ini? Stok akan dikembalikan.</p>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</Button>
                    <Button variant="danger" onClick={handleDelete}>Hapus</Button>
                </div>
            </Modal>
        </AppLayout>
    );
}
