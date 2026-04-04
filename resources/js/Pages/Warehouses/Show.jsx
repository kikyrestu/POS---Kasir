import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { ArrowLeft, Search, Package, Warehouse, MapPin, Phone } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/Utils/format';
import { Badge, Pagination } from '@/Components/UI';
import { useState } from 'react';

export default function WarehouseShow({ warehouse, stocks, totalProducts, totalQty, filters }) {
    const [search, setSearch] = useState(filters?.search || '');

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('warehouses.show', warehouse.id), { ...filters, search }, { preserveState: true });
    };

    const handleFilter = (key, value) => {
        router.get(route('warehouses.show', warehouse.id), { ...filters, [key]: value || undefined, search }, { preserveState: true });
    };

    return (
        <AppLayout title={`Gudang: ${warehouse.name}`}>
            <Head title={`Gudang - ${warehouse.name}`} />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link href={route('warehouses.index')} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold text-slate-900">{warehouse.name}</h2>
                            {warehouse.is_default && <Badge variant="success">Default</Badge>}
                            {!warehouse.is_active && <Badge variant="danger">Nonaktif</Badge>}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                            {warehouse.address && (
                                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {warehouse.address}</span>
                            )}
                            {warehouse.phone && (
                                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {warehouse.phone}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Package className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{formatNumber(totalProducts)}</p>
                            <p className="text-xs text-slate-500 font-medium">Jenis Produk</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <Warehouse className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{formatNumber(totalQty)}</p>
                            <p className="text-xs text-slate-500 font-medium">Total Stok</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                            <Package className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">
                                {stocks?.data?.filter(s => s.quantity <= (s.product?.stock_minimum || 0) && s.quantity > 0).length || 0}
                            </p>
                            <p className="text-xs text-slate-500 font-medium">Stok Rendah</p>
                        </div>
                    </div>
                </div>
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
                            placeholder="Cari produk..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                    </form>
                    <select
                        value={filters?.stock_filter || ''}
                        onChange={e => handleFilter('stock_filter', e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                        <option value="">Semua Stok</option>
                        <option value="low">Stok Rendah</option>
                        <option value="empty">Stok Habis</option>
                    </select>
                </div>
            </div>

            {/* Product Stock Table */}
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4 font-bold">No</th>
                                <th className="px-6 py-4 font-bold">Produk</th>
                                <th className="px-6 py-4 font-bold">Barcode</th>
                                <th className="px-6 py-4 font-bold">Kategori</th>
                                <th className="px-6 py-4 font-bold">Harga Beli</th>
                                <th className="px-6 py-4 font-bold">Harga Jual</th>
                                <th className="px-6 py-4 font-bold text-right">Stok Min</th>
                                <th className="px-6 py-4 font-bold text-right">Stok</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {stocks.data?.length > 0 ? stocks.data.map((stock, idx) => {
                                const p = stock.product;
                                const isLow = stock.quantity <= (p?.stock_minimum || 0) && stock.quantity > 0;
                                const isEmpty = stock.quantity === 0;
                                return (
                                    <tr key={stock.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4 text-slate-400">
                                            {(stocks.current_page - 1) * stocks.per_page + idx + 1}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-slate-900">{p?.name}</p>
                                            <p className="text-xs text-slate-400">{p?.code || '-'}</p>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">{p?.barcode || '-'}</td>
                                        <td className="px-6 py-4 text-slate-500">{p?.category?.name || '-'}</td>
                                        <td className="px-6 py-4 text-slate-700 font-mono">{formatCurrency(p?.cost_price)}</td>
                                        <td className="px-6 py-4 text-slate-700 font-mono">{formatCurrency(p?.selling_price)}</td>
                                        <td className="px-6 py-4 text-right text-slate-500">{p?.stock_minimum || 0}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-bold text-sm ${
                                                isEmpty ? 'text-rose-600' :
                                                isLow ? 'text-amber-600' :
                                                'text-emerald-600'
                                            }`}>
                                                {stock.quantity} {p?.unit || 'pcs'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                                        Tidak ada produk di gudang ini
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {stocks.links && <Pagination links={stocks.links} />}
            </div>
        </AppLayout>
    );
}
