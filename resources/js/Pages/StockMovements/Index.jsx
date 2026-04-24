import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Search, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Badge, Pagination } from '@/Components/UI';
import { useState } from 'react';

export default function StockMovementIndex({ movements, warehouses, products, filters }) {
    const [warehouseId, setWarehouseId] = useState(filters?.warehouse_id || '');
    const [productId, setProductId] = useState(filters?.product_id || '');
    const [type, setType] = useState(filters?.type || '');
    const [dateFrom, setDateFrom] = useState(filters?.date_from || '');
    const [dateTo, setDateTo] = useState(filters?.date_to || '');

    const handleFilter = (e) => {
        e?.preventDefault();
        router.get(route('stock-movements.index'), {
            warehouse_id: warehouseId,
            product_id: productId,
            type: type,
            date_from: dateFrom,
            date_to: dateTo,
        }, { preserveState: true });
    };

    const handleClear = () => {
        setWarehouseId(''); setProductId(''); setType(''); setDateFrom(''); setDateTo('');
        router.get(route('stock-movements.index'));
    };

    return (
        <AppLayout title="Riwayat Mutasi Stok (Ledger)">
            <Head title="Riwayat Mutasi Stok" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Riwayat Mutasi Stok</h2>
                    <p className="text-sm text-slate-500 mt-1">Buku besar riwayat pergerakan (masuk/keluar) barang per gudang</p>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5 flex flex-wrap gap-4">
                <select value={warehouseId} onChange={e => { setWarehouseId(e.target.value); setTimeout(() => handleFilter(), 10); }} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                    <option value="">Semua Gudang</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                
                <select value={productId} onChange={e => { setProductId(e.target.value); setTimeout(() => handleFilter(), 10); }} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 max-w-xs">
                    <option value="">Semua Produk</option>
                    {products.map(p => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
                </select>

                <select value={type} onChange={e => { setType(e.target.value); setTimeout(() => handleFilter(), 10); }} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-36">
                    <option value="">Semua Tipe</option>
                    <option value="in">Stok Masuk</option>
                    <option value="out">Stok Keluar</option>
                </select>

                <div className="flex items-center gap-2">
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
                    <span className="text-slate-400">-</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={handleFilter} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700">Filter</button>
                    <button onClick={handleClear} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-200">Reset</button>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4 font-bold">Waktu</th>
                                <th className="px-6 py-4 font-bold">Deskripsi</th>
                                <th className="px-6 py-4 font-bold">Gudang</th>
                                <th className="px-6 py-4 font-bold text-center">Tipe</th>
                                <th className="px-6 py-4 font-bold text-right text-slate-400">Saldo Awal</th>
                                <th className="px-6 py-4 font-bold text-right border-x border-slate-100">Mutasi</th>
                                <th className="px-6 py-4 font-bold text-right text-blue-600">Saldo Akhir</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {movements.data?.length > 0 ? movements.data.map(mov => (
                                <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-3">
                                        <p className="font-semibold text-slate-800 text-xs">{new Date(mov.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                        <p className="text-[10px] text-slate-400">Ref: {mov.reference_type}</p>
                                    </td>
                                    <td className="px-6 py-3">
                                        <p className="font-bold text-slate-700">{mov.product?.name}</p>
                                        <p className="text-xs text-slate-500">{mov.description || '-'}</p>
                                    </td>
                                    <td className="px-6 py-3 text-slate-600 text-xs">{mov.warehouse?.name}</td>
                                    <td className="px-6 py-3 text-center">
                                        {mov.type === 'in' ? (
                                            <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded">
                                                <ArrowDownLeft className="w-3 h-3" /> Masuk
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-rose-500 text-xs font-bold bg-rose-50 px-2 py-1 rounded">
                                                <ArrowUpRight className="w-3 h-3" /> Keluar
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-3 text-right font-mono text-slate-400">{mov.balance_before}</td>
                                    <td className="px-6 py-3 text-right font-mono border-x border-slate-50 font-bold text-slate-700">
                                        {mov.type === 'in' ? '+' : '-'}{mov.quantity}
                                    </td>
                                    <td className="px-6 py-3 text-right font-mono font-bold text-blue-600">{mov.balance_after}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">Belum ada histori pergerakan stok.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {movements.links && <Pagination links={movements.links} />}
            </div>
        </AppLayout>
    );
}
