import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Plus, Eye, Trash2, Search, RotateCcw } from 'lucide-react';
import { formatCurrency } from '@/Utils/format';
import { Pagination, Modal, Button } from '@/Components/UI';
import { useState } from 'react';

export default function PurchaseReturnIndex({ returns, filters }) {
    const [search, setSearch] = useState(filters?.search || '');
    const [deleteTarget, setDeleteTarget] = useState(null);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('purchase-returns.index'), { search }, { preserveState: true });
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('purchase-returns.destroy', deleteTarget), { onSuccess: () => setDeleteTarget(null) });
    };

    return (
        <AppLayout title="Retur Pembelian">
            <Head title="Retur Pembelian" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Retur Pembelian</h2>
                    <p className="text-sm text-slate-500 mt-1">Kelola retur barang ke supplier</p>
                </div>
                <Link href={route('purchase-returns.create')} className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all">
                    <Plus className="w-4 h-4" /> Buat Retur
                </Link>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5">
                <form onSubmit={handleSearch} className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari no. retur atau invoice..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </form>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden mt-6">
                {/* Desktop Table */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4 font-bold">No. Retur</th>
                                <th className="px-6 py-4 font-bold">Invoice Pembelian</th>
                                <th className="px-6 py-4 font-bold">Tanggal</th>
                                <th className="px-6 py-4 font-bold">Total</th>
                                <th className="px-6 py-4 font-bold">User</th>
                                <th className="px-6 py-4 font-bold text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {returns.data?.length > 0 ? returns.data.map(ret => (
                                <tr key={ret.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <RotateCcw className="w-4 h-4 text-orange-500" />
                                            <span className="font-mono font-semibold text-slate-700">{ret.return_number}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-600">{ret.purchase?.invoice_number}</td>
                                    <td className="px-6 py-4 text-slate-500">{ret.return_date}</td>
                                    <td className="px-6 py-4 font-mono font-bold text-slate-800">{formatCurrency(ret.total)}</td>
                                    <td className="px-6 py-4 text-slate-600">{ret.user?.name}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <Link href={route('purchase-returns.show', ret.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                            <button onClick={() => setDeleteTarget(ret.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">Belum ada retur pembelian</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="grid grid-cols-1 gap-4 md:hidden p-4 bg-slate-50/50">
                    {returns.data?.length > 0 ? returns.data.map((ret) => (
                        <div key={ret.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3 relative">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                                        <RotateCcw className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-mono font-bold text-slate-800 text-sm leading-tight">{ret.return_number}</p>
                                        <p className="text-[10px] text-slate-500">{ret.return_date}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase mb-0.5">Total Retur</p>
                                    <p className="font-mono font-bold text-orange-600">{formatCurrency(ret.total)}</p>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 mt-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500">Ref Pembelian:</span>
                                    <span className="font-mono font-semibold text-slate-700 text-sm">{ret.purchase?.invoice_number}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-100">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400">User:</span>
                                    <span className="text-xs font-medium text-slate-700">{ret.user?.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Link href={route('purchase-returns.show', ret.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors bg-slate-50">
                                        <Eye className="w-4 h-4" />
                                    </Link>
                                    <button onClick={() => setDeleteTarget(ret.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors bg-slate-50">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                            <RotateCcw className="w-12 h-12 mx-auto text-slate-300 mb-3 opacity-50" />
                            <p className="text-sm font-medium">Belum ada retur pembelian.</p>
                        </div>
                    )}
                </div>

                {returns.links && <Pagination links={returns.links} />}
            </div>

            <Modal show={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Retur">
                <p className="text-sm text-slate-600">Apakah Anda yakin ingin menghapus retur ini? Stok akan dikembalikan.</p>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</Button>
                    <Button variant="danger" onClick={handleDelete}>Hapus</Button>
                </div>
            </Modal>
        </AppLayout>
    );
}
