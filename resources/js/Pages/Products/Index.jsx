import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Plus, Search, Edit2, Trash2, Package, Filter, DownloadCloud, UploadCloud, FileSpreadsheet } from 'lucide-react';
import { formatCurrency } from '@/Utils/format';
import { Badge, Pagination, Modal, Button } from '@/Components/UI';
import { useState } from 'react';

export default function ProductIndex({ products, categories, filters }) {
    const [search, setSearch] = useState(filters.search || '');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showImport, setShowImport] = useState(false);
    
    const { data: importData, setData: setImportData, post: postImport, processing: importProcessing, errors: importErrors, reset: resetImport } = useForm({
        file: null,
    });

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('products.index'), { ...filters, search }, { preserveState: true });
    };

    const handleFilter = (key, value) => {
        router.get(route('products.index'), { ...filters, [key]: value || undefined, search }, { preserveState: true });
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('products.destroy', deleteTarget), {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const handleExport = () => {
        window.location.href = route('products.export');
    };

    const submitImport = (e) => {
        e.preventDefault();
        postImport(route('products.import'), {
            onSuccess: () => {
                setShowImport(false);
                resetImport();
            }
        });
    };

    return (
        <AppLayout title="Produk">
            <Head title="Produk" />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Manajemen Produk</h2>
                    <p className="text-sm text-slate-500 mt-1">Kelola inventori dan data produk</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setShowImport(true)} className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:bg-slate-50 transition-all">
                        <UploadCloud className="w-4 h-4" /> Import Excel
                    </button>
                    <button onClick={handleExport} className="inline-flex items-center gap-2 bg-emerald-600 border border-emerald-500 text-emerald-50 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-all shadow-sm">
                        <FileSpreadsheet className="w-4 h-4" /> Export Excel
                    </button>
                    <Link
                        href={route('products.create')}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all"
                    >
                        <Plus className="w-4 h-4" /> Tambah Produk
                    </Link>
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
                            placeholder="Cari nama, barcode, kode..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                        />
                    </form>
                    <select
                        value={filters.category || ''}
                        onChange={e => handleFilter('category', e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                        <option value="">Semua Kategori</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select
                        value={filters.stock || ''}
                        onChange={e => handleFilter('stock', e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                        <option value="">Semua Stok</option>
                        <option value="low">Stok Rendah</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4 font-bold">Produk</th>
                                <th className="px-6 py-4 font-bold">Barcode</th>
                                <th className="px-6 py-4 font-bold">Kategori</th>
                                <th className="px-6 py-4 font-bold">Harga Beli</th>
                                <th className="px-6 py-4 font-bold">Harga Jual</th>
                                <th className="px-6 py-4 font-bold">Stok</th>
                                <th className="px-6 py-4 font-bold">Status</th>
                                <th className="px-6 py-4 font-bold text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {products.data.length > 0 ? products.data.map(product => {
                                const totalStock = product.stocks?.reduce((s, st) => s + st.quantity, 0) || 0;
                                return (
                                    <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                                                    {product.image ? (
                                                        <img src={`/storage/${product.image}`} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Package className="w-5 h-5 text-slate-300" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{product.name}</p>
                                                    <p className="text-xs text-slate-400">{product.code || '-'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">{product.barcode || '-'}</td>
                                        <td className="px-6 py-4 text-slate-500">{product.category?.name || '-'}</td>
                                        <td className="px-6 py-4 text-slate-700 font-mono">{formatCurrency(product.cost_price)}</td>
                                        <td className="px-6 py-4 text-slate-700 font-mono font-semibold">{formatCurrency(product.selling_price)}</td>
                                        <td className="px-6 py-4">
                                            <div className="group relative">
                                                <span className={`text-xs font-semibold px-2 py-1 rounded-md cursor-default ${
                                                    totalStock <= 0 ? 'bg-rose-50 text-rose-600' :
                                                    totalStock <= (product.stock_minimum || 5) ? 'bg-amber-50 text-amber-600' :
                                                    'bg-emerald-50 text-emerald-600'
                                                }`}>
                                                    {totalStock} {product.unit}
                                                </span>
                                                {product.stocks?.length > 0 && (
                                                    <div className="hidden group-hover:block absolute left-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-lg p-3 min-w-[200px]">
                                                        <p className="text-xs font-bold text-slate-700 mb-2">Stok per Gudang:</p>
                                                        {product.stocks.map(s => (
                                                            <div key={s.id} className="flex justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                                                                <span className="text-slate-600">{s.warehouse?.name || 'Unknown'}</span>
                                                                <span className={`font-bold ${s.quantity <= 0 ? 'text-rose-500' : 'text-slate-800'}`}>{s.quantity}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={product.is_active ? 'success' : 'danger'}>
                                                {product.is_active ? 'Aktif' : 'Nonaktif'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link
                                                    href={route('products.edit', product.id)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => setDeleteTarget(product.id)}
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-400">Tidak ada produk ditemukan</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {products.links && <Pagination links={products.links} />}
            </div>

            {/* Delete Confirmation */}
            <Modal show={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Produk">
                <p className="text-sm text-slate-600">Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat dikembalikan.</p>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</Button>
                    <Button variant="danger" onClick={handleDelete}>Hapus</Button>
                </div>
            </Modal>

            {/* Import Excel Modal */}
            <Modal show={showImport} onClose={() => setShowImport(false)} title="Import Data Excel" maxWidth="md">
                <form onSubmit={submitImport} className="space-y-4">
                    <p className="text-sm text-slate-600">Pastikan Anda menggunakan format Excel yang sudah kami sediakan agar data stok dan detail barang terbaca sempurna.</p>
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-start gap-3">
                        <FileSpreadsheet className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-slate-800">Unduh Format Template</p>
                            <a href={route('products.template')} className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline">Klik disini untuk mengunduh template Excel (.xlsx)</a>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Upload File Excel Anda</label>
                        <input type="file" accept=".xlsx,.xls,.cvs" onChange={e => setImportData('file', e.target.files[0])} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 focus:outline-none" />
                        {importErrors.file && <p className="text-rose-500 text-xs mt-1">{importErrors.file}</p>}
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="secondary" onClick={() => setShowImport(false)}>Batal</Button>
                        <Button type="submit" disabled={importProcessing || !importData.file} className="bg-emerald-600 hover:bg-emerald-700 text-white">Import Data</Button>
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}