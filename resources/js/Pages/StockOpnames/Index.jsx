import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Plus, Search, ClipboardList } from 'lucide-react';
import { Badge, Pagination } from '@/Components/UI';
import { useState } from 'react';

export default function StockOpnameIndex({ adjustments, warehouses, filters }) {
    const [search, setSearch] = useState(filters?.search || '');
    const [warehouseId, setWarehouseId] = useState(filters?.warehouse_id || '');

    const handleFilter = (e) => {
        e?.preventDefault();
        router.get(route('stock-opnames.index'), { search, warehouse_id: warehouseId }, { preserveState: true });
    };

    return (
        <AppLayout title="Penyesuaian Stok (Opname)">
            <Head title="Stock Opname" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Penyesuaian Stok</h2>
                    <p className="text-sm text-slate-500 mt-1">Catat penambahan atau pengurangan stok secara manual</p>
                </div>
                <Link href={route('stock-opnames.create')} className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all">
                    <Plus className="w-4 h-4" /> Buat Penyesuaian
                </Link>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5 flex flex-wrap gap-4">
                <form onSubmit={handleFilter} className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama produk..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                </form>
                <select value={warehouseId} onChange={e => { setWarehouseId(e.target.value); setTimeout(() => handleFilter(), 10); }} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                    <option value="">Semua Gudang</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4 font-bold">Produk</th>
                                <th className="px-6 py-4 font-bold">Gudang</th>
                                <th className="px-6 py-4 font-bold text-center">Tipe</th>
                                <th className="px-6 py-4 font-bold text-right">Jumlah</th>
                                <th className="px-6 py-4 font-bold">Tanggal</th>
                                <th className="px-6 py-4 font-bold">Oleh</th>
                                <th className="px-6 py-4 font-bold">Alasan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {adjustments.data?.length > 0 ? adjustments.data.map(adj => (
                                <tr key={adj.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                                                <ClipboardList className="w-4 h-4" />
                                            </div>
                                            <span className="font-semibold text-slate-700">{adj.product?.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{adj.warehouse?.name}</td>
                                    <td className="px-6 py-4 text-center">
                                        <Badge variant={adj.type === 'addition' ? 'success' : 'danger'}>
                                            {adj.type === 'addition' ? 'Penambahan (+)' : 'Pengurangan (-)'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">{adj.quantity}</td>
                                    <td className="px-6 py-4 text-slate-500">{adj.adjustment_date}</td>
                                    <td className="px-6 py-4 text-slate-600">{adj.user?.name}</td>
                                    <td className="px-6 py-4 text-slate-500 truncate max-w-xs">{adj.reason || '-'}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">Belum ada catatan penyesuaian stok.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {adjustments.links && <Pagination links={adjustments.links} />}
            </div>
        </AppLayout>
    );
}
